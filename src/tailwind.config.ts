import type { Config } from "tailwindcss";
import * as colors from "tailwindcss/colors";
import * as defaultTheme from "tailwindcss/defaultTheme";
import { tailwindcssPaletteGenerator as palette } from '@bobthered/tailwindcss-palette-generator'
import plugin from "tailwindcss/plugin"

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        radarr: palette('#ffc230').primary!,
        sonarr: palette('#35c5f4').primary!,
        primary: palette('#5c6ac4').primary!,
        upload: colors.blue[400],
        download: colors.green[400],
        buffer: colors.purple[300],
        transfer: colors.teal[400],
        ratio: colors.amber[400],
        error: colors.red[500],
        status: {
          downloading: colors.lime[800],
          stalled: '#3f3714',
          completing: colors.purple[900],
          downloaded: colors.sky[950]
        }
      },
      fontFamily: {
        title: ['Impact', ...defaultTheme.fontFamily.sans],
        body: ['Roboto', ...defaultTheme.fontFamily.sans]
      }
    },
  },
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant("hover", [
        "@media (hover: hover) { &:hover }",
        "@media (hover: none) { &:active }",
      ])
    }),
  ],
} satisfies Config;
