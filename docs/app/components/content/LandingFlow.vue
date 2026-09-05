<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingCipher";
import { clip, optionLiteral } from "../../utils/format";
import { FAMILIES, familyLabel } from "../../utils/ciphers";

const props = defineProps<{ sample: LandingSample; tick: number }>();

const W = 1200;
const H = 400;
const CALL = { x: 24, y: 120, w: 340, h: 160 };
const NODE = { x: 510, w: 200, h: 36, gap: 10 };
const RESULT = { x: 870, y: 20, w: 306, h: 360 };

const nodes = computed(() =>
  FAMILIES.map((family, index) => ({
    ...family,
    y: 16 + index * (NODE.h + NODE.gap),
    active: family.key === props.sample.entry.info.family,
  })),
);

function curvePath(x1: number, y1: number, x2: number, y2: number) {
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

const trunkPaths = computed(() =>
  nodes.value.map((node) => ({
    d: curvePath(CALL.x + CALL.w, CALL.y + CALL.h / 2, NODE.x, node.y + NODE.h / 2),
    active: node.active,
  })),
);

const branchPaths = computed(() =>
  nodes.value.map((node) => ({
    d: curvePath(NODE.x + NODE.w, node.y + NODE.h / 2, RESULT.x, RESULT.y + RESULT.h / 2),
    active: node.active,
  })),
);

/** Rows of the result card: short values share a line, options and keyspace get a full one. */
const rows = computed(() => {
  const info = props.sample.entry.info;
  return [
    [
      { label: "cipher", value: info.name },
      { label: "operation", value: "encode" },
    ],
    [
      { label: "family", value: familyLabel(info.family) },
      { label: "selfInverse", value: String(info.selfInverse) },
    ],
    [{ label: "options", value: clip(optionLiteral(props.sample.options) || "{}", 34) }],
    [{ label: "keyspace", value: clip(info.keyspace ?? "fixed", 34) }],
  ];
});

const output = computed(() => props.sample.ciphertext);

/** Space Mono is about 0.62 em wide per glyph; shrink the text until it fits the box. */
function fit(text: string, width: number, max: number) {
  return Math.min(max, Math.floor(width / (Math.max(text.length, 1) * 0.62)));
}
const inputSize = computed(() => fit(props.sample.plaintext, CALL.w - 36, 22));
const outputSize = computed(() => fit(output.value, RESULT.w - 36, 22));
</script>

<template>
  <svg
    :viewBox="`0 0 ${W} ${H}`"
    class="ciphers-flow"
    role="img"
    aria-label="One encode call goes through the cipher's family and comes back as one CipherResult shape"
  >
    <g class="ciphers-flow-wires">
      <path
        v-for="(path, index) in trunkPaths"
        :key="`t${index}`"
        :d="path.d"
        :class="{ 'ciphers-flow-wire-dim': !path.active }"
      />
      <path
        v-for="(path, index) in branchPaths"
        :key="`b${index}`"
        :d="path.d"
        :class="{ 'ciphers-flow-wire-dim': !path.active }"
      />
    </g>
    <g :key="tick" class="ciphers-flow-pulses">
      <template v-for="(path, index) in trunkPaths" :key="`pt${index}`">
        <path v-if="path.active" :d="path.d" class="ciphers-flow-pulse" />
      </template>
      <template v-for="(path, index) in branchPaths" :key="`pb${index}`">
        <path v-if="path.active" :d="path.d" class="ciphers-flow-pulse ciphers-flow-pulse-late" />
      </template>
    </g>

    <g class="ciphers-flow-node">
      <rect :x="CALL.x" :y="CALL.y" :width="CALL.w" :height="CALL.h" rx="10" />
      <text :x="CALL.x + 18" :y="CALL.y + 30" class="ciphers-flow-label">
        encode(text, options)
      </text>
      <text
        :x="CALL.x + 18"
        :y="CALL.y + 72"
        class="ciphers-flow-domain ciphers-flow-accent"
        :style="{ fontSize: `${inputSize}px` }"
      >
        <tspan :key="sample.plaintext" class="ciphers-derive">{{ sample.plaintext }}</tspan>
      </text>
      <text :x="CALL.x + 18" :y="CALL.y + 104" class="ciphers-flow-mono">
        create("{{ sample.entry.slug }}")
      </text>
      <text :x="CALL.x + 18" :y="CALL.y + 130" class="ciphers-flow-label">
        {{ clip(optionLiteral(sample.options) || "no options", 40) }}
      </text>
    </g>

    <g
      v-for="node in nodes"
      :key="node.key"
      class="ciphers-flow-node"
      :class="{ 'ciphers-flow-dim': !node.active }"
    >
      <rect :x="NODE.x" :y="node.y" :width="NODE.w" :height="NODE.h" rx="7" />
      <text :x="NODE.x + 14" :y="node.y + 23" class="ciphers-flow-small">{{ node.label }}</text>
    </g>

    <g class="ciphers-flow-node">
      <rect :x="RESULT.x" :y="RESULT.y" :width="RESULT.w" :height="RESULT.h" rx="10" />
      <text :x="RESULT.x + 18" :y="RESULT.y + 28" class="ciphers-flow-label">CipherResult</text>
      <text
        :x="RESULT.x + RESULT.w - 18"
        :y="RESULT.y + 28"
        text-anchor="end"
        class="ciphers-flow-mono"
      >
        {{ sample.entry.info.label }}
      </text>
      <line
        :x1="RESULT.x + 1"
        :x2="RESULT.x + RESULT.w - 1"
        :y1="RESULT.y + 44"
        :y2="RESULT.y + 44"
        class="ciphers-flow-rule"
      />
      <text :x="RESULT.x + 18" :y="RESULT.y + 68" class="ciphers-flow-label">text</text>
      <text
        :x="RESULT.x + 18"
        :y="RESULT.y + 96"
        class="ciphers-flow-domain ciphers-flow-accent"
        :style="{ fontSize: `${outputSize}px` }"
      >
        <tspan :key="output" class="ciphers-derive">{{ output }}</tspan>
      </text>
      <template v-for="(row, rowIndex) in rows" :key="`${sample.entry.slug}-${rowIndex}`">
        <g v-for="(field, column) in row" :key="field.label" class="ciphers-derive">
          <text
            :x="RESULT.x + 18 + column * 140"
            :y="RESULT.y + 136 + rowIndex * 56"
            class="ciphers-flow-label"
          >
            {{ field.label }}
          </text>
          <text
            :x="RESULT.x + 18 + column * 140"
            :y="RESULT.y + 156 + rowIndex * 56"
            class="ciphers-flow-small"
          >
            {{ field.value }}
          </text>
        </g>
      </template>
    </g>
  </svg>
</template>
