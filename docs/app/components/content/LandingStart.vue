<script setup lang="ts">
import { analyzeFrequency, create } from "@agntn/ciphers";
import { engines } from "../../../../package.json";
import { tokens } from "../../utils/tokens";

const { copied, copy } = useCopied();

const INSTALL = "pnpm add @agntn/ciphers";
/** `>=25` in the root package.json, read as a sentence. */
const NODE = `Node.js ${engines.node.replace(/^>=\s*/u, "")} or newer`;

interface Line {
  /** A shell line gets the prompt; everything else is TypeScript and goes through the tokenizer. */
  readonly shell?: boolean;
  readonly text: string;
}

/** The comments are the library's own answers, computed here, so the snippet can't drift from it. */
const ENCODED = create("vigenere").encode("ATTACK AT DAWN", { key: "LEMON" }).text;
const IC = analyzeFrequency(ENCODED)?.ic?.toFixed(3);
const LINES: readonly Line[] = [
  { shell: true, text: INSTALL },
  { text: "" },
  { text: 'import { analyzeFrequency, create } from "@agntn/ciphers";' },
  { text: "" },
  { text: 'const vigenere = create("vigenere");' },
  { text: `vigenere.encode("ATTACK AT DAWN", { key: "LEMON" }).text;  // "${ENCODED}"` },
  { text: `vigenere.decode("${ENCODED}", { key: "LEMON" }).text;  // "ATTACK AT DAWN"` },
  { text: `analyzeFrequency("${ENCODED}")?.ic;  // ${IC}` },
];

/** What the copy button hands out: the lines as shown, the shell one with its prompt. */
const SNIPPET = LINES.map((line) => (line.shell ? `$ ${line.text}` : line.text)).join("\n");

const NOTES = [
  { tag: "Pin", text: "Pre-1.0, so pin exact versions." },
  { tag: "Secrets", text: "Fine for a riddle, a lesson or a CTF. Useless for a real secret." },
  { tag: "Offline", text: "Nothing to fetch, no key to sign up for, nothing to configure." },
] as const;
</script>

<template>
  <div class="tool-console console-wide landing-start">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>
    <header class="console-bar">
      <span class="console-title"><span class="console-tag">Start</span>{{ INSTALL }}</span>
      <span class="console-meta">{{ NODE }}</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true" />

    <div class="start-body">
      <div class="start-copy">
        <h2 class="start-title">Start with one command</h2>
        <p class="start-lead">
          One install gives you the library, the <code>ciphers</code> CLI and the MCP server. Pick a
          cipher by name, hand it text and options, and read the result back the same way for all of
          them.
        </p>
        <ul class="start-notes">
          <li v-for="note in NOTES" :key="note.tag">
            <span class="console-tag">{{ note.tag }}</span>
            <span>{{ note.text }}</span>
          </li>
        </ul>
        <div class="console-actions start-actions">
          <UButton
            to="/guide"
            color="primary"
            variant="solid"
            trailing-icon="i-lucide-arrow-right"
            label="Read the guide"
          />
          <UButton
            to="/playground"
            color="neutral"
            variant="outline"
            icon="i-lucide-flask-conical"
            label="Open the playground"
          />
        </div>
      </div>
      <div class="start-file">
        <p class="console-label console-rule-title">
          <span>First call <span aria-hidden="true">[ index.ts ]</span></span>
          <span class="console-mark" aria-hidden="true" />
          <UButton
            color="neutral"
            variant="subtle"
            :icon="copied === 'start' ? 'i-lucide-check' : 'i-lucide-copy'"
            :label="copied === 'start' ? 'copied' : 'copy'"
            :aria-label="copied === 'start' ? 'Copied' : 'Copy the first call'"
            @click="copy('start', SNIPPET)"
          />
        </p>
        <!-- prettier-ignore -->
        <pre
          class="console-snippet console-lines"
        ><code><span v-for="(line, index) in LINES" :key="index"><template v-if="line.shell"><span class="start-prompt">$ </span>{{ line.text }}</template><span v-for="(token, part) in line.shell ? [] : tokens(line.text)" v-else :key="part" :class="token.cls">{{ token.text }}</span></span></code></pre>
      </div>
    </div>

    <footer class="console-footer console-footer-plain">
      <span>MIT license / no network</span>
      <NuxtLink to="/ciphers" class="start-link"
        ><span aria-hidden="true">→ </span>every cipher</NuxtLink
      >
    </footer>
  </div>
</template>

<style scoped>
/* The copy on the left in the page's reading face, the first lookup on the right as a file. */
.start-body {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  gap: 28px 40px;
  padding: 28px;
  border-top: 1px solid var(--console-line);
}
.start-copy,
.start-file {
  min-width: 0;
}
.start-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 28px;
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--ui-text-highlighted);
}
.start-lead {
  margin: 12px 0 0;
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
  color: var(--ui-text-muted);
}
.start-lead code {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--ui-text-highlighted);
}
/* Three notes, each a boxed tag and one sentence, the way the dossiers print their leads. */
.start-notes {
  display: grid;
  gap: 10px;
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
}
.start-notes > li {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  align-items: baseline;
  gap: 12px;
}
.start-notes .console-tag {
  margin: 0;
  text-align: center;
}
.start-notes > li > span:last-child {
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ui-text);
}
.start-actions {
  justify-content: flex-start;
  margin-top: 24px;
}
.start-file > .console-rule-title {
  margin: 0 0 12px;
}
.start-file > .console-snippet {
  overflow-wrap: break-word;
}
.start-prompt {
  color: var(--ui-text-dimmed);
}
.start-link {
  margin-left: auto;
  color: var(--ui-text-highlighted);
  text-transform: none;
  letter-spacing: 0.04em;
}
.start-link:hover {
  color: var(--console-accent);
}
.start-link:focus-visible {
  outline: 1px solid var(--ui-primary);
  outline-offset: 3px;
}
@media (width < 56rem) {
  .start-body {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (width < 640px) {
  .start-body {
    padding: 20px 16px;
  }
  .start-file > .console-rule-title > .console-mark,
  .start-file > .console-rule-title > span:first-child > span {
    display: none;
  }
}
</style>
