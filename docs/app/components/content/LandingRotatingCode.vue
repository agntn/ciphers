<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingCipher";
import { optionLiteral } from "../../utils/format";

const props = defineProps<{ sample: LandingSample }>();

const fileName = computed(() => `${props.sample.entry.slug}.ts`);
const literal = computed(() => {
  const options = optionLiteral(props.sample.options);
  return options ? `, ${options}` : "";
});
const inverse = computed(() =>
  props.sample.entry.info.selfInverse ? "self-inverse, encode is decode" : "decode takes the same options",
);
</script>

<template>
  <div class="ciphers-frame overflow-hidden rounded-xl">
    <div class="flex items-center gap-2 border-b border-muted px-4 py-3">
      <span class="font-mono text-[10px] font-bold text-primary">TS</span>
      <span class="text-sm text-default">
        <Transition name="ciphers-roll" mode="out-in">
          <span :key="fileName">{{ fileName }}</span>
        </Transition>
      </span>
    </div>
    <pre
      class="ciphers-rotating"
    ><code><span class="tok-kw">import</span> { create } <span class="tok-kw">from</span> <span class="tok-str">"@agntn/ciphers"</span>;

<span class="tok-cm">// <Transition name="ciphers-roll" mode="out-in"><span :key="sample.entry.info.label" class="ciphers-roll-slot">{{ sample.entry.info.label }}</span></Transition>, <Transition name="ciphers-roll" mode="out-in"><span :key="sample.entry.info.family" class="ciphers-roll-slot">{{ sample.entry.info.family }}</span></Transition></span>
<span class="tok-kw">const</span> cipher = <span class="tok-fn">create</span>(<span class="tok-str">"<Transition name="ciphers-roll" mode="out-in"><span :key="sample.entry.slug" class="ciphers-roll-slot">{{ sample.entry.slug }}</span></Transition>"</span>);

<span class="tok-kw">const</span> encoded = cipher.<span class="tok-fn">encode</span>(<span class="tok-str">"<Transition name="ciphers-roll" mode="out-in"><span :key="sample.plaintext" class="ciphers-roll-slot">{{ sample.plaintext }}</span></Transition>"</span><Transition name="ciphers-roll" mode="out-in"><span :key="literal" class="ciphers-roll-slot">{{ literal }}</span></Transition>);
encoded.text;   <span class="tok-cm">// "<Transition name="ciphers-roll" mode="out-in"><span :key="sample.ciphertext" class="ciphers-roll-slot">{{ sample.ciphertext }}</span></Transition>"</span>

<span class="tok-kw">const</span> back = cipher.<span class="tok-fn">decode</span>(encoded.text<Transition name="ciphers-roll" mode="out-in"><span :key="literal" class="ciphers-roll-slot">{{ literal }}</span></Transition>);
back.text;      <span class="tok-cm">// "<Transition name="ciphers-roll" mode="out-in"><span :key="sample.roundtrip" class="ciphers-roll-slot">{{ sample.roundtrip }}</span></Transition>", <Transition name="ciphers-roll" mode="out-in"><span :key="inverse" class="ciphers-roll-slot">{{ inverse }}</span></Transition></span></code></pre>
  </div>
</template>
