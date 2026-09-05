<script setup lang="ts">
import { CipherError, create, type CipherOption } from "@agntn/ciphers";
import { bruteRows, frequencyView, type BruteRow, type FrequencyView } from "../../utils/analysis";
import { CIPHERS, cipherEntry, familyLabel } from "../../utils/ciphers";
import { optionFlags, optionLiteral, shellArg } from "../../utils/format";

type Operation = "encode" | "decode" | "brute" | "frequency";

const OPERATIONS: ReadonlyArray<{ key: Operation; label: string; tool: string; command: string }> =
  [
    { key: "encode", label: "Encode", tool: "cipher_encode", command: "encode" },
    { key: "decode", label: "Decode", tool: "cipher_decode", command: "decode" },
    { key: "brute", label: "Brute force", tool: "cipher_brute_caesar", command: "brute" },
    { key: "frequency", label: "Frequency", tool: "cipher_frequency", command: "frequency" },
  ];

const route = useRoute();
const router = useRouter();

const operation = ref<Operation>("encode");
const cipherName = ref<string>("vigenere");
const text = ref("ATTACK AT DAWN");
const values = reactive<Record<string, string>>({ key: "LEMON" });
const preserveCase = ref(true);
const stripNonAlpha = ref(false);
const language = ref<"en" | "pl">("en");

const entry = computed(() => cipherEntry(cipherName.value) ?? CIPHERS[0]!);
const optionFields = computed<CipherOption[]>(() => entry.value.info.options);
const isTransform = computed(() => operation.value === "encode" || operation.value === "decode");

/** Typed option values. Empty fields are left out so the cipher applies its own defaults. */
const options = computed<Record<string, unknown>>(() => {
  const out: Record<string, unknown> = {};
  for (const field of optionFields.value) {
    const raw = values[field.name]?.trim() ?? "";
    if (raw === "") {
      continue;
    }
    out[field.name] = field.type === "number" ? Number(raw) : raw;
  }
  if (!preserveCase.value) {
    out.preserveCase = false;
  }
  if (stripNonAlpha.value) {
    out.stripNonAlpha = true;
  }
  return out;
});

interface TransformAnswer {
  kind: "transform";
  text: string;
  options: Record<string, unknown>;
  normalizedInput?: string;
}
interface BruteAnswer {
  kind: "brute";
  rows: BruteRow[];
}
interface FrequencyAnswer extends FrequencyView {
  kind: "frequency";
}
interface ErrorAnswer {
  kind: "error";
  name: string;
  message: string;
}
type Answer = TransformAnswer | BruteAnswer | FrequencyAnswer | ErrorAnswer | null;

const answer = computed<Answer>(() => {
  try {
    if (operation.value === "brute") {
      return { kind: "brute", rows: bruteRows(text.value) };
    }
    if (operation.value === "frequency") {
      const view = frequencyView(text.value, language.value);
      return view ? { kind: "frequency", ...view } : null;
    }
    const result = create(entry.value.slug)[operation.value](text.value, options.value);
    return {
      kind: "transform",
      text: result.text,
      options: result.options,
      normalizedInput: result.normalizedInput,
    };
  } catch (error) {
    return {
      kind: "error",
      name: error instanceof CipherError ? error.name : "Error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
});

const current = computed(() => OPERATIONS.find((row) => row.key === operation.value)!);

/** The same call as one CLI line. */
const cliLine = computed(() => {
  if (operation.value === "brute") {
    return `ciphers brute ${shellArg(text.value)}`;
  }
  if (operation.value === "frequency") {
    return `ciphers frequency ${shellArg(text.value)} --lang ${language.value}`;
  }
  const flags = optionFlags(
    Object.fromEntries(optionFields.value.map((field) => [field.name, values[field.name] ?? ""])),
  );
  return `ciphers ${current.value.command} ${entry.value.slug} ${shellArg(text.value)}${flags ? ` ${flags}` : ""}`;
});

/** The same call as a tool invocation, the JSON an MCP client sends. */
const toolCall = computed(() => {
  const args: Record<string, unknown> =
    operation.value === "brute"
      ? { text: text.value }
      : operation.value === "frequency"
        ? { text: text.value, language: language.value }
        : { cipher: entry.value.slug, text: text.value, ...options.value };
  return JSON.stringify({ name: current.value.tool, arguments: args }, null, 2);
});

function selectCipher(slug: string) {
  cipherName.value = slug;
  for (const key of Object.keys(values)) {
    delete values[key];
  }
  const sample = cipherEntry(slug);
  if (sample) {
    for (const [name, value] of Object.entries(sample.options)) {
      values[name] = String(value);
    }
  }
}

function loadSample(slug: string) {
  selectCipher(slug);
  const sample = cipherEntry(slug);
  if (sample) {
    text.value = sample.sample;
  }
  if (!isTransform.value) {
    operation.value = "encode";
  }
}

const copiedKey = ref<string | null>(null);
async function copy(key: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    return;
  }
  copiedKey.value = key;
  setTimeout(() => {
    if (copiedKey.value === key) {
      copiedKey.value = null;
    }
  }, 1200);
}

/** Query in, state out. Only values the form knows are read, the rest of the query is ignored. */
function readQuery(query: Record<string, unknown>) {
  const op = String(query.op ?? "");
  if (OPERATIONS.some((row) => row.key === op)) {
    operation.value = op as Operation;
  }
  const cipher = String(query.cipher ?? "");
  const known = cipherEntry(cipher);
  if (known) {
    selectCipher(cipher);
    for (const field of known.info.options) {
      const value = query[field.name];
      if (typeof value === "string") {
        values[field.name] = value;
      }
    }
  }
  if (typeof query.text === "string") {
    text.value = query.text;
  }
  if (query.preserveCase === "0") {
    preserveCase.value = false;
  }
  if (query.stripNonAlpha === "1") {
    stripNonAlpha.value = true;
  }
  if (query.lang === "pl") {
    language.value = "pl";
  }
}

const shareQuery = computed(() => {
  const query: Record<string, string> = { op: operation.value, text: text.value };
  if (isTransform.value) {
    query.cipher = entry.value.slug;
    for (const field of optionFields.value) {
      const value = values[field.name]?.trim();
      if (value) {
        query[field.name] = value;
      }
    }
    if (!preserveCase.value) {
      query.preserveCase = "0";
    }
    if (stripNonAlpha.value) {
      query.stripNonAlpha = "1";
    }
  }
  if (operation.value === "frequency") {
    query.lang = language.value;
  }
  return query;
});

/** Deep link once after mount. A prerendered page hydrates with an empty query at first. */
function applyDeepLink() {
  const stop = watch(
    () => route.query,
    (query) => {
      readQuery(query as Record<string, unknown>);
      stop();
    },
    { once: true, flush: "post" },
  );
  if (Object.keys(route.query).length > 0) {
    stop();
    readQuery(route.query as Record<string, unknown>);
  }
}

onMounted(() => {
  applyDeepLink();
  watch(shareQuery, (query) => {
    void router.replace({ query });
  });
});

const shareLink = computed(() => {
  if (!import.meta.client) {
    return "";
  }
  const url = new URL(window.location.href);
  url.search = new URLSearchParams(shareQuery.value).toString();
  return url.toString();
});
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
    <form class="ciphers-frame flex flex-col gap-5 rounded-xl p-5" @submit.prevent>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="ciphers-seg" role="group" aria-label="Operation">
          <button
            v-for="row in OPERATIONS"
            :key="row.key"
            type="button"
            :aria-pressed="operation === row.key"
            @click="operation = row.key"
          >
            {{ row.label }}
          </button>
        </div>
      </div>

      <label v-if="isTransform" class="flex flex-col gap-1.5">
        <span class="ciphers-eyebrow">cipher</span>
        <select
          class="ciphers-field"
          :value="cipherName"
          @change="selectCipher(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="cipher in CIPHERS" :key="cipher.slug" :value="cipher.slug">
            {{ cipher.info.label }} · {{ familyLabel(cipher.info.family) }}
          </option>
        </select>
      </label>
      <p v-if="isTransform" class="-mt-3 text-xs leading-5 text-dimmed">
        {{ entry.info.description }}
      </p>

      <label class="flex flex-col gap-1.5">
        <span class="ciphers-eyebrow">{{ operation === "decode" ? "ciphertext" : "text" }}</span>
        <textarea v-model="text" class="ciphers-textarea" spellcheck="false" />
      </label>

      <div v-if="isTransform && optionFields.length > 0" class="grid gap-3 sm:grid-cols-2">
        <label v-for="field in optionFields" :key="field.name" class="flex flex-col gap-1.5">
          <span class="ciphers-eyebrow"
            >{{ field.name
            }}<span class="normal-case tracking-normal text-dimmed">{{
              field.required
                ? " · required"
                : field.default !== undefined && field.default !== ""
                  ? ` · default ${field.default}`
                  : ""
            }}</span></span
          >
          <input
            v-model="values[field.name]"
            class="ciphers-field"
            :type="field.type === 'number' ? 'number' : 'text'"
            :placeholder="field.description"
            spellcheck="false"
            autocomplete="off"
          />
        </label>
      </div>

      <div v-if="isTransform" class="flex flex-wrap gap-x-6 gap-y-1">
        <label class="ciphers-check">
          <input v-model="preserveCase" type="checkbox" />
          preserveCase
        </label>
        <label class="ciphers-check">
          <input v-model="stripNonAlpha" type="checkbox" />
          stripNonAlpha
        </label>
      </div>

      <label v-if="operation === 'frequency'" class="flex flex-col gap-1.5">
        <span class="ciphers-eyebrow">reference language</span>
        <select v-model="language" class="ciphers-field">
          <option value="en">English</option>
          <option value="pl">Polish</option>
        </select>
      </label>

      <div>
        <p class="ciphers-eyebrow mb-2">samples</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="cipher in CIPHERS"
            :key="cipher.slug"
            type="button"
            class="ciphers-chip"
            :class="{ 'ciphers-chip-ok': isTransform && cipher.slug === entry.slug }"
            @click="loadSample(cipher.slug)"
          >
            {{ cipher.slug }}
          </button>
        </div>
      </div>
    </form>

    <div class="flex min-w-0 flex-col gap-4">
      <div class="ciphers-frame overflow-hidden rounded-xl">
        <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
          <p class="font-mono text-xs text-muted">
            <span class="text-dimmed">{{ isTransform ? `create("${entry.slug}")` : "caesar" }}</span>
            <span class="ms-2 text-highlighted">.{{ operation === "brute" ? "decode × 25" : operation === "frequency" ? "analyzeFrequency" : operation }}</span>
          </p>
          <button
            v-if="answer && answer.kind === 'transform'"
            type="button"
            class="ciphers-copy"
            :data-copied="copiedKey === 'result'"
            @click="copy('result', answer.text)"
          >
            <UIcon :name="copiedKey === 'result' ? 'i-solar-unread-linear' : 'i-solar-copy-linear'" class="size-3.5" />
            {{ copiedKey === "result" ? "copied" : "copy" }}
          </button>
        </div>

        <template v-if="answer && answer.kind === 'transform'">
          <pre class="ciphers-output">{{ answer.text || " " }}</pre>
          <dl class="ciphers-kv border-t border-muted">
            <dt>cipher</dt>
            <dd>{{ entry.slug }} · {{ familyLabel(entry.info.family) }}</dd>
            <dt>operation</dt>
            <dd>{{ operation }}</dd>
            <dt>options</dt>
            <dd class="font-mono text-[13px]">{{ optionLiteral(answer.options) || "{}" }}</dd>
            <template v-if="answer.normalizedInput !== undefined">
              <dt>normalized</dt>
              <dd class="font-mono text-[13px]">{{ answer.normalizedInput }}</dd>
            </template>
          </dl>
        </template>

        <ol v-else-if="answer && answer.kind === 'brute'" class="ciphers-brute max-h-none!">
          <li v-for="row in answer.rows" :key="row.shift" class="ciphers-brute-row">
            <span class="text-dimmed">shift={{ String(row.shift).padStart(2) }}</span>
            <span class="text-dimmed">→</span>
            <span class="text-highlighted">{{ row.text }}</span>
          </li>
        </ol>

        <div v-else-if="answer && answer.kind === 'frequency'" class="px-4 py-4">
          <p class="mb-3 font-mono text-[11px] text-dimmed">
            {{ answer.total }} letters
            <template v-if="answer.ic !== undefined">
              · index of coincidence {{ answer.ic.toFixed(4) }} (English ~0.067, uniform ~0.038)
            </template>
          </p>
          <ol class="space-y-1.5">
            <li
              v-for="bar in answer.bars"
              :key="bar.letter"
              class="flex items-center gap-3 font-mono text-xs"
            >
              <span class="w-3 text-highlighted">{{ bar.letter }}</span>
              <span class="ciphers-bar-track">
                <span class="ciphers-bar" :style="{ width: `${bar.width}%` }" />
              </span>
              <span class="w-8 text-right text-dimmed">{{ bar.count }}</span>
            </li>
          </ol>
          <dl class="mt-4 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 font-mono text-[11px]">
            <dt class="text-dimmed">expected</dt>
            <dd class="tracking-[0.2em] text-muted">{{ answer.expected }}</dd>
            <dt class="text-dimmed">actual</dt>
            <dd class="tracking-[0.2em] text-highlighted">{{ answer.actual }}</dd>
          </dl>
        </div>

        <div v-else-if="answer && answer.kind === 'error'" class="px-4 py-5">
          <p class="ciphers-state ciphers-state-failed mb-2">{{ answer.name }}</p>
          <p class="text-sm text-muted">{{ answer.message }}</p>
        </div>

        <p v-else class="px-4 py-6 text-sm text-dimmed">No A to Z letters in the text. Nothing to count.</p>
      </div>

      <div class="ciphers-frame overflow-hidden rounded-xl">
        <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
          <p class="font-mono text-xs text-muted">
            <span class="text-dimmed">$</span>
            <span class="ms-2 text-highlighted">CLI</span>
          </p>
          <button
            type="button"
            class="ciphers-copy"
            :data-copied="copiedKey === 'cli'"
            @click="copy('cli', cliLine)"
          >
            <UIcon :name="copiedKey === 'cli' ? 'i-solar-unread-linear' : 'i-solar-copy-linear'" class="size-3.5" />
            {{ copiedKey === "cli" ? "copied" : "copy" }}
          </button>
        </div>
        <pre class="ciphers-rotating"><code>{{ cliLine }}</code></pre>
      </div>

      <div class="ciphers-frame overflow-hidden rounded-xl">
        <div class="flex items-center justify-between gap-3 border-b border-muted px-4 py-3">
          <p class="font-mono text-xs text-muted">
            <span class="text-dimmed">tool</span>
            <span class="ms-2 text-highlighted">{{ current.tool }}</span>
          </p>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="ciphers-copy"
              :data-copied="copiedKey === 'link'"
              @click="copy('link', shareLink)"
            >
              <UIcon :name="copiedKey === 'link' ? 'i-solar-unread-linear' : 'i-solar-arrow-right-up-linear'" class="size-3.5" />
              {{ copiedKey === "link" ? "copied" : "permalink" }}
            </button>
            <button
              type="button"
              class="ciphers-copy"
              :data-copied="copiedKey === 'tool'"
              @click="copy('tool', toolCall)"
            >
              <UIcon :name="copiedKey === 'tool' ? 'i-solar-unread-linear' : 'i-solar-copy-linear'" class="size-3.5" />
              {{ copiedKey === "tool" ? "copied" : "copy" }}
            </button>
          </div>
        </div>
        <pre class="ciphers-rotating"><code>{{ toolCall }}</code></pre>
      </div>
    </div>
  </div>
</template>
