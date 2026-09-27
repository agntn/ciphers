<script setup lang="ts">
import type { FrequencyAnalysis } from "@agntn/ciphers";

/**
 * Letter counts as 26 columns in alphabet order, so a shift reads as the same shape moved and a
 * flat text as flat. The language's six most common letters are marked in the accent.
 */
const props = defineProps<{ analysis: FrequencyAnalysis }>();

const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

const columns = computed(() => {
  const counts = new Map(props.analysis.counts);
  const max = props.analysis.counts[0]?.[1] ?? 1;
  const expected = new Set(props.analysis.reference.slice(0, 6));
  return LETTERS.map((letter) => {
    const count = counts.get(letter) ?? 0;
    return {
      letter,
      count,
      height: count === 0 ? 0 : Math.max(6, Math.round((count / max) * 100)),
      expected: expected.has(letter),
    };
  });
});
</script>

<template>
  <ol class="histogram" aria-label="Letter counts from A to Z">
    <li
      v-for="(column, index) in columns"
      :key="column.letter"
      :aria-label="`${column.letter}: ${column.count}`"
      :data-expected="column.expected ? '' : undefined"
    >
      <span class="histogram-track" aria-hidden="true">
        <span
          class="histogram-bar"
          :style="{ height: `${column.height}%`, animationDelay: `${Math.min(index * 12, 300)}ms` }"
        />
      </span>
      <span class="histogram-letter" aria-hidden="true">{{ column.letter }}</span>
    </li>
  </ol>
</template>

<style scoped>
.histogram {
  display: grid;
  grid-template-columns: repeat(26, minmax(0, 1fr));
  gap: 3px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.histogram > li {
  display: grid;
  gap: 6px;
  justify-items: center;
}
.histogram-track {
  position: relative;
  display: block;
  width: 100%;
  height: 72px;
  box-shadow: inset 0 -1px 0 var(--console-line);
}
.histogram-bar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  background: color-mix(in srgb, var(--ui-text-muted) 45%, var(--ui-bg));
  transform-origin: bottom;
  animation: histogram-grow 0.36s ease-out both;
}
[data-expected] > .histogram-track > .histogram-bar {
  background: color-mix(in srgb, var(--console-accent) 70%, var(--ui-bg));
}
@keyframes histogram-grow {
  from {
    transform: scaleY(0);
  }
}
.histogram-letter {
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1;
  color: var(--ui-text-dimmed);
}
[data-expected] > .histogram-letter {
  color: var(--console-accent);
}
@media (width < 400px) {
  .histogram {
    gap: 1px;
  }
  .histogram-letter {
    font-size: 9px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .histogram-bar {
    animation: none;
  }
}
</style>
