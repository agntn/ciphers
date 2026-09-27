<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingCipher";
import { familyLabel, keyspaceParts } from "../../utils/ciphers";
import { infoText } from "../../utils/tools";

const props = defineProps<{ sample: LandingSample }>();
const emit = defineEmits<{ pause: [paused: boolean] }>();

const text = computed(() => infoText(props.sample.entry.slug));
const title = computed(() => `cipher_info("${props.sample.entry.slug}")`);

/** Four rows, the fields a model needs before its first call; an absent one says so out loud. */
const rows = computed(() => {
  const info = props.sample.entry.info;
  const required = info.options.filter((option) => option.required).map((option) => option.name);
  const optional = info.options.filter((option) => !option.required).map((option) => option.name);
  const keyspace = keyspaceParts(info);
  return [
    { label: "cipher", value: `"${info.name}"`, accent: true },
    { label: "required", value: required.join(", ") || "none", dim: required.length === 0 },
    { label: "optional", value: optional.join(", ") || "none", dim: optional.length === 0 },
    { label: "keyspace", value: keyspace?.short ?? "not stated", dim: keyspace === undefined },
  ];
});
</script>

<template>
  <section
    class="tool-console landing-call"
    aria-label="One tool call"
    @mouseenter="emit('pause', true)"
    @mouseleave="emit('pause', false)"
    @focusin="emit('pause', true)"
    @focusout="emit('pause', false)"
  >
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <span class="console-title"
        ><span class="console-tag">Call</span>cipher_info(<Transition
          name="ciphers-roll"
          mode="out-in"
          ><span :key="sample.entry.slug" class="ciphers-roll-slot tok-str"
            >"{{ sample.entry.slug }}"</span
          ></Transition
        >)</span
      >
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="sample.entry.slug" class="console-cursor" />
    </div>

    <!-- The cipher on the crosses grid, what the tool text tells a model about it in the readout. -->
    <div class="call-subject">
      <div :key="sample.entry.slug" class="console-scan" aria-hidden="true" />
      <div class="call-identity">
        <ConsoleReticle :key="sample.entry.slug" :icon="sample.entry.icon" />
        <div class="call-name">
          <span class="console-label">Tool / {{ familyLabel(sample.entry.info.family) }}</span>
          <h3>{{ sample.entry.info.label }}</h3>
          <p class="call-note">
            Before a model encodes anything it asks which options this cipher takes, and gets
            them with their defaults.
          </p>
        </div>
      </div>
      <div class="console-readout">
        <dl :key="sample.entry.slug" class="console-readout-rows console-animate">
          <div v-for="(row, index) in rows" :key="row.label" :style="{ animationDelay: `${index * 45}ms` }">
            <dt>{{ row.label }}</dt>
            <dd :class="{ 'console-accent': row.accent, 'call-dim': row.dim }">
              <span class="call-line">{{ row.value }}</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <ConsoleResponse :title="title" :text="text" />

    <footer class="console-footer console-footer-plain">
      <span aria-label="Supported hosts: MCP, Pi and OMP">MCP · Pi · OMP</span>
      <span class="console-meta">ciphers mcp · stdio</span>
    </footer>
  </section>
</template>

<style scoped>
.call-subject {
  position: relative;
  display: grid;
  gap: 16px;
  padding: 18px 20px 20px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M16 18h4m-2-2v4' fill='none' stroke='%23818a94' stroke-opacity='.1'/%3E%3C/svg%3E");
  background-size: 36px 36px;
  background-position: 24px 20px;
}
.call-subject > :not(.console-scan) {
  position: relative;
}
.call-identity {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}
.call-name {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.call-name h3 {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 22px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--ui-text-highlighted);
}
.call-note {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
.landing-call .console-readout-rows > div {
  grid-template-columns: 6.5rem minmax(0, 1fr);
}
.landing-call .console-readout-rows dt {
  text-transform: none;
  letter-spacing: 0.02em;
}
.call-dim {
  color: var(--ui-text-dimmed);
}
.call-line {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (width < 400px) {
  .call-subject {
    padding-inline: 14px;
  }
  .call-identity {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px;
  }
}
</style>
