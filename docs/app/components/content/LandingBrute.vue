<script setup lang="ts">
import { bruteRows, bruteText } from "../../utils/tools";

const props = defineProps<{ ciphertext: string; plaintext: string; shift: number }>();
const emit = defineEmits<{ pause: [paused: boolean] }>();

/** The 25 decodings as the CLI and the tool rank them, best letter fit first. */
const ranked = computed(() => bruteRows(props.ciphertext));
const rank = computed(() => ranked.value.findIndex((row) => row.shift === props.shift) + 1);
const top = computed(() =>
  ranked.value.slice(0, 3).map((row, index) => ({ ...row, rank: index + 1, hit: row.shift === props.shift })),
);
/** One tick per shift in shift order, the one that undoes the encoding open. */
const ticks = computed(() => Array.from({ length: 25 }, (_, index) => index + 1));

const text = computed(() => bruteText(props.ciphertext));
const title = computed(() => `ciphers_caesar_brute("${props.ciphertext}")`);
const playground = computed(() => `/playground?op=brute&text=${encodeURIComponent(props.ciphertext)}`);

/**
 * An English ordinal for the rank, `1st` to `25th`.
 *
 * @param {number} value - A rank from 1.
 * @returns {string} The rank with its suffix.
 */
function ordinal(value: number): string {
  const teen = value % 100 >= 11 && value % 100 <= 13;
  const suffix = teen ? "th" : (["th", "st", "nd", "rd"][value % 10] ?? "th");
  return `${value}${suffix}`;
}
</script>

<template>
  <section
    class="tool-console landing-brute"
    aria-label="A Caesar ciphertext decoded with every shift"
    @mouseenter="emit('pause', true)"
    @mouseleave="emit('pause', false)"
    @focusin="emit('pause', true)"
    @focusout="emit('pause', false)"
  >
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>
    <header class="console-bar">
      <UTooltip :text="`ciphers brute ${JSON.stringify(ciphertext)}`">
        <span class="console-title brute-call" tabindex="0"
          ><span class="console-tag">Call</span>ciphers brute
          <span class="tok-str">"{{ ciphertext }}"</span></span
        >
      </UTooltip>
      <span class="console-meta">25 shifts · best fit first</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="ciphertext" class="console-cursor" />
    </div>

    <!-- The verdict on the crosses grid, then the ranking behind it: the four best fits and a tick per shift. -->
    <div class="brute-subject">
      <div :key="ciphertext" class="console-scan" aria-hidden="true" />
      <div class="brute-identity">
        <ConsoleReticle :key="ciphertext" icon="i-lucide-rotate-ccw" />
        <div class="brute-name">
          <span class="console-label">Verdict / <span class="console-label-key">caesar</span></span>
          <h3>
            shift <span class="brute-hit">{{ shift }}</span> ranked {{ ordinal(rank) }}
          </h3>
          <p class="console-about">
            <template v-if="rank === 1">The right key reads most like English, so it's on top.</template>
            <template v-else>Too few letters for the counts to settle, the right key sits lower.</template>
          </p>
        </div>
      </div>
      <div class="console-readout">
        <ol :key="ciphertext" class="console-animate brute-rows">
          <li
            v-for="(row, index) in top"
            :key="row.shift"
            :data-hit="row.hit ? '' : undefined"
            :style="{ animationDelay: `${index * 45}ms` }"
          >
            <span class="brute-shift">shift={{ String(row.shift).padStart(2, " ") }}</span>
            <span class="brute-text">{{ row.text }}</span>
          </li>
        </ol>
        <div class="console-gauge" :aria-label="`the key is shift ${shift}, ranked ${rank} of 25`">
          <span class="console-ticks" aria-hidden="true">
            <span
              v-for="tick in ticks"
              :key="tick"
              :class="tick === shift ? 'console-tick-open' : 'console-tick-closed'"
              :style="{ animationDelay: `${tick * 12}ms` }"
            />
          </span>
          <span class="console-gauge-read">shift 1 → 25</span>
        </div>
      </div>
    </div>

    <ConsoleResponse :title="title" :text="text" />

    <footer class="console-footer console-footer-plain">
      <span>In your browser / no network</span>
      <NuxtLink :to="playground" class="brute-link"
        ><span aria-hidden="true">→ </span>try your own ciphertext</NuxtLink
      >
    </footer>
  </section>
</template>

<style scoped>
.brute-call {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.brute-subject {
  position: relative;
  display: grid;
  gap: 16px;
  padding: 18px 20px 20px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M16 18h4m-2-2v4' fill='none' stroke='%23818a94' stroke-opacity='.1'/%3E%3C/svg%3E");
  background-size: 36px 36px;
  background-position: 24px 20px;
}
.brute-subject > :not(.console-scan) {
  position: relative;
}
.brute-identity {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}
.brute-name {
  min-width: 0;
}
.brute-name h3 {
  margin: 4px 0 6px;
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 400;
  line-height: 1.25;
  color: var(--ui-text-highlighted);
}
.brute-hit {
  color: var(--console-accent);
}
.brute-name .console-about {
  font-size: 14px;
}
.brute-rows {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}
/* One row per decoding: the shift, then the text on one line. The key's row carries the accent edge. */
.brute-rows > li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: baseline;
  padding: 8px 12px;
  font-size: 12px;
}
.brute-rows > li + li {
  border-top: 1px solid var(--console-line);
}
.brute-rows > li[data-hit] {
  background: color-mix(in srgb, var(--ui-primary) 5%, var(--ui-bg));
  box-shadow: inset 2px 0 0 var(--console-accent);
}
.brute-shift {
  white-space: pre;
  color: var(--ui-text-dimmed);
}
.brute-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-muted);
}
.brute-rows > li[data-hit] .brute-text {
  color: var(--console-accent);
}
.brute-link {
  margin-left: auto;
  color: var(--ui-text-highlighted);
}
.brute-link:hover {
  color: var(--console-accent);
}
.brute-link:focus-visible {
  outline: 1px solid var(--ui-primary);
  outline-offset: 3px;
}
@media (width < 400px) {
  .brute-subject {
    padding-inline: 14px;
  }
  .brute-identity {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px;
  }
}
</style>
