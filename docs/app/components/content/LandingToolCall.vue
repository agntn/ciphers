<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingCipher";

const props = defineProps<{ sample: LandingSample }>();

const optionRows = computed(() =>
  Object.entries(props.sample.options).map(([name, value]) => ({
    name,
    value: typeof value === "string" ? JSON.stringify(value) : String(value),
    string: typeof value === "string",
  })),
);
</script>

<template>
  <div class="ciphers-frame overflow-hidden rounded-xl">
    <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
      <p class="font-mono text-xs text-muted">
        <span class="text-dimmed">tool</span>
        <span class="ms-2 text-highlighted">cipher_encode</span>
      </p>
      <p class="font-mono text-[11px] text-dimmed">MCP · Pi · OMP</p>
    </div>
    <div class="divide-y divide-muted">
      <div class="px-4 py-4">
        <p class="ciphers-eyebrow mb-3">input</p>
        <pre class="ciphers-tool"><code>{
  <span class="tok-key">"cipher"</span>: <span class="tok-str">"<Transition name="ciphers-roll" mode="out-in"><span :key="sample.entry.slug" class="ciphers-roll-slot">{{ sample.entry.slug }}</span></Transition>"</span>,
  <span class="tok-key">"text"</span>: <span class="tok-str">"<Transition name="ciphers-roll" mode="out-in"><span :key="sample.plaintext" class="ciphers-roll-slot">{{ sample.plaintext }}</span></Transition>"</span><template v-for="row in optionRows" :key="row.name">,
  <span class="tok-key">"{{ row.name }}"</span>: <span :class="row.string ? 'tok-str' : 'tok-kw'">{{ row.value }}</span></template>
}</code></pre>
      </div>
      <div class="px-4 py-4">
        <p class="ciphers-eyebrow mb-3">output</p>
        <pre :key="sample.entry.slug" class="ciphers-tool ciphers-derive"><code>{
  <span class="tok-key">"content"</span>: [{ <span class="tok-key">"type"</span>: <span class="tok-str">"text"</span>, <span class="tok-key">"text"</span>: <span class="tok-str">"{{ sample.ciphertext }}"</span> }],
  <span class="tok-key">"details"</span>: {
    <span class="tok-key">"cipher"</span>: <span class="tok-str">"{{ sample.entry.slug }}"</span>,
    <span class="tok-key">"operation"</span>: <span class="tok-str">"encode"</span>,
    <span class="tok-key">"options"</span>: { <template v-for="(row, i) in optionRows" :key="row.name"><span class="tok-key">"{{ row.name }}"</span>: <span :class="row.string ? 'tok-str' : 'tok-kw'">{{ row.value }}</span>{{ i < optionRows.length - 1 ? ", " : "" }}</template> }
  }
}</code></pre>
      </div>
    </div>
  </div>
</template>
