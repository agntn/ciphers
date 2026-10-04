<script setup lang="ts">
import {
  CipherError,
  analyzeFrequency,
  create,
  estimatePeriod,
  type CipherInfo,
  type FrequencyAnalysis,
  type FrequencyLanguage,
  type PeriodAnalysis,
} from "@agntn/ciphers";
import { OPTION_DESCRIPTIONS, PERIOD_LINES } from "#tool-operations";
import { CIPHERS, cipherEntry, familyLabel, keyspaceParts } from "../../utils/ciphers";
import { optionFlags, optionLiteral, shellArg } from "../../utils/format";
import { jsonTokens, shellTokens } from "../../utils/tokens";
import {
  bruteRows,
  bruteText,
  frequencyText,
  infoText,
  periodText,
  transformText,
} from "../../utils/tools";

type Operation = "encode" | "decode" | "brute" | "frequency" | "period" | "info";

const OPERATIONS: ReadonlyArray<{
  key: Operation;
  label: string;
  tool: string;
  command: string;
  about: string;
}> = [
  {
    key: "encode",
    label: "Encode",
    tool: "ciphers_encode",
    command: "encode",
    about: "create(cipher).encode(text, options): the text through one cipher, options by name.",
  },
  {
    key: "decode",
    label: "Decode",
    tool: "ciphers_decode",
    command: "decode",
    about: "create(cipher).decode(text, options): the same options back, the plaintext out.",
  },
  {
    key: "brute",
    label: "Brute",
    tool: "ciphers_caesar_brute",
    command: "brute",
    about: "Every Caesar shift from 1 to 25, ranked by how much each reads like the language.",
  },
  {
    key: "frequency",
    label: "Frequency",
    tool: "ciphers_frequency",
    command: "frequency",
    about: "analyzeFrequency(text, lang): letter counts, the expected order and the index of coincidence.",
  },
  {
    key: "period",
    label: "Period",
    tool: "ciphers_period_estimate",
    command: "period",
    about:
      "estimatePeriod(text, lang, maxPeriod): Vigenère key lengths by column IoC and Kasiski, with keys for the top three.",
  },
  {
    key: "info",
    label: "Info",
    tool: "ciphers_info",
    command: "info",
    about: "create(cipher).info(): the options a cipher takes, their defaults and the keyspace.",
  },
];

/** Example 1.11 from Stinson's Cryptography: Theory and Practice, the vector in the analysis guide. */
const PERIOD_SAMPLE =
  "CHREEVOAHMAERATBIAXXWTNXBEEOPHBSBQMQEQERBWRVXUOAKXAOSXXWEAHBWGJMMQMNKGRFVGXWTRZXWIAKLXFPSKAUTEMNDCMGTSXMXBTUIADNGMGPSRELXNJELXVRVPRTULHDNQWTWDTYGBPHXTFALJHASVBFXNGLLCHRZBWELEKMSJIKNBHWRJGNMGJSGLXFEYPHAGNRBIEQJTAMRVLCRREMNDGLXRRIMGNSNRWCHRQHAEYEVTAQEBBIPEEWEVKAKOEWADREMXMTBHHCHRTKDNVRZCHRCLQOHPWQAIIWXNRMGWOIIFKEE";

const LANGUAGES: Array<{ label: string; value: FrequencyLanguage }> = [
  { label: "English · en", value: "en" },
  { label: "Polish · pl", value: "pl" },
  { label: "Japanese romaji · ja", value: "ja" },
];

const route = useRoute();
const router = useRouter();

const operation = ref<Operation>("encode");
const cipherName = ref<string>("vigenere");
const text = ref("ATTACK AT DAWN");
const values = reactive<Record<string, string | number>>({ key: "LEMON" });
const preserveCase = ref(true);
const stripNonAlpha = ref(false);
const language = ref<FrequencyLanguage>("en");
const maxPeriod = ref<string | number>("");

const entry = computed(() => cipherEntry(cipherName.value) ?? CIPHERS[0]!);
const optionFields = computed(() => entry.value.info.options);
const needsCipher = computed(
  () => operation.value === "encode" || operation.value === "decode" || operation.value === "info",
);
const isTransform = computed(() => operation.value === "encode" || operation.value === "decode");
const needsLanguage = computed(
  () =>
    operation.value === "brute" || operation.value === "frequency" || operation.value === "period",
);
/** A number field's model turns into a number once something is typed into it. */
function fieldText(value: string | number | undefined): string {
  return String(value ?? "").trim();
}
/** Left empty, the library tries lengths up to its own default. */
const maxPeriodValue = computed(() =>
  fieldText(maxPeriod.value) === "" ? undefined : Number(maxPeriod.value),
);
/** The block and stream ciphers encrypt bytes; case and stripping don't apply to them. */
const lettersOnly = computed(() => entry.value.info.category === "classical");

const cipherItems = CIPHERS.map((cipher) => ({
  label: `${cipher.info.label} · ${cipher.slug}`,
  value: cipher.slug,
  icon: cipher.icon,
}));

/** Typed option values. Empty fields are left out so the cipher applies its own defaults. */
const options = computed<Record<string, string | number | boolean>>(() => {
  const out: Record<string, string | number | boolean> = {};
  for (const field of optionFields.value) {
    const raw = fieldText(values[field.name]);
    if (raw === "") continue;
    out[field.name] = field.type === "number" ? Number(raw) : raw;
  }
  if (lettersOnly.value && !preserveCase.value) out.preserveCase = false;
  if (lettersOnly.value && stripNonAlpha.value) out.stripNonAlpha = true;
  return out;
});

interface TransformAnswer {
  kind: "transform";
  output: string;
  roundtrip: boolean;
  text: string;
}
interface BruteAnswer {
  kind: "brute";
  rows: Array<{ shift: number; text: string }>;
  text: string;
}
interface FrequencyAnswer {
  kind: "frequency";
  analysis: FrequencyAnalysis | undefined;
  text: string;
}
interface PeriodAnswer {
  kind: "period";
  analysis: PeriodAnalysis;
  text: string;
}
interface InfoAnswer {
  kind: "info";
  info: CipherInfo;
  text: string;
}
interface ErrorAnswer {
  kind: "error";
  name: string;
  message: string;
  text: string;
}
type Answer =
  TransformAnswer | BruteAnswer | FrequencyAnswer | PeriodAnswer | InfoAnswer | ErrorAnswer;

const current = computed(() => OPERATIONS.find((row) => row.key === operation.value)!);
const position = computed(() => OPERATIONS.findIndex((row) => row.key === operation.value) + 1);

/**
 * A failed call the way the MCP server reports it: the tool name, then the library's message.
 * Only `CipherError` is an answer; anything else is a bug in the library and is rethrown.
 *
 * @param {unknown} error - What the executor threw.
 * @returns {ErrorAnswer} The failure as the response instrument shows it.
 */
function failure(error: unknown): ErrorAnswer {
  if (!(error instanceof CipherError)) throw error;
  return {
    kind: "error",
    name: error.name,
    message: error.message,
    text: `${current.value.tool} failed: ${error.message}`,
  };
}

const answer = computed<Answer>(() => {
  try {
    switch (operation.value) {
      case "brute":
        return {
          kind: "brute",
          rows: bruteRows(text.value, language.value),
          text: bruteText(text.value, language.value),
        };
      case "frequency":
        return {
          kind: "frequency",
          analysis: analyzeFrequency(text.value, language.value),
          text: frequencyText(text.value, language.value),
        };
      case "period": {
        const response = periodText(text.value, language.value, maxPeriodValue.value);
        const analysis = estimatePeriod(text.value, language.value, maxPeriodValue.value);
        return { kind: "period", analysis, text: response };
      }
      case "info":
        return { kind: "info", info: entry.value.info, text: infoText(entry.value.slug) };
      default: {
        const direction = operation.value === "decode" ? "decode" : "encode";
        const output = transformText(direction, {
          cipher: entry.value.slug,
          text: text.value,
          ...options.value,
        });
        const cipher = create(entry.value.slug);
        let back: string | undefined;
        try {
          back = cipher[direction === "encode" ? "decode" : "encode"](output, options.value).text;
        } catch {
          back = undefined;
        }
        return { kind: "transform", output, roundtrip: back === text.value, text: output };
      }
    }
  } catch (error) {
    return failure(error);
  }
});

/** The same call as one CLI line. */
const cliLine = computed(() => {
  if (needsLanguage.value) {
    const limit =
      operation.value === "period" && maxPeriodValue.value !== undefined
        ? ` --max-period ${fieldText(maxPeriod.value)}`
        : "";
    return `ciphers ${current.value.command} ${shellArg(text.value)} --lang ${language.value}${limit}`;
  }
  if (operation.value === "info") return `ciphers info ${entry.value.slug}`;
  const flags = optionFlags(options.value);
  return `ciphers ${current.value.command} ${entry.value.slug} ${shellArg(text.value)}${flags ? ` ${flags}` : ""}`;
});

const toolArgs = computed((): Record<string, unknown> => {
  if (operation.value === "period" && maxPeriodValue.value !== undefined) {
    return { text: text.value, lang: language.value, maxPeriod: maxPeriodValue.value };
  }
  if (needsLanguage.value) return { text: text.value, lang: language.value };
  if (operation.value === "info") return { cipher: entry.value.slug };
  return { cipher: entry.value.slug, text: text.value, ...options.value };
});

/** The same call as a tool invocation, the JSON an MCP client sends. */
const toolCall = computed(() =>
  JSON.stringify({ name: current.value.tool, arguments: toolArgs.value }, null, 2),
);

/** The call in short form for the response bar. */
const call = computed(() => {
  if (operation.value === "info") return `${current.value.tool}("${entry.value.slug}")`;
  if (needsLanguage.value) return `${current.value.tool}("${text.value}")`;
  return `${current.value.tool}("${entry.value.slug}", "${text.value}")`;
});
const responseTitle = computed(() => `${current.value.tool}(${JSON.stringify(toolArgs.value)})`);

const outputUnit = computed(() => {
  if (answer.value.kind !== "transform") return "";
  return entry.value.info.category !== "classical" && operation.value === "encode"
    ? `${answer.value.output.length / 2} bytes in hex`
    : `${[...answer.value.output].length} chars`;
});

const keyspace = computed(() => keyspaceParts(entry.value.info));

/** The three factors that divide the most trigram distances, as the readout prints them. */
const kasiski = computed(() => {
  if (answer.value.kind !== "period") return "";
  const { distances, factors } = answer.value.analysis;
  if (distances === 0) return "no trigram repeats";
  return factors
    .filter((row) => row.distances > 0)
    .slice(0, 3)
    .map((row) => `${row.factor} (${row.distances})`)
    .join(" · ");
});

/** The cursor and the scan run once per answer, not once per keystroke that changes nothing. */
const scan = ref(0);
watch(
  () => answer.value.text,
  () => {
    scan.value += 1;
  },
);

function selectCipher(slug: string) {
  cipherName.value = slug;
  for (const key of Object.keys(values)) delete values[key];
  const sample = cipherEntry(slug);
  if (sample) {
    for (const [name, value] of Object.entries(sample.options)) values[name] = String(value);
  }
}

/** Open the decode with the key the estimate ranked first, on the same text. */
function decodeWith(key: string) {
  selectCipher("vigenere");
  values.key = key;
  operation.value = "decode";
}

function loadSample(slug: string) {
  selectCipher(slug);
  const sample = cipherEntry(slug);
  if (sample) text.value = sample.sample;
  if (!needsCipher.value) operation.value = "encode";
}

const { copied, copy } = useCopied();

/**
 * Whether a query value names a reference language the library has a table for.
 *
 * @param {unknown} value - Raw `lang` query value.
 * @returns {boolean} True for `en`, `pl` or `ja`.
 */
function isFrequencyLanguage(value: unknown): value is FrequencyLanguage {
  return value === "en" || value === "pl" || value === "ja";
}

/** Query in, state out. Only values the form knows are read, the rest of the query is ignored. */
function readQuery(query: Record<string, unknown>) {
  const op = String(query.op ?? "");
  if (OPERATIONS.some((row) => row.key === op)) operation.value = op as Operation;
  const cipher = String(query.cipher ?? "");
  const known = cipherEntry(cipher);
  if (known) {
    selectCipher(cipher);
    for (const field of known.info.options) {
      const value = query[field.name];
      if (typeof value === "string") values[field.name] = value;
    }
  }
  if (typeof query.text === "string") text.value = query.text;
  if (query.preserveCase === "0") preserveCase.value = false;
  if (query.stripNonAlpha === "1") stripNonAlpha.value = true;
  if (isFrequencyLanguage(query.lang)) language.value = query.lang;
  if (typeof query.maxPeriod === "string" && /^\d+$/.test(query.maxPeriod)) {
    maxPeriod.value = query.maxPeriod;
  }
}

/** Longest option value the address bar carries. A whole book for the book cipher stays out. */
const MAX_SHARED_OPTION = 2000;

const shareQuery = computed(() => {
  const query: Record<string, string> = { op: operation.value };
  if (operation.value !== "info") query.text = text.value;
  if (needsCipher.value) query.cipher = entry.value.slug;
  if (isTransform.value) {
    for (const field of optionFields.value) {
      const value = fieldText(values[field.name]);
      if (value && value.length <= MAX_SHARED_OPTION) query[field.name] = value;
    }
    if (lettersOnly.value && !preserveCase.value) query.preserveCase = "0";
    if (lettersOnly.value && stripNonAlpha.value) query.stripNonAlpha = "1";
  }
  if (needsLanguage.value) query.lang = language.value;
  if (operation.value === "period" && fieldText(maxPeriod.value)) {
    query.maxPeriod = fieldText(maxPeriod.value);
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
  if (!import.meta.client) return "";
  const url = new URL(window.location.href);
  url.search = new URLSearchParams(shareQuery.value).toString();
  return url.toString();
});
</script>

<template>
  <div class="playground">
    <form class="tool-console console-wide" @submit.prevent>
      <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
      <span class="console-cross console-cross-br" aria-hidden="true">+</span>
      <header class="console-bar">
        <span class="console-title"
          ><span class="console-tag">Call</span>{{ current.tool
          }}<span class="console-file"
            >{{ String(position).padStart(2, "0") }} / {{ OPERATIONS.length }}</span
          ></span
        >
        <span class="console-meta" aria-label="Supported hosts: MCP, Pi and OMP"
          >MCP · Pi · OMP</span
        >
        <span class="console-mark" aria-hidden="true" />
      </header>
      <div class="console-ruler" aria-hidden="true"><span class="console-cursor" /></div>

      <div class="console-band playground-band-first playground-columns">
        <div class="playground-column">
          <p class="console-label console-rule-title">
            <span
              >Operation <span aria-hidden="true">[ {{ OPERATIONS.length }} ]</span></span
            >
            <span class="console-mark" aria-hidden="true" />
          </p>
          <div role="group" aria-label="Operation" class="playground-ops console-draw">
            <button
              v-for="(row, index) in OPERATIONS"
              :key="row.key"
              type="button"
              class="console-lead"
              :aria-pressed="operation === row.key"
              @click="operation = row.key"
            >
              <span class="console-tag">{{ row.label }}</span>
              <span>{{ row.tool }}</span>
              <span
                class="console-leader"
                aria-hidden="true"
                :style="{ animationDelay: `${index * 60}ms` }"
              />
            </button>
          </div>
          <p class="console-about playground-tool-about">{{ current.about }}</p>
        </div>

        <div class="playground-column">
          <p class="console-label console-rule-title">
            <span
              >Input
              <span aria-hidden="true"
                >[
                {{
                  [needsCipher && "cipher", operation !== "info" && "text", isTransform && optionFields.length && "options", needsLanguage && "lang", operation === "period" && "maxPeriod"]
                    .filter(Boolean)
                    .join(" · ")
                }}
                ]</span
              ></span
            >
            <span class="console-mark" aria-hidden="true" />
          </p>

          <div class="console-readout">
            <dl class="console-readout-rows">
              <div v-if="needsCipher">
                <dt><label for="playground-cipher">cipher</label></dt>
                <dd>
                  <USelectMenu
                    id="playground-cipher"
                    :model-value="entry.slug"
                    :items="cipherItems"
                    value-key="value"
                    variant="none"
                    :icon="entry.icon"
                    class="w-full"
                    @update:model-value="selectCipher($event as string)"
                  />
                </dd>
              </div>
              <div v-if="operation !== 'info'">
                <dt><label for="playground-text">text</label></dt>
                <dd>
                  <UTextarea
                    id="playground-text"
                    v-model="text"
                    variant="none"
                    :rows="1"
                    autoresize
                    :maxrows="6"
                    spellcheck="false"
                    autocomplete="off"
                    class="w-full"
                  />
                </dd>
              </div>
              <template v-if="isTransform">
                <div v-for="field in optionFields" :key="field.name">
                  <dt>
                    <label :for="`playground-option-${field.name}`"
                      >{{ field.name
                      }}<span v-if="!field.required" class="playground-optional">?</span></label
                    >
                  </dt>
                  <dd>
                    <UInput
                      :id="`playground-option-${field.name}`"
                      v-model="values[field.name]"
                      variant="none"
                      :type="field.type === 'number' ? 'number' : 'text'"
                      :placeholder="field.default !== undefined && field.default !== '' ? `default ${field.default}` : field.description"
                      spellcheck="false"
                      autocomplete="off"
                      class="w-full"
                    />
                  </dd>
                </div>
                <div v-if="lettersOnly">
                  <dt>letters</dt>
                  <dd class="playground-checks">
                    <label class="console-check"
                      ><input v-model="preserveCase" type="checkbox" /> preserveCase</label
                    >
                    <label class="console-check"
                      ><input v-model="stripNonAlpha" type="checkbox" /> stripNonAlpha</label
                    >
                  </dd>
                </div>
              </template>
              <div v-if="needsLanguage">
                <dt><label for="playground-lang">lang</label></dt>
                <dd>
                  <USelectMenu
                    id="playground-lang"
                    v-model="language"
                    :items="LANGUAGES"
                    value-key="value"
                    variant="none"
                    :search-input="false"
                    class="w-full"
                  />
                </dd>
              </div>
              <div v-if="operation === 'period'">
                <dt>
                  <label for="playground-max-period"
                    >maxPeriod<span class="playground-optional">?</span></label
                  >
                </dt>
                <dd>
                  <UInput
                    id="playground-max-period"
                    v-model.number="maxPeriod"
                    variant="none"
                    type="number"
                    :placeholder="OPTION_DESCRIPTIONS.maxPeriod"
                    autocomplete="off"
                    class="w-full"
                  />
                </dd>
              </div>
            </dl>
          </div>

          <div v-if="needsCipher" class="playground-chips" role="group" aria-label="Sample ciphers">
            <UButton
              v-for="cipher in CIPHERS"
              :key="cipher.slug"
              :color="entry.slug === cipher.slug ? 'primary' : 'neutral'"
              variant="chip"
              :icon="cipher.icon"
              :label="cipher.slug"
              :aria-pressed="entry.slug === cipher.slug"
              @click="loadSample(cipher.slug)"
            />
          </div>

          <div
            v-if="operation === 'period'"
            class="playground-chips"
            role="group"
            aria-label="Sample ciphertext"
          >
            <UButton
              :color="text === PERIOD_SAMPLE ? 'primary' : 'neutral'"
              variant="chip"
              icon="i-lucide-key-round"
              label="stinson-1.11"
              :aria-pressed="text === PERIOD_SAMPLE"
              @click="text = PERIOD_SAMPLE"
            />
          </div>

          <p class="playground-note">
            <template v-if="needsCipher"
              >A chip loads the cipher with a sample sentence and options that work, so the fastest
              way to see an error is to load one and break a key.</template
            >
            <template v-else-if="operation === 'period'"
              >Paste a Vigenère ciphertext, a few hundred letters if you have them. Under a hundred
              the ranking is a coin toss. The chip loads Stinson's Example 1.11, key
              hidden.</template
            >
            <template v-else
              >Paste any ciphertext. The letters are what count, everything else is carried
              along.</template
            >
          </p>
        </div>
      </div>

      <div class="console-band playground-columns">
        <div class="playground-column">
          <p class="console-label console-rule-title">
            <span>CLI <span aria-hidden="true">[ same call ]</span></span>
            <span class="console-mark" aria-hidden="true" />
            <UButton
              color="neutral"
              variant="subtle"
              :icon="copied === 'cli' ? 'i-lucide-check' : 'i-lucide-copy'"
              :label="copied === 'cli' ? 'copied' : 'copy'"
              :aria-label="copied === 'cli' ? 'Copied' : 'Copy the CLI line'"
              @click="copy('cli', cliLine)"
            />
          </p>
          <!-- prettier-ignore -->
          <pre class="console-snippet"><code><span class="playground-prompt">$ </span><span v-for="(token, index) in shellTokens(cliLine)" :key="index" :class="token.cls">{{ token.text }}</span></code></pre>
        </div>
        <div class="playground-column">
          <p class="console-label console-rule-title">
            <span>Tool <span aria-hidden="true">[ what an MCP client sends ]</span></span>
            <span class="console-mark" aria-hidden="true" />
            <UButton
              color="neutral"
              variant="subtle"
              :icon="copied === 'tool' ? 'i-lucide-check' : 'i-lucide-copy'"
              :label="copied === 'tool' ? 'copied' : 'copy'"
              :aria-label="copied === 'tool' ? 'Copied' : 'Copy the tool call'"
              @click="copy('tool', toolCall)"
            />
          </p>
          <!-- prettier-ignore -->
          <pre class="console-snippet"><code><span v-for="(token, index) in jsonTokens(toolCall)" :key="index" :class="token.cls">{{ token.text }}</span></code></pre>
        </div>
      </div>

      <footer class="console-footer console-footer-plain">
        <ul class="console-links">
          <li>
            <button type="button" @click="copy('link', shareLink)">
              <span aria-hidden="true">→ </span
              >{{ copied === "link" ? "permalink copied" : "copy the permalink" }}
            </button>
          </li>
        </ul>
        <span class="console-meta">every state is a link</span>
      </footer>
    </form>

    <!-- The call runs from the request down into the response, the way the zone's circuit runs into the request. -->
    <div class="playground-link" aria-hidden="true">
      <svg :key="cliLine" class="hero-circuit" viewBox="0 0 160 56">
        <path class="hero-circuit-rail" d="M80 0V16L96 32V56" />
        <path class="hero-circuit-live" d="M80 0V16L96 32V56" pathLength="1" />
        <path class="hero-circuit-seg" d="M96 38V48" />
        <rect class="hero-circuit-node" x="92.5" y="52.5" width="7" height="7" />
      </svg>
      <span class="hero-circuit-tag">answer</span>
    </div>

    <section class="tool-console console-wide" aria-live="polite">
      <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
      <span class="console-cross console-cross-br" aria-hidden="true">+</span>
      <header class="console-bar">
        <UTooltip :text="responseTitle">
          <span class="console-title playground-call" tabindex="0"
            ><span class="console-tag">{{ current.label }}</span>{{ call }}</span
          >
        </UTooltip>
        <span v-if="answer.kind === 'transform'" class="console-meta">{{ outputUnit }}</span>
        <span v-else-if="answer.kind === 'brute'" class="console-meta">25 shifts · best fit first</span>
        <span v-else-if="answer.kind === 'frequency'" class="console-meta"
          >{{ answer.analysis?.total ?? 0 }} letters · {{ language }}</span
        >
        <span v-else-if="answer.kind === 'period'" class="console-meta"
          >{{ answer.analysis.total }} letters · {{ answer.analysis.language }}</span
        >
        <span v-else-if="answer.kind === 'info'" class="console-meta"
          >{{ answer.info.category }} · {{ answer.info.family }}</span
        >
        <span v-else class="console-meta">{{ answer.name }}</span>
        <span class="console-mark" aria-hidden="true" />
      </header>
      <div class="console-ruler" aria-hidden="true">
        <span :key="scan" class="console-cursor" />
      </div>

      <template v-if="answer.kind === 'transform'">
        <div class="console-band console-subject-band">
          <div :key="scan" class="console-scan" aria-hidden="true" />
          <div class="console-identity-block">
            <ConsoleReticle :key="entry.slug" :icon="entry.icon" />
            <div class="console-name">
              <span class="console-label"
                >{{ operation === "encode" ? "Encoded" : "Decoded" }} /
                <span class="console-label-key">{{ entry.slug }}</span></span
              >
              <h3>{{ entry.info.label }}</h3>
              <p class="console-about">{{ entry.blurb }}.</p>
            </div>
          </div>
          <div class="console-readout">
            <svg class="console-link" viewBox="0 0 32 40" fill="none" aria-hidden="true">
              <circle cx="3" cy="12" r="2.5" />
              <path d="M5.5 12H14L22 20H32" />
            </svg>
            <dl :key="scan" class="console-readout-rows console-animate">
              <div :style="{ animationDelay: '0ms' }">
                <dt>Options</dt>
                <dd>
                  <UTooltip v-if="optionLiteral(options)" :text="optionLiteral(options)">
                    <span class="playground-line" tabindex="0">{{ optionLiteral(options) }}</span>
                  </UTooltip>
                  <span v-else class="playground-none">none</span>
                </dd>
              </div>
              <div :style="{ animationDelay: '45ms' }">
                <dt>In</dt>
                <dd>{{ [...text].length }} chars</dd>
              </div>
              <div :style="{ animationDelay: '90ms' }">
                <dt>Out</dt>
                <dd>{{ outputUnit }}</dd>
              </div>
              <div :style="{ animationDelay: '135ms' }">
                <dt>Round trip</dt>
                <dd :class="answer.roundtrip ? 'console-accent' : 'playground-none'">
                  {{
                    answer.roundtrip
                      ? `${operation === "encode" ? "decode" : "encode"} gives the input back`
                      : "not the input back"
                  }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div class="console-band">
          <p class="console-label console-rule-title">
            <span>{{ operation === "encode" ? "Ciphertext" : "Plaintext" }} <span aria-hidden="true">[ content[0].text ]</span></span>
            <span class="console-mark" aria-hidden="true" />
            <UButton
              color="neutral"
              variant="subtle"
              :icon="copied === 'out' ? 'i-lucide-check' : 'i-lucide-copy'"
              :label="copied === 'out' ? 'copied' : 'copy'"
              :aria-label="copied === 'out' ? 'Copied' : 'Copy the output'"
              @click="copy('out', answer.output)"
            />
          </p>
          <pre :key="scan" class="console-snippet playground-output"><code>{{ answer.output }}</code></pre>
        </div>
      </template>

      <ol
        v-else-if="answer.kind === 'brute'"
        :key="scan"
        class="console-rows console-animate playground-brute"
      >
        <li
          v-for="(row, index) in answer.rows"
          :key="row.shift"
          :data-best="index === 0 ? '' : undefined"
          :style="{ animationDelay: `${Math.min(index * 30, 600)}ms` }"
        >
          <span class="playground-rank">{{ String(index + 1).padStart(2, "0") }}</span>
          <span class="playground-shift">shift={{ String(row.shift).padStart(2, " ") }}</span>
          <span class="playground-brute-text">{{ row.text }}</span>
        </li>
      </ol>

      <template v-else-if="answer.kind === 'frequency'">
        <div class="console-band console-subject-band">
          <div :key="scan" class="console-scan" aria-hidden="true" />
          <div class="console-identity-block">
            <ConsoleReticle icon="i-lucide-chart-column" />
            <div class="console-name">
              <span class="console-label"
                >Counts / <span class="console-label-key">{{ language }}</span></span
              >
              <h3 class="console-name-mono">
                <template v-if="answer.analysis?.ic !== undefined"
                  >IC <span class="playground-valid">{{ answer.analysis.ic.toFixed(4) }}</span></template
                >
                <template v-else>no letters</template>
              </h3>
              <p class="console-about">
                <template v-if="answer.analysis"
                  >Plaintext in this language sits near
                  {{ answer.analysis.referenceIc.toFixed(3) }}, uniform random near 0.038.</template
                >
                <template v-else>Nothing from A to Z in the text, so nothing to count.</template>
              </p>
            </div>
          </div>
          <div v-if="answer.analysis" class="console-readout">
            <svg class="console-link" viewBox="0 0 32 40" fill="none" aria-hidden="true">
              <circle cx="3" cy="12" r="2.5" />
              <path d="M5.5 12H14L22 20H32" />
            </svg>
            <dl :key="scan" class="console-readout-rows console-animate">
              <div>
                <dt>Letters</dt>
                <dd>{{ answer.analysis.total }}</dd>
              </div>
              <div>
                <dt>Expected</dt>
                <dd><span class="playground-line">{{ answer.analysis.reference }}</span></dd>
              </div>
              <div>
                <dt>Actual</dt>
                <dd class="console-accent">
                  <span class="playground-line">{{
                    answer.analysis.counts.map(([letter]) => letter).join("")
                  }}</span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div v-if="answer.analysis" class="console-band">
          <p class="console-label console-rule-title">
            <span>Histogram <span aria-hidden="true">[ A to Z, top six expected marked ]</span></span>
            <span class="console-mark" aria-hidden="true" />
          </p>
          <CipherHistogram :key="scan" :analysis="answer.analysis" />
        </div>
      </template>

      <template v-else-if="answer.kind === 'period'">
        <div class="console-band console-subject-band">
          <div :key="scan" class="console-scan" aria-hidden="true" />
          <div class="console-identity-block">
            <ConsoleReticle icon="i-lucide-ruler" />
            <div class="console-name">
              <span class="console-label"
                >Key length /
                <span class="console-label-key">{{ answer.analysis.language }}</span></span
              >
              <h3 class="console-name-mono">
                <template v-if="answer.analysis.periods[0]"
                  >length
                  <span class="playground-valid">{{
                    answer.analysis.periods[0].period
                  }}</span></template
                >
                <template v-else>no length</template>
              </h3>
              <p class="console-about">
                <template v-if="answer.analysis.periods[0]"
                  >Its columns read at IoC {{ answer.analysis.periods[0].ic.toFixed(4) }}, plaintext
                  sits near {{ answer.analysis.referenceIc.toFixed(3) }}. Pick the wrong length and
                  the columns mix alphabets, down toward 0.038.</template
                >
                <template v-else-if="answer.analysis.total === 0"
                  >Nothing from A to Z in the text, so nothing to deal into columns.</template
                >
                <template v-else
                  >Columns need at least four letters, this text has
                  {{ answer.analysis.total }}.</template
                >
              </p>
            </div>
          </div>
          <div v-if="answer.analysis.periods[0]" class="console-readout">
            <svg class="console-link" viewBox="0 0 32 40" fill="none" aria-hidden="true">
              <circle cx="3" cy="12" r="2.5" />
              <path d="M5.5 12H14L22 20H32" />
            </svg>
            <dl :key="scan" class="console-readout-rows console-animate">
              <div>
                <dt>Letters</dt>
                <dd>{{ answer.analysis.total }}</dd>
              </div>
              <div>
                <dt>Key</dt>
                <dd class="console-accent">
                  <span class="playground-line">{{ answer.analysis.periods[0].key }}</span>
                </dd>
              </div>
              <div>
                <dt>Kasiski</dt>
                <dd>
                  <UTooltip :text="kasiski">
                    <span class="playground-line" tabindex="0">{{ kasiski }}</span>
                  </UTooltip>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div v-if="answer.analysis.periods[0]?.key" class="console-band">
          <p class="console-label console-rule-title">
            <span>Lengths <span aria-hidden="true">[ most likely first ]</span></span>
            <span class="console-mark" aria-hidden="true" />
            <UButton
              color="neutral"
              variant="subtle"
              trailing-icon="i-lucide-arrow-up"
              :label="`decode ${answer.analysis.periods[0].key}`"
              :aria-label="`Decode as Vigenère with the key ${answer.analysis.periods[0].key}`"
              @click="decodeWith(answer.analysis.periods[0].key)"
            />
          </p>
          <ol :key="scan" class="console-rows console-animate playground-periods">
            <li
              v-for="(row, index) in answer.analysis.periods.slice(0, PERIOD_LINES)"
              :key="row.period"
              :data-best="index === 0 ? '' : undefined"
              :style="{ animationDelay: `${index * 30}ms` }"
            >
              <span class="playground-rank">{{ String(index + 1).padStart(2, "0") }}</span>
              <span class="playground-shift">length={{ String(row.period).padStart(2, " ") }}</span>
              <span class="playground-ic">IoC {{ row.ic.toFixed(4) }}</span>
              <span v-if="row.key" class="playground-brute-text">{{ row.key }}</span>
            </li>
          </ol>
        </div>
      </template>

      <template v-else-if="answer.kind === 'info'">
        <div class="console-band console-subject-band">
          <div :key="scan" class="console-scan" aria-hidden="true" />
          <div class="console-identity-block">
            <ConsoleReticle :key="entry.slug" :icon="entry.icon" />
            <div class="console-name">
              <span class="console-label">Cipher / {{ familyLabel(answer.info.family) }}</span>
              <h3>{{ answer.info.label }}</h3>
              <p class="console-about">{{ answer.info.description }}</p>
            </div>
          </div>
          <div class="console-readout">
            <svg class="console-link" viewBox="0 0 32 40" fill="none" aria-hidden="true">
              <circle cx="3" cy="12" r="2.5" />
              <path d="M5.5 12H14L22 20H32" />
            </svg>
            <dl :key="scan" class="console-readout-rows console-animate">
              <div>
                <dt>Keyspace</dt>
                <dd class="console-accent">
                  <UTooltip v-if="keyspace" :text="keyspace.full">
                    <span class="playground-line" tabindex="0">{{ keyspace.short }}</span>
                  </UTooltip>
                  <span v-else class="playground-none">not stated</span>
                </dd>
              </div>
              <div>
                <dt>Decode</dt>
                <dd>{{ answer.info.selfInverse ? "self-inverse" : "same options back" }}</dd>
              </div>
              <div>
                <dt>Options</dt>
                <dd>{{ answer.info.options.length || "none" }}</dd>
              </div>
            </dl>
          </div>
        </div>
        <ol v-if="answer.info.options.length" :key="scan" class="console-rows console-animate playground-options">
          <li v-for="option in answer.info.options" :key="option.name">
            <code>{{ option.name }}</code>
            <span :class="option.required ? 'playground-valid' : 'playground-none'">{{
              option.required
                ? "required"
                : option.default === undefined || option.default === ""
                  ? "optional"
                  : `default ${option.default}`
            }}</span>
            <span class="playground-option-about">{{ option.description }}</span>
          </li>
        </ol>
      </template>

      <div v-else class="console-band console-subject-band">
        <div :key="scan" class="console-scan" aria-hidden="true" />
        <div class="console-identity-block">
          <ConsoleReticle :key="answer.name" icon="i-lucide-circle-alert" />
          <div class="console-name">
            <span class="console-label">Error / thrown</span>
            <h3 class="console-name-mono playground-invalid">{{ answer.name }}</h3>
            <p class="console-about">{{ answer.message }}</p>
          </div>
        </div>
        <div v-if="needsCipher" class="console-readout">
          <dl class="console-readout-rows">
            <div>
              <dt>Cipher</dt>
              <dd>{{ entry.slug }}</dd>
            </div>
            <div>
              <dt>Takes</dt>
              <dd>
                <span class="playground-line">{{
                  optionFields.map((field) => field.name + (field.required ? "" : "?")).join(", ") ||
                  "no options"
                }}</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <ConsoleResponse :title="responseTitle" :text="answer.text" />

      <footer class="console-footer console-footer-plain">
        <ul class="console-links">
          <li v-if="needsCipher">
            <NuxtLink :to="entry.to"><span aria-hidden="true">→ </span>{{ entry.info.label }}</NuxtLink>
          </li>
          <li>
            <NuxtLink
              :to="
                operation === 'period'
                  ? '/guide/analysis#key-length'
                  : needsLanguage
                    ? '/guide/analysis'
                    : '/guide/transform'
              "
              ><span aria-hidden="true">→ </span>How it works</NuxtLink
            >
          </li>
        </ul>
        <span class="console-meta">in your browser / no network</span>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.playground {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
}
/* The link between the two instruments: the zone's circuit, standing on its own 56 px of height. */
.playground-link {
  position: relative;
  height: 56px;
}
.playground-link > .hero-circuit {
  bottom: 0;
}
.playground-link > .hero-circuit-tag {
  bottom: 18px;
}
/* One track by default: an implicit auto track would grow to the widest chip row and push the page sideways. */
.playground-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px 48px;
}
.playground-column {
  min-width: 0;
}
@media (width >= 56rem) {
  .playground-columns {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
@media (width >= 80rem) {
  .playground-ops {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
/* The playground carries more rows than a dossier, so its bands breathe a little wider. */
.playground .console-bar {
  padding-block: 12px;
}
.playground .console-band {
  padding: 22px 24px 24px;
}
.playground .console-rule-title {
  margin-bottom: 18px;
}
.playground .console-readout-rows > div {
  padding: 12px 16px;
}
.playground-prompt {
  color: var(--ui-text-dimmed);
}
.playground .console-snippet {
  padding: 12px 16px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.playground .console-footer {
  padding: 14px 24px;
}
.playground .console-rows li {
  padding: 12px 24px;
}
.playground-band-first {
  border-top: 0;
}
.playground-tool-about {
  margin-top: 20px;
  font-size: 14px;
}
.playground-ops {
  display: grid;
  gap: 0 40px;
  margin-top: -12px;
}
.playground-ops .console-lead {
  margin-top: 12px;
  padding: 2px 0;
}
.playground-ops .console-lead > span:not(.console-tag, .console-leader) {
  white-space: nowrap;
  color: var(--ui-text-muted);
}
.playground-ops .console-lead[aria-pressed="true"] > span:not(.console-tag, .console-leader),
.playground-ops .console-lead:hover > span:not(.console-tag, .console-leader) {
  color: var(--ui-text-highlighted);
}
.playground-optional {
  color: var(--ui-text-dimmed);
}
.playground-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
}
.playground-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}
.playground-note {
  margin: 16px 0 0;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.7;
  color: var(--ui-text-muted);
}
.playground-call {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.playground-none {
  color: var(--ui-text-dimmed);
}
.playground-valid {
  color: var(--console-accent);
}
.playground-invalid {
  color: var(--ciphers-del);
}
.playground-line {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* The output as a value, whole and wrapped: a long hex string or a Morse line never scrolls the page. */
.playground-output {
  max-height: 16rem;
  overflow-y: auto;
  white-space: pre-wrap;
  color: var(--ui-text-highlighted);
}
/* One row per shift: rank, shift, the decoding on one line; the best fit in the accent. */
.playground-brute li {
  grid-template-columns: 2rem 5.5rem minmax(0, 1fr);
}
.playground-rank,
.playground-shift {
  white-space: pre;
  color: var(--ui-text-dimmed);
}
.playground-brute-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-muted);
}
.playground-brute li[data-best],
.playground-periods li[data-best] {
  box-shadow: inset 2px 0 0 var(--console-accent);
}
.playground-brute li[data-best] .playground-brute-text,
.playground-periods li[data-best] .playground-brute-text {
  color: var(--console-accent);
}
/* One row per key length: rank, length, column IoC, the key on the top three. */
.playground-periods li {
  grid-template-columns: 2rem 6.5rem 7.5rem minmax(0, 1fr);
}
.playground-ic {
  white-space: pre;
  color: var(--ui-text-muted);
}
/* One row per option of `ciphers_info`: the name, whether it is required, what it does. */
.playground-options li {
  grid-template-columns: 9rem 8rem minmax(0, 1fr);
}
.playground-options code {
  font-family: var(--font-mono);
  color: var(--ui-text-highlighted);
}
.playground-option-about {
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--ui-text-muted);
}
@media (width < 640px) {
  .playground-options li {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .playground-option-about {
    grid-column: 1 / -1;
  }
  .playground-brute li {
    grid-template-columns: 4.5rem minmax(0, 1fr);
  }
  .playground-periods li {
    grid-template-columns: max-content max-content minmax(0, 1fr);
  }
  .playground-rank {
    display: none;
  }
}
@media (width < 400px) {
  .playground .console-readout-rows > div {
    grid-template-columns: 5rem minmax(0, 1fr);
    gap: 8px;
    padding: 10px 12px;
  }
  .playground-periods li {
    grid-template-columns: max-content minmax(0, 1fr);
  }
  .playground-periods .playground-brute-text {
    grid-column: 1 / -1;
  }
  .playground .console-band,
  .playground .console-footer,
  .playground .console-rows li {
    padding-inline: 14px;
  }
}
</style>
