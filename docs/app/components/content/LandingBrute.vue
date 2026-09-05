<script setup lang="ts">
import { bruteRows } from "../../utils/analysis";

const props = defineProps<{ ciphertext: string; plaintext: string }>();

const rows = computed(() =>
  bruteRows(props.ciphertext).map((row) => ({ ...row, hit: row.text === props.plaintext })),
);
</script>

<template>
  <div class="ciphers-frame overflow-hidden rounded-xl">
    <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
      <p class="font-mono text-xs text-muted">
        <span class="text-dimmed">$</span>
        <span class="ms-2 text-highlighted">ciphers brute "{{ ciphertext }}"</span>
      </p>
      <p class="font-mono text-[11px] text-dimmed">25 shifts</p>
    </div>
    <ol :key="ciphertext" class="ciphers-brute ciphers-derive">
      <li
        v-for="row in rows"
        :key="row.shift"
        class="ciphers-brute-row"
        :class="{ 'ciphers-brute-hit': row.hit }"
      >
        <span class="text-dimmed">shift={{ String(row.shift).padStart(2) }}</span>
        <span class="text-dimmed">→</span>
        <span :class="row.hit ? 'text-primary' : 'text-muted'">{{ row.text }}</span>
      </li>
    </ol>
  </div>
</template>
