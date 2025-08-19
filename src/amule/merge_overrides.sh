#!/usr/bin/env bash
# Apply overrides from amule.overrides.conf to amule.conf, respecting INI sections.
# - Replace the FIRST occurrence of a key IN PLACE (preserve original order).
# - Remove only subsequent duplicates of that key within the same section.
# - If key doesn't exist, append it at the END of the section (minimal disruption).
# - Create a timestamped backup ONLY when changes are written (keep latest 4).


set -euo pipefail

# -------------------------
# Configuration
# -------------------------
BASE_DIR="/config/amule"
TARGET_FILE="$BASE_DIR/amule.conf"
OVERRIDES_FILE="$BASE_DIR/amule.overrides.conf"
MAX_BACKUPS=1   # keep at most this many backups when a new one is created

# -------------------------
# Helpers
# -------------------------

# Escape text for basic regex (section/key names)
escape_regex() {
  printf '%s' "$1" | sed -e 's/[][\.^$*+?(){}|/]/\\&/g'
}

# Escape text for sed replacement (RHS of s///)
escape_sed_replacement() {
  # Escape backslashes first, then / and &
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/[\/&]/\\&/g'
}

# Escape text to be inserted with sed 'a\' (avoid interpreting backslashes)
escape_sed_insert_text() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g'
}

# Trim leading/trailing whitespace
trim() {
  printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

# Ensure a section exists in file; if not, append it.
ensure_section_exists() {
  local file="$1" section="$2"
  local esc_section
  esc_section="$(escape_regex "$section")"
  if ! grep -q "^\[$esc_section\]" "$file"; then
    printf '\n[%s]\n' "$section" >> "$file"
    REPORT+=("ADDED section [$section]")
  fi
}

# Return section bounds (start_line_of_header, end_line_of_section)
# end_line_of_section is the last line before the next [Section] or EOF.
section_bounds() {
  local file="$1" section="$2"
  local esc_section start_line rel_next end_line total
  esc_section="$(escape_regex "$section")"
  start_line="$(grep -n "^\[$esc_section\]" "$file" | head -n1 | cut -d: -f1 || true)"
  if [ -z "$start_line" ]; then
    printf ''  # caller must handle missing
    return 0
  fi
  # Find next section header after the current header
  rel_next="$(tail -n +"$((start_line+1))" "$file" | grep -n "^\[" | head -n1 | cut -d: -f1 || true)"
  if [ -z "$rel_next" ]; then
    total="$(wc -l < "$file")"
    end_line="$total"
  else
    # Absolute next header line is start_line + rel_next
    end_line="$((start_line + rel_next - 1))"
  fi
  printf '%s %s' "$start_line" "$end_line"
}

# Get the value (string after '=') from a full "key=value" line
extract_value_from_line() {
  local key="$1" line="$2"
  local esc_key
  esc_key="$(escape_regex "$key")"
  printf '%s\n' "$line" | sed -E "s/^[[:space:]]*$esc_key[[:space:]]*=\s*(.*)\s*/\1/"
}

# Rotate backups (keep only the most recent $MAX_BACKUPS)
rotate_backups() {
  local base="$1"
  # shellcheck disable=SC2012
  if ls -1t "$base".bak-* >/dev/null 2>&1; then
    ls -1t "$base".bak-* | tail -n +$((MAX_BACKUPS+1)) | xargs -r rm -f --
  fi
}

# -------------------------
# Preconditions
# -------------------------
if [ ! -f "$TARGET_FILE" ]; then
  echo "ERROR: Target file not found: $TARGET_FILE" >&2
  exit 1
fi
if [ ! -f "$OVERRIDES_FILE" ]; then
  echo "ERROR: Overrides file not found: $OVERRIDES_FILE" >&2
  exit 1
fi

# -------------------------
# Prepare temp work copy
# -------------------------
TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT
cp -f -- "$TARGET_FILE" "$TMP_FILE"

declare -a REPORT
current_section=""
changed=false

# -------------------------
# Apply overrides (replace in place, dedupe after first)
# -------------------------
while IFS= read -r raw_line || [ -n "$raw_line" ]; do
  line="${raw_line//$'\r'/}"  # strip CR if present

  # Skip empties and ; or # comments
  case "$line" in
    ''|\;*|\#*) continue ;;
  esac

  # Section header?
  if printf '%s\n' "$line" | grep -Eq '^\[.*\]$'; then
    current_section="${line#[}"
    current_section="${current_section%]}"
    current_section="$(trim "$current_section")"
    ensure_section_exists "$TMP_FILE" "$current_section"
    continue
  fi

  # Key=Value within a section
  if [ -n "$current_section" ] && printf '%s' "$line" | grep -q '='; then
    key="$(trim "${line%%=*}")"
    value="$(trim "${line#*=}")"

    ensure_section_exists "$TMP_FILE" "$current_section"

    # Obtain section bounds
    bounds="$(section_bounds "$TMP_FILE" "$current_section")"
    if [ -z "$bounds" ]; then
      # Section was just added; recompute
      bounds="$(section_bounds "$TMP_FILE" "$current_section")"
    fi
    start_hdr="$(printf '%s' "$bounds" | cut -d' ' -f1)"
    end_line="$(printf '%s' "$bounds" | cut -d' ' -f2)"
    content_start="$((start_hdr + 1))"

    esc_key="$(escape_regex "$key")"
    esc_value_repl="$(escape_sed_replacement "$value")"

    # Find all matches for key within the section (relative to content_start)
    rel_lines_str="$(
      sed -n "${content_start},${end_line}p" "$TMP_FILE" \
        | grep -n -E "^[[:space:]]*$esc_key[[:space:]]*=" \
        | cut -d: -f1 | tr '\n' ' '
    )"
    # Convert to bash array of relative line numbers
    read -r -a rel_lines <<< "$rel_lines_str"
    count="${#rel_lines[@]}"

    if [ "$count" -gt 0 ]; then
      # Replace FIRST occurrence in place
      first_rel="${rel_lines[0]}"
      first_abs="$((content_start + first_rel - 1))"
      old_line="$(sed -n "${first_abs}p" "$TMP_FILE")"
      old_value="$(extract_value_from_line "$key" "$old_line")"

      if [ "$old_value" != "$value" ]; then
        sed -i "${first_abs}s/^\([[:space:]]*$esc_key[[:space:]]*=\).*/\1$esc_value_repl/" "$TMP_FILE"
        REPORT+=("UPDATED   [$current_section] $key: '$old_value' -> '$value'")
        changed=true
      else
        REPORT+=("UNCHANGED [$current_section] $key: already '$value'")
      fi

      # Remove ONLY the subsequent duplicates (from bottom to top)
      if [ "$count" -gt 1 ]; then
        # Loop from last index down to 1 (skip index 0)
        for (( idx=count-1; idx>=1; idx-- )); do
          rel="${rel_lines[$idx]}"
          abs="$((content_start + rel - 1))"
          sed -i "${abs}d" "$TMP_FILE"
          changed=true
        done
        REPORT+=("DEDUPED   [$current_section] $key: removed $((count-1)) duplicate(s)")
      fi
    else
      # No existing key: append at END of section (preserve existing order)
      ins_key="$(escape_sed_insert_text "$key")"
      ins_val="$(escape_sed_insert_text "$value")"
      sed -i "${end_line}a\\
${ins_key}=${ins_val}
" "$TMP_FILE"
      REPORT+=("ADDED     [$current_section] $key: '$value'")
      changed=true
    fi
  fi
done < "$OVERRIDES_FILE"

# -------------------------
# Commit only if changed (and backup only then)
# -------------------------
if ! cmp -s "$TMP_FILE" "$TARGET_FILE"; then
  # (We also track $changed, but cmp is the final arbiter.)
  timestamp="$(date +%Y%m%d-%H%M%S)"
  backup_file="$TARGET_FILE.bak-$timestamp"
  cp -f -- "$TARGET_FILE" "$backup_file"
  rotate_backups "$TARGET_FILE"
  mv -f -- "$TMP_FILE" "$TARGET_FILE"
  echo "Applied overrides from: $OVERRIDES_FILE"
  echo "Backup created: $backup_file (rotation: keeping latest $MAX_BACKUPS)"
else
  echo "No changes were necessary; no backup created."
fi

echo
echo "Summary of actions:"
if [ "${#REPORT[@]}" -eq 0 ]; then
  echo "  (nothing to report)"
else
  for line in "${REPORT[@]}"; do
    echo "  - $line"
  done
fi
