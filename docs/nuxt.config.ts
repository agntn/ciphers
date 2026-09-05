import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  extends: ["docus"],
  /** The repo root is its own pnpm workspace; Nuxt must not treat it as this site's. */
  workspaceDir: fileURLToPath(new URL("./", import.meta.url)),
  devtools: { enabled: false },
  telemetry: false,
  site: {
    url: "https://ciphers.agntn.dev",
    name: "@agntn/ciphers",
  },
  llms: {
    domain: "https://ciphers.agntn.dev",
  },
  icon: {
    clientBundle: {
      icons: [
        "lucide:external-link",
        "lucide:x",
        "simple-icons:github",
        "simple-icons:npm",
        "solar:add-circle-linear",
        "solar:alt-arrow-left-linear",
        "solar:alt-arrow-right-linear",
        "solar:arrow-right-linear",
        "solar:arrow-right-up-linear",
        "solar:book-2-linear",
        "solar:bot-linear",
        "solar:calculator-linear",
        "solar:chart-linear",
        "solar:unread-linear",
        "solar:code-2-linear",
        "solar:code-square-linear",
        "solar:copy-linear",
        "solar:flip-horizontal-linear",
        "solar:hashtag-linear",
        "solar:key-linear",
        "solar:library-linear",
        "solar:lock-keyhole-linear",
        "solar:radio-linear",
        "solar:restart-linear",
        "solar:shuffle-linear",
        "solar:transfer-horizontal-linear",
        "solar:tuning-2-linear",
        "solar:vinyl-record-linear",
        "solar:widget-4-linear",
        "vscode-icons:file-type-js",
        "vscode-icons:file-type-json",
        "vscode-icons:file-type-shell",
        "vscode-icons:file-type-typescript",
      ],
    },
  },
  colorMode: {
    preference: "dark",
  },
  app: {
    head: {
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/site.webmanifest" },
      ],
      meta: [
        { name: "theme-color", media: "(prefers-color-scheme: dark)", content: "#0b0d10" },
        { name: "theme-color", media: "(prefers-color-scheme: light)", content: "#eef1f4" },
        { name: "apple-mobile-web-app-title", content: "ciphers" },
      ],
    },
  },
  /** Docus ships an MCP endpoint that wants the Cloudflare Agents SDK on Workers. Not needed. */
  mcp: {
    enabled: false,
  },
  nitro: {
    preset: "cloudflare_module",
    compatibilityDate: "2026-09-03",
    prerender: {
      crawlLinks: true,
      routes: ["/", "/playground", "/sitemap.xml", "/robots.txt", "/llms.txt", "/llms-full.txt"],
    },
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },
  compatibilityDate: "2026-09-03",
  /** Fonts live in public/fonts and app/assets/fonts.css, where nuxt-og-image reads them from. */
  css: ["~/assets/fonts.css"],
  fonts: {
    families: [
      { name: "Space Grotesk", provider: "local", weights: [400, 500, 600] },
      { name: "Space Mono", provider: "local", weights: [400, 700] },
    ],
  },
  content: {
    database: {
      type: "d1",
      bindingName: "DB",
    },
    build: {
      markdown: {
        highlight: {
          theme: {
            default: "github-light",
            light: "github-light",
            dark: "poimandres",
          },
        },
      },
    },
  },
});
