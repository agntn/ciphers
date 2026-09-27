<script setup lang="ts">
import type { LandingSample } from "../../composables/useLandingCipher";
import { CIPHERS, familyLabel, keyspaceParts, registryPosition } from "../../utils/ciphers";
import { optionLiteral } from "../../utils/format";
import { outputUnits, wiring } from "../../utils/wiring";

const props = defineProps<{ sample: LandingSample; samples: readonly LandingSample[] }>();
const emit = defineEmits<{ step: [delta: number]; pause: [paused: boolean] }>();

const { copied, copy } = useCopied();

const entry = computed(() => props.sample.entry);
const block = computed(() => entry.value.info.category === "block");
const options = computed(() => optionLiteral(props.sample.options));
const call = computed(() => {
  const head = `encode("${entry.value.slug}", "${props.sample.plaintext}"`;
  return options.value ? `${head}, ${options.value})` : `${head})`;
});
const keyspace = computed(() => keyspaceParts(entry.value.info));
const roundtrip = computed(() => props.sample.roundtrip === props.sample.plaintext);

/** A block cipher answers in hex, so its tape has one cell per byte; everything else, one per character. */
const input = computed(() => [...props.sample.plaintext]);
const output = computed(() => outputUnits(props.sample.ciphertext, block.value));
const unit = computed(() => (block.value ? "bytes" : "chars"));

/** Which input characters fix which output cells, measured by the library on this sample. */
const groups = computed(() =>
  wiring(entry.value.slug, props.sample.plaintext, props.sample.options, block.value),
);
const groupOfInput = computed(() => {
  const owner = new Map<number, number>();
  groups.value.forEach((group, index) => {
    for (const cell of group.inputs) if (!owner.has(cell)) owner.set(cell, index);
  });
  return owner;
});
const groupOfOutput = computed(() => {
  const owner = new Map<number, number>();
  groups.value.forEach((group, index) => {
    for (const cell of group.outputs) owner.set(cell, index);
  });
  return owner;
});
/** The wiring in words: letter for letter, moved, fanned out, or mixed in blocks. */
const shape = computed(() => {
  const list = groups.value;
  if (list.every((group) => group.inputs.length === 1 && group.outputs.length === 1)) {
    const moved = list.some((group) => group.inputs[0] !== group.outputs[0]);
    return moved ? "same letters, moved" : "one letter, one cell";
  }
  if (list.length === 1) return `all ${list[0]!.inputs.length} into all ${list[0]!.outputs.length}`;
  const widest = Math.max(...list.map((group) => group.outputs.length));
  const tag = list.at(-1)!.inputs.length === input.value.length && list.length > 1;
  if (tag) return `letter by letter, then a ${list.at(-1)!.outputs.length}-byte tag`;
  if (list.every((group) => group.inputs.length === 1)) {
    const same = list.every((group) => group.outputs.length === widest);
    return same ? `one letter, ${widest} cells` : `one letter, up to ${widest} cells`;
  }
  return `${list.length} groups for ${input.value.length} letters`;
});

/** The group under the pointer; its wires and cells light up. */
const lit = ref<number | undefined>(undefined);

const board = useTemplateRef<HTMLElement>("board");
interface Wire {
  d: string;
  group: number;
  node?: { x: number; y: number };
}
const wires = ref<Wire[]>([]);
const size = ref({ width: 0, height: 0 });

/**
 * Lays the wires from the cells as they sit on screen: straight down for one letter to one, through a
 * square node where a group joins several letters or fans out to several cells. Client only; the
 * tapes render without wires until the page is live.
 */
function layWires() {
  const frame = board.value;
  if (!frame) return;
  const origin = frame.getBoundingClientRect();
  size.value = { width: origin.width, height: origin.height };
  const bottom = (cell: HTMLElement) => {
    const box = cell.getBoundingClientRect();
    return { x: box.left - origin.left + box.width / 2, y: box.bottom - origin.top };
  };
  const top = (cell: HTMLElement) => {
    const box = cell.getBoundingClientRect();
    return { x: box.left - origin.left + box.width / 2, y: box.top - origin.top };
  };
  const cellsIn = [...frame.querySelectorAll<HTMLElement>("[data-in]")];
  const cellsOut = [...frame.querySelectorAll<HTMLElement>("[data-out]")];
  const next: Wire[] = [];
  groups.value.forEach((group, index) => {
    const from = group.inputs.map((cell) => cellsIn[cell]).filter(Boolean).map((cell) => bottom(cell!));
    const to = group.outputs.map((cell) => cellsOut[cell]).filter(Boolean).map((cell) => top(cell!));
    if (from.length === 0 || to.length === 0) return;
    if (from.length === 1 && to.length === 1) {
      const [a, b] = [from[0]!, to[0]!];
      if (a.x > origin.width - 12 || b.x > origin.width - 12) return;
      const mid = (a.y + b.y) / 2;
      next.push({ d: `M${a.x} ${a.y}C${a.x} ${mid} ${b.x} ${mid} ${b.x} ${b.y}`, group: index });
      return;
    }
    const visible = to.filter((point) => point.x < origin.width - 12);
    if (visible.length === 0) return;
    const targets = visible;
    const mid = (from[0]!.y + to[0]!.y) / 2;
    if (from.length > 3) {
      /** Many letters feed one group: stubs down to a bus under the tape, one line from the bus on. */
      const busY = from[0]!.y + 9;
      const left = Math.min(...from.map((point) => point.x));
      const right = Math.max(...from.map((point) => point.x));
      for (const a of from) next.push({ d: `M${a.x} ${a.y}V${busY}`, group: index });
      next.push({ d: `M${left} ${busY}H${right}`, group: index });
      const nodeX = Math.min(
        Math.max((left + right) / 2, targets[0]!.x),
        targets.at(-1)!.x,
      );
      const node = { x: nodeX, y: mid + 6 };
      const start = Math.min(Math.max(nodeX, left), right);
      next.push({ d: `M${start} ${busY}C${start} ${node.y} ${node.x} ${busY} ${node.x} ${node.y}`, group: index });
      for (const b of targets) {
        next.push({ d: `M${node.x} ${node.y}C${node.x} ${b.y} ${b.x} ${node.y} ${b.x} ${b.y}`, group: index });
      }
      next.push({ d: "", group: index, node });
      return;
    }
    const all = [...from, ...targets];
    const node = {
      x: all.reduce((sum, point) => sum + point.x, 0) / all.length,
      y: mid,
    };
    for (const a of from) {
      next.push({ d: `M${a.x} ${a.y}C${a.x} ${node.y} ${node.x} ${a.y} ${node.x} ${node.y}`, group: index });
    }
    for (const b of targets) {
      next.push({ d: `M${node.x} ${node.y}C${node.x} ${b.y} ${b.x} ${node.y} ${b.x} ${b.y}`, group: index });
    }
    next.push({ d: "", group: index, node });
  });
  wires.value = next;
}

watch(
  () => entry.value.slug,
  () => nextTick(layWires),
);
let observer: ResizeObserver | undefined;
onMounted(() => {
  layWires();
  observer = new ResizeObserver(() => layWires());
  if (board.value) observer.observe(board.value);
});
onUnmounted(() => observer?.disconnect());

/** One tick per cipher in the registry, the sample's family open. */
const ticks = computed(() =>
  CIPHERS.map((cipher) => ({
    slug: cipher.slug,
    open: cipher.info.family === entry.value.info.family,
    current: cipher.slug === entry.value.slug,
  })),
);
const kin = computed(() => ticks.value.filter((tick) => tick.open).length);
</script>

<template>
  <section
    class="tool-console console-wide landing-tape"
    aria-label="One sentence through one cipher"
    @mouseenter="emit('pause', true)"
    @mouseleave="emit('pause', false)"
    @focusin="emit('pause', true)"
    @focusout="emit('pause', false)"
  >
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <UTooltip :text="call">
        <span class="console-title tape-call" tabindex="0"
          ><span class="console-tag">Call</span>encode(<span class="tok-str"
            >"{{ entry.slug }}"</span
          >, <span class="tok-str">"{{ sample.plaintext }}"</span
          ><template v-if="options">, …</template>)</span
        >
      </UTooltip>
      <span class="console-meta"
        >{{ familyLabel(entry.info.family).toLowerCase() }} ·
        {{ String(registryPosition(entry.slug)).padStart(2, "0") }} / {{ CIPHERS.length }}</span
      >
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true">
      <span :key="entry.slug" class="console-cursor" />
    </div>

    <div class="console-band console-subject-band tape-subject">
      <div :key="entry.slug" class="console-scan" aria-hidden="true" />
      <div class="tape-left">
        <div class="console-identity-block">
          <ConsoleReticle :key="entry.slug" :icon="entry.icon" />
          <!-- Every sample's name sits in the same cell, hidden, so the band keeps the tallest one's height. -->
          <div class="tape-names">
            <div
              v-for="other in samples"
              :key="other.entry.slug"
              class="console-name"
              :class="{ 'tape-sizer': other.entry.slug !== entry.slug }"
              :aria-hidden="other.entry.slug !== entry.slug ? 'true' : undefined"
            >
              <span class="console-label"
                >Cipher / <span class="console-label-key">{{ other.entry.info.category }}</span></span
              >
              <h3>{{ other.entry.info.label }}</h3>
              <p class="console-about">{{ other.entry.blurb }}.</p>
            </div>
          </div>
        </div>

        <!-- Plaintext on top, ciphertext below, and the wires the library says join them. -->
        <div ref="board" class="tape-board" @mouseleave="lit = undefined">
          <p class="console-label console-rule-title">
            <span>Wiring <span aria-hidden="true">[ which letters fix which output ]</span></span>
            <span class="console-mark" aria-hidden="true" />
            <UButton
              color="neutral"
              variant="subtle"
              :icon="copied === 'out' ? 'i-lucide-check' : 'i-lucide-copy'"
              :label="copied === 'out' ? 'copied' : 'copy'"
              :aria-label="copied === 'out' ? 'Copied' : 'Copy the ciphertext'"
              @click="copy('out', sample.ciphertext)"
            />
          </p>
          <div class="tape-row">
            <span class="console-tag">In</span>
            <span class="tape-cells" :aria-label="sample.plaintext">
              <span
                v-for="(cell, index) in input"
                :key="index"
                data-in
                class="tape-cell"
                :data-blank="cell === ' ' ? '' : undefined"
                :data-lit="lit !== undefined && groups[lit]?.inputs.includes(index) ? '' : undefined"
                aria-hidden="true"
                @mouseenter="lit = groupOfInput.get(index)"
                >{{ cell === " " ? "·" : cell }}</span
              >
            </span>
            <span class="tape-count">{{ input.length }} chars</span>
          </div>
          <svg
            class="tape-wires"
            :viewBox="`0 0 ${size.width} ${size.height}`"
            :width="size.width"
            :height="size.height"
            aria-hidden="true"
          >
            <g :key="entry.slug">
              <template v-for="(wire, index) in wires" :key="index">
                <rect
                  v-if="wire.node"
                  class="tape-node"
                  :data-lit="wire.group === lit ? '' : undefined"
                  :x="wire.node.x - 3"
                  :y="wire.node.y - 3"
                  width="6"
                  height="6"
                />
                <path
                  v-else
                  class="tape-wire"
                  :data-lit="wire.group === lit ? '' : undefined"
                  :d="wire.d"
                  pathLength="1"
                  :style="{ animationDelay: `${Math.min(wire.group * 30, 420)}ms` }"
                />
              </template>
            </g>
          </svg>
          <div class="tape-row tape-row-out">
            <span class="console-tag tape-tag-out">Out</span>
            <span :key="entry.slug" class="tape-cells tape-cells-out" :aria-label="sample.ciphertext">
              <span
                v-for="(cell, index) in output"
                :key="index"
                data-out
                class="tape-cell"
                :data-byte="block ? '' : undefined"
                :data-blank="cell === ' ' ? '' : undefined"
                :data-lit="lit !== undefined && groups[lit]?.outputs.includes(index) ? '' : undefined"
                :style="{ animationDelay: `${Math.min(index * 12, 480)}ms` }"
                aria-hidden="true"
                @mouseenter="lit = groupOfOutput.get(index)"
                >{{ cell === " " ? "·" : cell }}</span
              >
            </span>
            <span class="tape-count">{{ output.length }} {{ unit }}</span>
          </div>
        </div>
      </div>

      <div class="console-readout">
        <svg class="console-link" viewBox="0 0 32 40" fill="none" aria-hidden="true">
          <circle cx="3" cy="12" r="2.5" />
          <path d="M5.5 12H14L22 20H32" />
        </svg>
        <dl :key="entry.slug" class="console-readout-rows console-animate">
          <div>
            <dt>Options</dt>
            <dd>
              <UTooltip v-if="options" :text="options">
                <span class="tape-line" tabindex="0">{{ options }}</span>
              </UTooltip>
              <span v-else class="tape-none">none</span>
            </dd>
          </div>
          <div>
            <dt>Keyspace</dt>
            <dd>
              <UTooltip v-if="keyspace" :text="keyspace.full">
                <span class="tape-line" tabindex="0">{{ keyspace.short }}</span>
              </UTooltip>
              <span v-else class="tape-none">not stated</span>
            </dd>
          </div>
          <div>
            <dt>Groups</dt>
            <dd>
              <span class="tape-line">{{ shape }}</span>
            </dd>
          </div>
          <div>
            <dt>Round trip</dt>
            <dd :class="roundtrip ? 'console-accent' : 'tape-reshaped'">
              <span v-if="roundtrip" class="tape-line">plaintext comes back</span>
              <UTooltip v-else :text="`decode gives ${sample.roundtrip}, the cipher reshapes its input`">
                <span class="tape-line" tabindex="0">back as "{{ sample.roundtrip }}"</span>
              </UTooltip>
            </dd>
          </div>
        </dl>
        <div class="console-gauge" :aria-label="`${kin} of ${CIPHERS.length} ciphers in this family`">
          <span class="console-ticks" aria-hidden="true">
            <span
              v-for="(tick, index) in ticks"
              :key="tick.slug"
              :class="tick.open ? 'console-tick-open' : 'console-tick-closed'"
              :style="{ animationDelay: `${index * 12}ms` }"
            />
          </span>
          <span class="console-gauge-read">family {{ kin }} / {{ CIPHERS.length }}</span>
        </div>
      </div>
    </div>

    <footer class="console-footer console-footer-plain">
      <NuxtLink :to="entry.to" class="tape-link"
        ><span aria-hidden="true">→ </span>{{ entry.info.label }}<span> · {{ entry.to }}</span></NuxtLink
      >
      <div class="console-controls" aria-label="Sample ciphers">
        <UButton
          color="neutral"
          variant="subtle"
          square
          icon="i-lucide-chevron-left"
          aria-label="Previous cipher"
          @click="emit('step', -1)"
        />
        <span>Cipher</span>
        <UButton
          color="neutral"
          variant="subtle"
          square
          icon="i-lucide-chevron-right"
          aria-label="Next cipher"
          @click="emit('step', 1)"
        />
      </div>
    </footer>
  </section>
</template>

<style scoped>
.tape-call {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tape-names {
  display: grid;
  min-width: 0;
}
.tape-names > .console-name {
  grid-area: 1 / 1;
}
.tape-sizer {
  visibility: hidden;
}
.tape-line {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tape-none {
  color: var(--ui-text-dimmed);
}
.tape-reshaped {
  color: var(--ui-text-muted);
}
.landing-tape :deep(.console-readout-rows > div) {
  grid-template-columns: 6.5rem minmax(0, 1fr);
}
/* The left column: the cipher, then its wiring right under it, so the band has no empty corner. */
.tape-left {
  display: grid;
  gap: 18px;
  min-width: 0;
}
.tape-board {
  position: relative;
  display: grid;
  grid-template-rows: auto auto 52px auto;
  min-width: 0;
}
.tape-board > .console-rule-title {
  margin: 0 0 10px;
}
.tape-wires {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  pointer-events: none;
}
.tape-wire {
  fill: none;
  stroke: color-mix(in srgb, var(--ui-text-muted) 45%, var(--ui-bg));
  stroke-width: 1;
  stroke-dasharray: 1;
  animation: tape-draw 0.5s ease-out both;
  transition: stroke 0.15s ease;
}
.tape-wire[data-lit] {
  stroke: var(--console-accent);
}
.tape-node {
  fill: var(--ui-bg);
  stroke: var(--console-corner);
  stroke-width: 1;
}
.tape-node[data-lit] {
  fill: var(--console-accent);
  stroke: var(--console-accent);
}
@keyframes tape-draw {
  from {
    stroke-dashoffset: 1;
  }
}
/* A tape: tag, one boxed cell per character or byte, the count at the end. One line, whatever the sample. */
.tape-row {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}
.tape-row > .console-tag {
  justify-self: start;
  margin: 0;
}
.tape-row-out {
  grid-row: 4;
}
.tape-tag-out {
  color: var(--console-accent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--console-accent) 55%, transparent);
}
.tape-cells {
  display: flex;
  gap: 3px;
  min-width: 0;
  overflow: hidden;
  mask-image: linear-gradient(90deg, #000 calc(100% - 24px), transparent);
}
.tape-cell {
  display: grid;
  flex: none;
  place-items: center;
  min-width: 20px;
  height: 24px;
  padding: 0 3px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ui-text-muted);
  background: var(--ui-bg);
  box-shadow: inset 0 0 0 1px var(--console-line);
}
.tape-cell[data-blank] {
  color: var(--ui-text-dimmed);
  box-shadow: inset 0 0 0 1px var(--ui-border-muted);
}
.tape-cell[data-byte] {
  min-width: 26px;
}
.tape-cell[data-lit] {
  color: var(--console-accent) !important;
  box-shadow: inset 0 0 0 1px var(--console-accent);
}
.tape-cells-out > .tape-cell {
  color: var(--ui-text-highlighted);
  animation: tape-in 0.24s ease-out both;
}
.tape-cells-out > .tape-cell[data-blank] {
  color: var(--ui-text-dimmed);
}
@keyframes tape-in {
  from {
    transform: translateY(-4px);
  }
}
.tape-count {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  white-space: nowrap;
  color: var(--ui-text-dimmed);
}
.tape-link {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}
.tape-link > span:last-child {
  color: var(--ui-text-dimmed);
}
.tape-link:hover {
  color: var(--console-accent);
}
.tape-link:focus-visible {
  outline: 1px solid var(--ui-primary);
  outline-offset: 3px;
}
@media (width < 640px) {
  .tape-board > .console-rule-title > .console-mark {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .tape-cells-out > .tape-cell,
  .tape-wire {
    animation: none;
  }
}
</style>
