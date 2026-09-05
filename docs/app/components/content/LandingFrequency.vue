<script setup lang="ts">
import { frequencyView } from "../../utils/analysis";

const props = defineProps<{ text: string; label: string }>();

/** The twelve most frequent letters, scaled to the top one. */
const analysis = computed(() => frequencyView(props.text, "en", 12));
</script>

<template>
  <div class="ciphers-frame overflow-hidden rounded-xl">
    <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
      <p class="font-mono text-xs text-muted">
        <span class="text-dimmed">analyzeFrequency</span>
        <span class="ms-2 text-highlighted">{{ label }}</span>
      </p>
      <p v-if="analysis" class="font-mono text-[11px] text-dimmed">
        {{ analysis.total }} letters
        <template v-if="analysis.ic !== undefined"> · IC {{ analysis.ic.toFixed(3) }}</template>
      </p>
    </div>
    <div v-if="analysis" :key="text" class="ciphers-derive px-4 py-4">
      <ol class="space-y-1.5">
        <li v-for="bar in analysis.bars" :key="bar.letter" class="flex items-center gap-3 font-mono text-xs">
          <span class="w-3 text-highlighted">{{ bar.letter }}</span>
          <span class="ciphers-bar-track">
            <span class="ciphers-bar" :style="{ width: `${bar.width}%` }" />
          </span>
          <span class="w-6 text-right text-dimmed">{{ bar.count }}</span>
        </li>
      </ol>
      <dl class="mt-4 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 font-mono text-[11px]">
        <dt class="text-dimmed">expected</dt>
        <dd class="tracking-[0.2em] text-muted">{{ analysis.expected }}</dd>
        <dt class="text-dimmed">actual</dt>
        <dd class="tracking-[0.2em] text-highlighted">{{ analysis.actual }}</dd>
      </dl>
    </div>
    <p v-else class="px-4 py-6 text-sm text-dimmed">No A to Z letters in this output. Nothing to count.</p>
  </div>
</template>
