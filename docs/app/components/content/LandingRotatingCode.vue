<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingCipher";
import { optionLiteral } from "../../utils/format";
import { tokens } from "../../utils/tokens";

const props = defineProps<{ sample: LandingSample }>();
const emit = defineEmits<{ step: [delta: number]; pause: [paused: boolean] }>();

const { copied, copy } = useCopied();

/** Every cipher gets the same twelve lines, so the file keeps one height while the sample walks. */
const lines = computed(() => {
  const { entry, plaintext, ciphertext, roundtrip } = props.sample;
  const options = optionLiteral(props.sample.options) || "{}";
  const applied = optionLiteral(props.sample.applied) || "{}";
  return [
    'import { create } from "@agntn/ciphers";',
    "",
    `// ${entry.info.label}, ${entry.info.family}`,
    `const cipher = create("${entry.slug}");`,
    `const options = ${options};`,
    "",
    `const encoded = cipher.encode("${plaintext}", options);`,
    `encoded.text;     // "${ciphertext}"`,
    `encoded.options;  // ${applied}`,
    "",
    "cipher.decode(encoded.text, options).text;",
    `// "${roundtrip}"`,
  ];
});
</script>

<template>
  <section
    class="tool-console landing-file"
    aria-label="One cipher, encoded and decoded"
    @mouseenter="emit('pause', true)"
    @mouseleave="emit('pause', false)"
    @focusin="emit('pause', true)"
    @focusout="emit('pause', false)"
  >
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <span class="console-title file-name"
        ><span class="console-tag">File</span
        ><Transition name="ciphers-roll" mode="out-in"
          ><span :key="sample.entry.slug" class="ciphers-roll-slot"
            >{{ sample.entry.slug }}.ts</span
          ></Transition
        ></span
      >
      <span class="console-meta">{{ sample.entry.info.category }} · computed here</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="sample.entry.slug" class="console-cursor" />
    </div>

    <div class="file-body">
      <p class="console-label console-rule-title">
        <span>Round trip <span aria-hidden="true">[ encode, then decode ]</span></span>
        <span class="console-mark" aria-hidden="true" />
        <UButton
          color="neutral"
          variant="subtle"
          :icon="copied === 'file' ? 'i-lucide-check' : 'i-lucide-copy'"
          :label="copied === 'file' ? 'copied' : 'copy'"
          :aria-label="copied === 'file' ? 'Copied' : 'Copy the file'"
          @click="copy('file', lines.join('\n'))"
        />
      </p>
      <!-- prettier-ignore -->
      <pre class="console-snippet console-lines file-lines"><code><span v-for="(line, index) in lines" :key="index"><span class="file-code"><span v-for="(token, part) in tokens(line)" :key="part" :class="token.cls">{{ token.text }}</span></span></span></code></pre>
    </div>

    <footer class="console-footer console-footer-plain">
      <NuxtLink :to="sample.entry.to" class="file-link"
        ><span aria-hidden="true">→ </span>{{ sample.entry.info.label
        }}<span> · {{ sample.entry.to }}</span></NuxtLink
      >
      <div class="console-controls" aria-label="Sample ciphers">
        <UButton
          color="neutral"
          variant="subtle"
          square
          icon="i-lucide-chevron-left"
          aria-label="Previous cipher"
          @click="emit('step', -1)"
        />
        <span>Cipher</span>
        <UButton
          color="neutral"
          variant="subtle"
          square
          icon="i-lucide-chevron-right"
          aria-label="Next cipher"
          @click="emit('step', 1)"
        />
      </div>
    </footer>
  </section>
</template>

<style scoped>
.file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-name :deep(.ciphers-roll-slot) {
  display: inline;
}
.file-body {
  padding: 14px 20px 16px;
}
.file-body > .console-rule-title {
  margin-bottom: 10px;
}
/* One line per code line whatever the cipher: the number in its own column, a long value ends in an
   ellipsis there and never takes the number with it; copy hands out the whole line. */
.file-lines > code > span {
  display: grid;
  grid-template-columns: 2.25em minmax(0, 1fr);
  column-gap: 1em;
  padding-left: 0;
  text-indent: 0;
}
.file-lines > code > span::before {
  margin-right: 0;
}
.file-code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: pre;
}
.file-code :deep(*) {
  white-space: pre;
  overflow-wrap: normal;
}
.file-link {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}
.file-link > span:last-child {
  color: var(--ui-text-dimmed);
}
.file-link:hover {
  color: var(--console-accent);
}
.file-link:focus-visible {
  outline: 1px solid var(--ui-primary);
  outline-offset: 3px;
}
@media (width < 640px) {
  .file-body > .console-rule-title > .console-mark {
    display: none;
  }
}
@media (width < 400px) {
  .file-body {
    padding-inline: 14px;
  }
  .file-body > .console-rule-title > span:first-child > span {
    display: none;
  }
}
</style>
