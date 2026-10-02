<script setup lang="ts">
import { CIPHERS, cipherEntry, familyLabel, keyspaceParts, registryPosition } from "../../utils/ciphers";
import { optionFlags, shellArg } from "../../utils/format";
import { infoText } from "../../utils/tools";

const props = defineProps<{ name: string }>();

const entry = computed(() => cipherEntry(props.name));
const position = computed(() => registryPosition(props.name));
const keyspace = computed(() => (entry.value ? keyspaceParts(entry.value.info) : undefined));

/** The options in the order `info()` declares them; the gauge has one tick per option, required open. */
const options = computed(() =>
  (entry.value?.info.options ?? []).map((option) => ({
    ...option,
    requirement: option.required
      ? "required"
      : option.default === undefined || option.default === ""
        ? "optional"
        : `default ${option.default}`,
  })),
);
const required = computed(() => options.value.filter((option) => option.required).length);
/** Other ciphers the library files under the same family, as links. */
const kin = computed(() =>
  CIPHERS.filter(
    (cipher) => cipher.info.family === entry.value?.info.family && cipher.slug !== props.name,
  ),
);

const cli = computed(() => {
  const cipher = entry.value;
  if (!cipher) return "";
  const flags = optionFlags(cipher.options);
  return `ciphers encode ${cipher.slug} ${shellArg(cipher.sample)}${flags ? ` ${flags}` : ""}`;
});
const playground = computed(() => {
  const cipher = entry.value;
  if (!cipher) return "/playground";
  const query = new URLSearchParams({ op: "encode", cipher: cipher.slug, text: cipher.sample });
  for (const [name, value] of Object.entries(cipher.options)) query.set(name, String(value));
  return `/playground?${query.toString()}`;
});

const text = computed(() => (entry.value ? infoText(entry.value.slug) : ""));
const title = computed(() => `ciphers_info("${props.name}")`);
</script>

<template>
  <section v-if="entry" class="tool-console console-wide not-prose my-6" aria-label="Cipher record">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>

    <header class="console-bar">
      <span class="console-title"
        ><span class="console-tag">ID</span>{{ entry.slug
        }}<span class="console-file"
          >{{ String(position).padStart(2, "0") }} / {{ CIPHERS.length }}</span
        ></span
      >
      <span class="console-meta">{{ entry.info.category }} · {{ entry.info.family }}</span>
      <span class="console-mark" aria-hidden="true" />
    </header>
    <div class="console-ruler" aria-hidden="true"><span class="console-cursor" /></div>

    <div class="console-band console-subject-band">
      <div class="console-scan" aria-hidden="true" />
      <div class="console-identity-block">
        <ConsoleReticle :key="entry.slug" :icon="entry.icon" />
        <div class="console-name">
          <span class="console-label">Cipher / {{ familyLabel(entry.info.family) }}</span>
          <h3>{{ entry.info.label }}</h3>
          <p class="console-about">{{ entry.blurb }}.</p>
        </div>
      </div>

      <div class="console-readout">
        <svg class="console-link" viewBox="0 0 32 40" fill="none" aria-hidden="true">
          <circle cx="3" cy="12" r="2.5" />
          <path d="M5.5 12H14L22 20H32" />
        </svg>
        <dl class="console-readout-rows">
          <div>
            <dt>Keyspace</dt>
            <dd class="console-accent">
              <UTooltip v-if="keyspace" :text="keyspace.full">
                <span class="cipher-line" tabindex="0">{{ keyspace.short }}</span>
              </UTooltip>
              <span v-else class="cipher-none">not stated</span>
            </dd>
          </div>
          <div>
            <dt>Decode</dt>
            <dd>{{ entry.info.selfInverse ? "self-inverse" : "same options back" }}</dd>
          </div>
          <div>
            <dt>Works on</dt>
            <dd>
              <UTooltip :text="entry.info.worksOn">
                <span class="cipher-line" tabindex="0">{{ entry.info.worksOn }}</span>
              </UTooltip>
            </dd>
          </div>
          <div>
            <dt>Family</dt>
            <dd>
              <span class="cipher-line">{{ kin.length + 1 }} in {{ familyLabel(entry.info.family).toLowerCase() }}</span>
            </dd>
          </div>
        </dl>
        <div
          class="console-gauge"
          :aria-label="`${required} of ${options.length} options required`"
        >
          <span class="console-ticks" aria-hidden="true">
            <span
              v-for="(option, index) in options"
              :key="option.name"
              :class="option.required ? 'console-tick-open' : 'console-tick-closed'"
              :style="{ animationDelay: `${index * 12}ms` }"
            />
          </span>
          <span class="console-gauge-read"
            >{{ options.length === 0 ? "no options" : `required ${required} / ${options.length}` }}</span
          >
        </div>
      </div>
    </div>

    <div v-if="options.length" class="console-band">
      <p class="console-label console-rule-title">
        <span>Options <span aria-hidden="true">[ as info() declares them ]</span></span>
        <span class="console-mark" aria-hidden="true" />
      </p>
      <dl class="cipher-options">
        <div v-for="option in options" :key="option.name">
          <dt>
            <code>{{ option.name }}</code>
            <span class="cipher-type">{{ option.type }}</span>
          </dt>
          <dd class="cipher-requirement" :data-required="option.required ? '' : undefined">
            {{ option.requirement }}
          </dd>
          <dd class="cipher-description">{{ option.description }}</dd>
        </div>
      </dl>
    </div>

    <div class="console-band">
      <p class="console-label console-rule-title">
        <span>Access <span aria-hidden="true">[ library · CLI · playground ]</span></span>
        <span class="console-mark" aria-hidden="true" />
      </p>
      <dl class="cipher-leads">
        <dd class="console-lead">
          <span class="console-tag">Create</span>
          <code class="cipher-code"
            ><span class="tok-fn">create</span>(<span class="tok-str">"{{ entry.slug }}"</span>)</code
          >
          <span class="console-leader" aria-hidden="true" />
        </dd>
        <dd class="console-lead">
          <span class="console-tag">CLI</span>
          <UTooltip :text="cli">
            <code class="cipher-code" tabindex="0"><span class="tok-fn">ciphers</span> {{ cli.slice(8) }}</code>
          </UTooltip>
          <span class="console-leader" aria-hidden="true" />
        </dd>
        <dd class="console-lead">
          <span class="console-tag">Try</span>
          <NuxtLink :to="playground"
            >playground<span class="cipher-dim"> with the sample above</span></NuxtLink
          >
          <span class="console-leader" aria-hidden="true" />
        </dd>
        <dd v-if="kin.length" class="console-lead">
          <span class="console-tag">Kin</span>
          <span class="cipher-kin"
            ><template v-for="(other, index) in kin.slice(0, 4)" :key="other.slug"
              ><NuxtLink :to="other.to">{{ other.slug }}</NuxtLink
              ><template v-if="index < Math.min(kin.length, 4) - 1">, </template></template
            ><span v-if="kin.length > 4" class="cipher-dim"> +{{ kin.length - 4 }}</span></span
          >
          <span class="console-leader" aria-hidden="true" />
        </dd>
      </dl>
    </div>

    <ConsoleResponse :title="title" :text="text" />

    <footer class="console-footer console-footer-plain">
      <ul class="console-links">
        <li>
          <NuxtLink to="/ciphers"><span aria-hidden="true">→ </span>All ciphers</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/guide/transform"><span aria-hidden="true">→ </span>Encode and decode</NuxtLink>
        </li>
      </ul>
      <span class="console-meta">in your browser / no network</span>
    </footer>
  </section>
</template>

<style scoped>
.cipher-none {
  color: var(--ui-text-dimmed);
}
/* Values stay on one line for every cipher; the whole value is in the tooltip. */
.cipher-line {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
section :deep(.console-readout-rows > div) {
  grid-template-columns: 6.5rem minmax(0, 1fr);
}
/* One row per option: the name and its type, whether it is required, then what it does in the reading face. */
.cipher-options {
  display: grid;
  margin: 0;
}
.cipher-options > div {
  display: grid;
  grid-template-columns: 11rem 7.5rem minmax(0, 1fr);
  gap: 4px 16px;
  align-items: baseline;
  padding: 8px 0;
}
.cipher-options > div + div {
  border-top: 1px solid var(--console-line);
}
.cipher-options dt {
  display: flex;
  gap: 8px;
  align-items: baseline;
  min-width: 0;
}
.cipher-options code {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--ui-text-highlighted);
}
.cipher-type {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ui-text-dimmed);
}
.cipher-requirement {
  margin: 0;
  font-size: 12px;
  color: var(--ui-text-muted);
}
.cipher-requirement[data-required] {
  color: var(--console-accent);
}
.cipher-description {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
.cipher-code {
  min-width: 0;
  overflow: hidden;
  font: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}
.cipher-dim {
  color: var(--ui-text-dimmed);
}
.console-lead > a:hover .cipher-dim {
  color: inherit;
}
.cipher-kin {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cipher-kin a:hover {
  color: var(--console-accent);
}
.cipher-leads {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: 0 28px;
  margin: 0;
}
.cipher-leads > .console-lead {
  margin: 0 0 8px;
  flex-wrap: nowrap;
  min-width: 0;
}
@media (width < 640px) {
  .cipher-leads .console-leader {
    display: none;
  }
  .cipher-options > div {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .cipher-description {
    grid-column: 1 / -1;
  }
}
</style>
