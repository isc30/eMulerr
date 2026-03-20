# Security Policy

## Supported Versions

Security fixes are applied to the latest release only. Please ensure you are running the most recent Docker image before reporting a vulnerability.

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |
| older   | ❌        |

## Reporting a Vulnerability

If you discover a security vulnerability in eMulerr, **please do not open a public GitHub issue**.

Instead, report it privately using one of these channels:

- **GitHub Private Vulnerability Reporting**: Use the [Security tab → "Report a vulnerability"](../../security/advisories/new) on this repository.
- **Email**: If you prefer, contact the maintainer directly via the email listed on their GitHub profile.

Please include as much detail as possible:

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Any relevant logs, screenshots, or proof-of-concept code
- The version or Docker image tag you are using

## What to Expect

- Acknowledgement of your report within **72 hours**
- A fix or mitigation plan communicated within **14 days** for critical issues
- Credit in the release notes (unless you prefer to remain anonymous)

## Scope

eMulerr is typically deployed on a **local network / home server** and is not hardened for direct internet exposure. The following are considered in-scope:

- Authentication bypass
- Remote code execution
- Privilege escalation inside the container
- Sensitive data leakage via the API

The following are considered **out of scope**:

- Issues only exploitable by someone with full access to the host machine
- Vulnerabilities in upstream dependencies (aMule, Node.js, Linux) that are not specific to eMulerr
- Denial-of-service attacks on a locally-hosted instance

## Security Hardening Notes

If you expose eMulerr outside your LAN, you should:

1. Set the `PASSWORD` environment variable to enable HTTP Basic Auth and API key protection.
2. Place eMulerr behind a reverse proxy (NGINX, Traefik, Caddy) with TLS termination.
3. Restrict access by IP allowlist in your reverse proxy where possible.
4. Do **not** expose the aMule WebUI port (`4711`) publicly.
