<script setup lang="ts">
import { analyzeFrequency } from "@agntn/ciphers";
import { frequencyText } from "../../utils/tools";

const props = defineProps<{ text: string; slug: string }>();
const emit = defineEmits<{ pause: [paused: boolean] }>();

/** Index of coincidence of uniformly random letters, the floor the tool prints next to the language's. */
const RANDOM_IC = 0.0385;

/** Plaintext's index of coincidence as the library's English table puts it. */
const ENGLISH_IC = analyzeFrequency("A", "en")!.referenceIc.toFixed(3);

const analysis = computed(() => analyzeFrequency(props.text, "en"));

const ic = computed(() => analysis.value?.ic);
/** Which of the two references the text sits closer to. */
const reads = computed(() => {
  const found = analysis.value;
  if (!found || found.ic === undefined) return undefined;
  return Math.abs(found.ic - found.referenceIc) < Math.abs(found.ic - RANDOM_IC) ? "english" : "flat";
});

const response = computed(() => frequencyText(props.text));
const title = computed(() => `cipher_frequency(${props.slug} output)`);
</script>

<template>
  <section
    class="tool-console landing-frequency"
    aria-label="Letter counts of the current ciphertext"
    @mouseenter="emit('pause', true)"
    @mouseleave="emit('pause', false)"
    @focusin="emit('pause', true)"
    @focusout="emit('pause', false)"
  >
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>
    <header class="console-bar">
      <UTooltip :text="text">
        <span class="console-title frequency-call" tabindex="0"
          ><span class="console-tag">Call</span>analyzeFrequency(<span class="frequency-arg"
            >{{ slug }} output</span
          >, <span class="tok-str">"en"</span>)</span
        >
      </UTooltip>
      <span class="console-meta">{{ analysis?.total ?? 0 }} letters</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="text" class="console-cursor" />
    </div>

    <div class="frequency-subject">
      <div :key="text" class="console-scan" aria-hidden="true" />
      <div class="frequency-identity">
        <ConsoleReticle :key="text" icon="i-lucide-chart-column" />
        <div class="frequency-name">
          <span class="console-label"
            >Counts / <span class="console-label-key">{{ slug }}</span></span
          >
          <h3 v-if="ic !== undefined">
            IC <span class="frequency-ic">{{ ic.toFixed(3) }}</span>
          </h3>
          <h3 v-else>no letters</h3>
          <p class="console-about">
            <template v-if="reads === 'english'"
              >Close to English at {{ analysis!.referenceIc.toFixed(3) }}. One alphabet, maybe
              moved, the shape survived.</template
            >
            <template v-else-if="reads === 'flat'"
              >Close to random at {{ RANDOM_IC.toFixed(3) }}. Several alphabets or none, the
              histogram went flat.</template
            >
            <template v-else>Nothing from A to Z in this output, so nothing to count.</template>
          </p>
        </div>
      </div>
    </div>

    <div v-if="analysis" class="console-band frequency-band">
      <p class="console-label console-rule-title">
        <span>Histogram <span aria-hidden="true">[ A to Z, English top six marked ]</span></span>
        <span class="console-mark" aria-hidden="true" />
      </p>
      <CipherHistogram :key="text" :analysis="analysis!" />
    </div>

    <ConsoleResponse :title="title" :text="response" />

    <footer class="console-footer console-footer-plain">
      <span>English near {{ ENGLISH_IC }}, random near {{ RANDOM_IC.toFixed(3) }}</span>
    </footer>
  </section>
</template>

<style scoped>
.frequency-call {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.frequency-arg {
  color: var(--ui-text-muted);
}
.frequency-subject {
  position: relative;
  padding: 18px 20px 20px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M16 18h4m-2-2v4' fill='none' stroke='%23818a94' stroke-opacity='.1'/%3E%3C/svg%3E");
  background-size: 36px 36px;
  background-position: 24px 20px;
}
.frequency-subject > :not(.console-scan) {
  position: relative;
}
.frequency-identity {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}
.frequency-name {
  min-width: 0;
}
.frequency-name h3 {
  margin: 4px 0 6px;
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 400;
  line-height: 1.25;
  color: var(--ui-text-highlighted);
}
.frequency-ic {
  color: var(--console-accent);
}
.frequency-name .console-about {
  font-size: 14px;
}
.frequency-band > .console-rule-title {
  margin-bottom: 12px;
}
@media (width < 400px) {
  .frequency-subject {
    padding-inline: 14px;
  }
  .frequency-identity {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px;
  }
  .frequency-band > .console-rule-title > span:first-child > span {
    display: none;
  }
}
</style>
