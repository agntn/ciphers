<script setup lang="ts">
import { cipherEntry, familyLabel } from "../../utils/ciphers";
import { optionFlags } from "../../utils/format";

const props = defineProps<{ name: string }>();

const entry = computed(() => cipherEntry(props.name));

const facts = computed(() => {
  const cipher = entry.value;
  if (!cipher) {
    return [];
  }
  const info = cipher.info;
  const options = info.options.map((option) => `--${option.name}${option.required ? "" : "?"}`);
  return [
    { label: "create", value: `create("${info.name}")`, mono: true },
    { label: "family", value: familyLabel(info.family), mono: false },
    { label: "options", value: options.length > 0 ? options.join(" ") : "none", mono: true },
    { label: "self-inverse", value: info.selfInverse ? "yes" : "no", mono: false },
    { label: "keyspace", value: info.keyspace ?? "fixed", mono: true },
    { label: "try it", value: `ciphers ${info.name} "${cipher.sample}" ${optionFlags(cipher.options)}`.trim(), mono: true },
  ];
});
</script>

<template>
  <dl
    v-if="facts.length > 0"
    class="ciphers-frame not-prose my-6 grid grid-cols-2 overflow-hidden rounded-xl sm:grid-cols-3"
  >
    <div
      v-for="(fact, index) in facts"
      :key="fact.label"
      class="border-muted px-4 py-3.5"
      :class="{
        'border-t': index >= 2,
        'sm:border-t-0': index < 3,
        'border-l': index % 2 === 1,
        'sm:border-l': index % 3 !== 0,
        'sm:border-l-0': index % 3 === 0,
      }"
    >
      <dt class="font-mono text-[10px] tracking-[0.12em] text-dimmed uppercase">
        {{ fact.label }}
      </dt>
      <dd
        class="mt-1 text-sm text-highlighted"
        :class="{ 'font-mono text-[13px] break-words': fact.mono }"
      >
        {{ fact.value }}
      </dd>
    </div>
  </dl>
</template>
