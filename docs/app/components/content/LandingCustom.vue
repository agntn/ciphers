<script setup lang="ts">
import { tokens } from "../../utils/tokens";

const { copied, copy } = useCopied();

/** A cipher of your own, the shape every built-in has: name, info, encode, decode. */
const FILE = [
  'import { Cipher, register } from "@agntn/ciphers";',
  'import type { CipherInfo, CipherResult } from "@agntn/ciphers";',
  "",
  "class Reverse extends Cipher {",
  "  name() {",
  '    return "reverse";',
  "  }",
  "",
  "  info(): CipherInfo {",
  "    return {",
  '      name: "reverse",',
  '      label: "Reverse",',
  '      description: "The text backwards",',
  '      category: "classical",',
  '      family: "transposition",',
  "      selfInverse: true,",
  '      worksOn: "all characters, moved",',
  "      options: [],",
  "    };",
  "  }",
  "",
  "  encode(text: string): CipherResult {",
  '    const out = [...text].reverse().join("");',
  '    return { text: out, cipher: "reverse", operation: "encode", options: {} };',
  "  }",
  "",
  "  decode(text: string): CipherResult {",
  '    return { ...this.encode(text), operation: "decode" };',
  "  }",
  "}",
  "",
  'register("reverse", Reverse);',
] as const;

/**
 * What the panel shows: the method the section is about in full, the rest folded to its signature
 * the way an editor folds it. Copy hands out `FILE`, every line.
 */
const LINES = [
  FILE[0],
  FILE[1],
  "",
  "class Reverse extends Cipher {",
  '  name() { return "reverse"; }',
  "  info(): CipherInfo { /* name, label, family, options */ }",
  "",
  "  encode(text: string): CipherResult {",
  '    const out = [...text].reverse().join("");',
  '    return { text: out, cipher: "reverse", operation: "encode", options: {} };',
  "  }",
  "",
  "  decode(text: string): CipherResult { /* encode, as decode */ }",
  "}",
  "",
  'register("reverse", Reverse);',
] as const;
</script>

<template>
  <section class="tool-console landing-custom" aria-label="A cipher of your own">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <span class="console-title"><span class="console-tag">File</span>reverse.ts</span>
      <span class="console-meta">folded · copy is whole</span>
      <span class="console-mark" aria-hidden="true" />
      <UButton
        color="neutral"
        variant="subtle"
        :icon="copied === 'reverse' ? 'i-lucide-check' : 'i-lucide-copy'"
        :label="copied === 'reverse' ? 'copied' : 'copy'"
        :aria-label="copied === 'reverse' ? 'Copied' : 'Copy reverse.ts'"
        @click="copy('reverse', FILE.join('\n'))"
      />
    </header>
    <div class="console-ruler" aria-hidden="true" />

    <div class="custom-body">
      <!-- prettier-ignore -->
      <pre class="console-snippet console-lines"><code><span v-for="(line, index) in LINES" :key="index"><span v-for="(token, part) in tokens(line)" :key="part" :class="token.cls">{{ token.text }}</span></span></code></pre>
    </div>
  </section>
</template>

<style scoped>
.custom-body {
  padding: 14px 20px 18px;
}
/* Breaks only between words: a string split at any character is hard to read. */
.custom-body > .console-snippet {
  overflow-wrap: break-word;
}
@media (width < 400px) {
  .custom-body {
    padding-inline: 14px;
  }
}
</style>
