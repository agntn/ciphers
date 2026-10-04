import { resolve } from "node:path";
import { ciphersTheme } from "./shiki-theme";

/** Bundled from the checkout's sources: a deploy needs neither dist/ nor the root node_modules. */
const librarySource = resolve(import.meta.dirname, "../src");

export default defineNuxtConfig({
  extends: ["docus"],
  /** The repo root is its own pnpm workspace; Nuxt must not treat it as this site's. */
  workspaceDir: import.meta.dirname,
  alias: {
    "@agntn/ciphers": resolve(librarySource, "index.ts"),
    /** The text the agent tools answer with; the module imports only the library, so the page runs it too. */
    "#tool-operations": resolve(librarySource, "tool-operations.ts"),
    /** `toolListings` and `callTool` for the tools under server/mcp/tools/. Worker only. */
    "#mcp": resolve(librarySource, "mcp.ts"),
    /** The tool layer under src/tools.ts and src/mcp.ts, from the copy this directory installs. */
    "@agntn/tools/mcp": resolve(import.meta.dirname, "node_modules/@agntn/tools/dist/mcp.mjs"),
    "@agntn/tools": resolve(import.meta.dirname, "node_modules/@agntn/tools/dist/index.mjs"),
    /** The checksums @agntn/compressions imports. The package alias below would swallow them. */
    "@agntn/hashes/adler32": resolve(
      import.meta.dirname,
      "node_modules/@agntn/hashes/dist/adler32.mjs",
    ),
    "@agntn/hashes/crc": resolve(import.meta.dirname, "node_modules/@agntn/hashes/dist/crc.mjs"),
    /** MARS and aes-passphrase hash with it. The file, since /mcp leaves the import to the worker. */
    "@agntn/hashes": resolve(import.meta.dirname, "node_modules/@agntn/hashes/dist/index.mjs"),
    /** An alias to the directory would skip its `exports`, so each subpath gets its file. */
    "@agntn/encodings/hex": resolve(
      import.meta.dirname,
      "node_modules/@agntn/encodings/dist/hex.mjs",
    ),
    "@agntn/encodings/base64": resolve(
      import.meta.dirname,
      "node_modules/@agntn/encodings/dist/base64.mjs",
    ),
    /** OpenPGP's ZIP, ZLIB and BZip2, one file per subpath like the encodings. */
    "@agntn/compressions/deflate": resolve(
      import.meta.dirname,
      "node_modules/@agntn/compressions/dist/deflate.mjs",
    ),
    "@agntn/compressions/bzip2": resolve(
      import.meta.dirname,
      "node_modules/@agntn/compressions/dist/bzip2.mjs",
    ),
  },
  vite: {
    build: { target: "es2024" },
    server: {
      /** Dev serves the library from outside the workspace, which Vite refuses without this. */
      fs: { allow: [librarySource] },
    },
  },
  devtools: { enabled: false },
  telemetry: false,
  site: {
    url: "https://ciphers.agntn.dev",
    name: "@agntn/ciphers",
  },
  llms: {
    domain: "https://ciphers.agntn.dev",
    title: "@agntn/ciphers",
    description:
      "Classical and block ciphers behind one local API: encode, decode, Caesar brute force and letter frequencies, as a library, a CLI, an MCP server and Pi and OMP extensions.",
    sections: [
      {
        title: "MCP Server",
        description: "The tools of `ciphers mcp` and the page tools of this site over Streamable HTTP.",
        links: [
          {
            title: "MCP endpoint",
            href: "https://ciphers.agntn.dev/mcp",
            description:
              "Add it to any MCP client as an HTTP server, for example `claude mcp add --transport http ciphers https://ciphers.agntn.dev/mcp`.",
          },
        ],
      },
      {
        title: "Playground",
        description: "Encode, decode, brute force and count letters with any cipher, in the browser.",
        links: [
          {
            title: "Playground",
            href: "https://ciphers.agntn.dev/playground",
            description: "The library running in the page: encode, decode, brute force, frequency and info.",
          },
        ],
      },
    ],
  },
  /** Docus pages define their own OG images; the alt text is the one thing they leave unset. */
  ogImage: {
    defaults: {
      alt: "@agntn/ciphers: classical and block ciphers behind one local API",
    },
  },
  icon: {
    clientBundle: {
      icons: [
        "lucide:activity",
        "lucide:arrow-down",
        "lucide:arrow-left",
        "lucide:arrow-right",
        "lucide:arrow-right-left",
        "lucide:arrow-up",
        "lucide:arrow-up-right",
        "lucide:binary",
        "lucide:blocks",
        "lucide:book-open",
        "lucide:bot",
        "lucide:calculator",
        "lucide:chart-column",
        "lucide:check",
        "lucide:check-circle",
        "lucide:chevron-down",
        "lucide:chevron-left",
        "lucide:chevron-right",
        "lucide:chevrons-up-down",
        "lucide:circle-alert",
        "lucide:circle-check",
        "lucide:circle-x",
        "lucide:columns-3",
        "lucide:copy",
        "lucide:disc-3",
        "lucide:expand",
        "lucide:external-link",
        "lucide:flask-conical",
        "lucide:flip-horizontal-2",
        "lucide:grid-2x2",
        "lucide:grid-3x3",
        "lucide:hash",
        "lucide:key-round",
        "lucide:keyboard",
        "lucide:library",
        "lucide:link",
        "lucide:list-ordered",
        "lucide:plus",
        "lucide:radio",
        "lucide:rotate-ccw",
        "lucide:rotate-ccw-key",
        "lucide:split",
        "lucide:square-sigma",
        "lucide:table",
        "lucide:terminal",
        "lucide:x",
        "simple-icons:cursor",
        "simple-icons:github",
        "simple-icons:npm",
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
        { name: "author", content: "oritwoen" },
        { property: "og:locale", content: "en_US" },
      ],
    },
  },
  nitro: {
    preset: "cloudflare_module",
    /**
     * One MCP SDK in the worker. The toolkit builds its server from one copy and `agents` checks it
     * with `instanceof` against another. pnpm splits them by the `zod` peer each one resolves.
     */
    alias: {
      "@modelcontextprotocol/sdk": resolve(
        import.meta.dirname,
        "node_modules/@modelcontextprotocol/sdk/dist/esm",
      ),
    },
    compatibilityDate: "2026-09-03",
    /** Nitro compiles the server bundle for ES2019 unless told otherwise; the library uses BigInt. */
    esbuild: { options: { target: "es2024" } },
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
      { name: "Figtree", provider: "local", weights: [400, 500] },
      { name: "Fira Code", provider: "local", weights: [400, 500] },
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
            default: ciphersTheme,
            light: ciphersTheme,
            dark: ciphersTheme,
          },
        },
      },
    },
  },
});
