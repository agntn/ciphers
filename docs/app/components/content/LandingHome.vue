<script setup lang="ts">
import { CIPHERS, FAMILIES, TOOLS } from "../../utils/ciphers";

const { samples, tick, paused, current, caesar, step } = useLandingCipher();

const stats = [
  { value: String(CIPHERS.length), label: "ciphers" },
  { value: String(FAMILIES.length), label: "families" },
  { value: String(TOOLS.length), label: "agent tools" },
  { value: "0", label: "network calls" },
] as const;

const copied = ref(false);

async function copyInstall() {
  try {
    await navigator.clipboard.writeText("pnpm add @agntn/ciphers");
  } catch {
    return;
  }
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1200);
}

/** The cipher grid highlights whichever cipher the panels are showing. */
const activeCipher = computed(() => current.value.entry.slug);
</script>

<template>
  <div class="ciphers-landing not-prose">
    <header
      class="ciphers-hero mx-auto w-full max-w-[var(--ui-container)] px-8 pt-24 pb-20 text-center sm:px-12 lg:px-16"
    >
      <h1
        class="ciphers-enter mx-auto max-w-3xl text-4xl leading-[1.08] font-medium tracking-tight text-highlighted sm:text-5xl lg:text-[3.75rem]"
      >
        Eighteen ciphers. <span class="text-primary">One call.</span>
      </h1>
      <p class="ciphers-enter ciphers-enter-2 mx-auto mt-6 max-w-xl text-base leading-7 text-muted">
        Caesar to Enigma behind one small API. Encode, decode, brute force a Caesar, count letters.
        All in your process - no network, no keys, nothing to configure. Library, CLI, MCP server,
        Pi and OMP extensions. For lessons, and for the puzzle you're stuck on at 1am.
      </p>
      <div
        class="ciphers-enter ciphers-enter-3 mt-8 flex flex-wrap items-center justify-center gap-2"
      >
        <UButton to="/guide" color="primary" trailing-icon="i-solar-arrow-right-linear">
          Get started
        </UButton>
        <UButton
          to="https://github.com/agntn/ciphers"
          target="_blank"
          color="neutral"
          variant="outline"
          icon="i-simple-icons-github"
        >
          Star on GitHub
        </UButton>
      </div>
      <button
        type="button"
        class="ciphers-enter ciphers-enter-4 ciphers-install mt-5"
        :aria-label="copied ? 'Copied' : 'Copy install command'"
        @click="copyInstall"
      >
        <span class="text-dimmed">$</span>
        <span>pnpm add @agntn/ciphers</span>
        <UIcon :name="copied ? 'i-solar-unread-linear' : 'i-solar-copy-linear'" class="size-3.5 text-dimmed" />
      </button>

      <div
        class="ciphers-enter ciphers-enter-4 mx-auto mt-16 hidden max-w-6xl md:block"
        @mouseenter="paused = true"
        @mouseleave="paused = false"
      >
        <LandingFlow :sample="current" :tick="tick" />
      </div>
    </header>

    <dl class="ciphers-section grid grid-cols-2 sm:grid-cols-4">
      <div
        v-for="(stat, i) in stats"
        :key="stat.label"
        class="border-default px-6 py-7 text-center"
        :class="{ 'border-t sm:border-t-0': i >= 2, 'border-l': i % 2 === 1, 'sm:border-l': i > 0 }"
      >
        <dd class="font-mono text-2xl text-highlighted">{{ stat.value }}</dd>
        <dt class="mt-1 font-mono text-[11px] tracking-[0.12em] text-dimmed uppercase">
          {{ stat.label }}
        </dt>
      </div>
    </dl>

    <LandingFeature
      eyebrow="Encode and decode"
      title="Same two methods, every cipher"
      to="/guide/transform"
      link="Encode and decode"
      :checks="[
        'create(name) returns one cached instance. resolveCipher fixes case and spaces, nothing fuzzier',
        'Every result is { text, cipher, operation, options }. One log line tells you what ran',
        'Missing key is a MissingOptionError, shift 26 an InvalidOptionError. Never a silent identity',
      ]"
    >
      <code class="font-mono text-[13px] text-highlighted">create("vigenere")</code> gives you a
      class with <code class="font-mono text-[13px] text-highlighted">encode</code> and
      <code class="font-mono text-[13px] text-highlighted">decode</code>. Each cipher keeps its own
      option names. Case survives by default, punctuation passes through, and
      <code class="font-mono text-[13px] text-highlighted">stripNonAlpha</code> flattens the input
      when a puzzle wants one clean block. This panel walks through {{ samples.length }} ciphers.
      Nothing here is a recording, the library computes every value in your browser.
      <template #visual>
        <div @mouseenter="paused = true" @mouseleave="paused = false">
          <LandingRotatingCode :sample="current" />
          <div class="mt-3 flex items-center justify-between font-mono text-[11px] text-dimmed">
            <span>{{ current.entry.info.label }} · {{ current.entry.info.family }}</span>
            <span class="inline-flex gap-1">
              <button type="button" class="ciphers-copy" aria-label="Previous cipher" @click="step(-1)">
                <UIcon name="i-solar-alt-arrow-left-linear" class="size-3.5" />
              </button>
              <button type="button" class="ciphers-copy" aria-label="Next cipher" @click="step(1)">
                <UIcon name="i-solar-alt-arrow-right-linear" class="size-3.5" />
              </button>
            </span>
          </div>
        </div>
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="Brute force"
      title="Twenty-five shifts, one line each"
      to="/guide/analysis"
      link="Brute force and frequency"
      :checks="[
        'ciphers brute prints every shift. You pick the one that reads as English',
        'cipher_brute_caesar returns the same list as text, so a model can pick too',
        'Shift 0 is not on the list. An identity is not a decode',
      ]"
      reverse
    >
      A Caesar has 25 keys and the fastest attack is all of them. The list is the current
      plaintext shifted by 3, then decoded with every shift, the hit in the accent. Same loop
      behind the CLI command and the agent tool, there was no reason to write it twice.
      <template #visual>
        <LandingBrute :ciphertext="caesar" :plaintext="current.plaintext" />
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="Frequency"
      title="Count letters before guessing a key"
      to="/guide/analysis"
      link="analyzeFrequency"
      :checks="[
        'Counts sorted by frequency, expected order for English or Polish next to them',
        'Index of coincidence near 0.067 is a substitution, near 0.038 polyalphabetic or random',
        'No letters in, undefined out. Not an empty histogram',
      ]"
    >
      <code class="font-mono text-[13px] text-highlighted">analyzeFrequency(text, "en")</code>
      tells you whether a ciphertext still has English underneath. A shift keeps the histogram
      shape and only moves it. A Vigenère flattens it. The panel counts whatever the walk just
      produced, so watch it collapse when Enigma comes around.
      <template #visual>
        <LandingFrequency
          :text="current.ciphertext || current.plaintext"
          :label="`${current.entry.slug} output`"
        />
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="Ciphers"
      title="Eighteen ciphers, eight families"
      to="/ciphers"
      link="All ciphers"
      :checks="[
        'Shift, reflection and multiplicative substitutions, three polyalphabetics, one digraph',
        'Six fractionations from Polybius to ADFGVX, two transpositions, one Enigma M3',
        'Each page lists the options, the keyspace and the conventions, like I and J sharing a cell',
      ]"
      reverse
    >
      Latin alphabets are A to Z. Playfair and Polybius fold J into I, tap code shares C and K,
      Bacon uses 26 letters not 24, Enigma is the Wehrmacht M3 with rotors I, II, III and reflector
      B. Every one of those is a choice, and every choice is written down on the cipher's page. A
      puzzle answer you can't reproduce is not an answer.
      <template #visual>
        <div
          class="ciphers-frame grid grid-cols-2 overflow-hidden rounded-xl sm:grid-cols-3"
        >
          <NuxtLink
            v-for="(cipher, i) in CIPHERS"
            :key="cipher.slug"
            :to="cipher.to"
            class="group flex flex-col gap-2 border-muted px-4 py-3.5 transition-colors duration-500 hover:bg-muted"
            :class="{
              'border-t': i >= 2,
              'sm:border-t-0': i < 3,
              'border-l': i % 2 === 1,
              'sm:border-l': i % 3 !== 0,
              'sm:border-l-0': i % 3 === 0,
              'ciphers-cell-active': cipher.slug === activeCipher,
            }"
          >
            <UIcon
              :name="cipher.icon"
              class="size-4 text-muted transition-colors duration-500 group-hover:text-primary"
              :class="{ 'text-primary': cipher.slug === activeCipher }"
            />
            <span>
              <span class="block text-sm font-medium text-highlighted">{{ cipher.info.label }}</span>
              <span class="mt-0.5 block font-mono text-[11px] text-dimmed">"{{ cipher.slug }}"</span>
            </span>
          </NuxtLink>
        </div>
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="Agents"
      title="Five tools, three hosts"
      to="/guide/agents"
      link="MCP, Pi and OMP"
      :checks="[
        'cipher_encode, cipher_decode, cipher_brute_caesar, cipher_frequency, cipher_info',
        'Arguments checked against the published JSON Schema before a cipher sees them',
        'Text and key lengths are bounded. A model cannot hand the process a novel',
      ]"
    >
      <code class="font-mono text-[13px] text-highlighted">ciphers mcp</code> serves the tools over
      stdio, the Pi and OMP extensions render them in the terminal. All three call the same
      executors, so they answer identically and a fix lands once. Nothing leaves the machine, there
      is nowhere for it to go.
      <template #visual>
        <LandingToolCall :sample="current" />
      </template>
    </LandingFeature>

    <LandingFeature
      eyebrow="Your cipher"
      title="Extend Cipher, call register"
      to="/guide/custom"
      link="Custom ciphers"
      :checks="[
        'name(), info(), encode() and decode(). The same four the built-ins implement',
        'register(name, Class) makes it visible to create and resolveCipher',
        'Register a name again and the cached instance is dropped, so a hot reload takes',
      ]"
      reverse
    >
      Every built-in is a concrete class extending the exported abstract
      <code class="font-mono text-[13px] text-highlighted">Cipher</code>. Yours is the same shape,
      one file. Throw <code class="font-mono text-[13px] text-highlighted">InvalidOptionError</code>
      when an option is wrong and let
      <code class="font-mono text-[13px] text-highlighted">normalizeError</code> wrap the rest. No
      base class magic, no plugin manifest.
      <template #visual>
        <div class="ciphers-frame overflow-hidden rounded-xl">
          <div class="flex items-center gap-2 border-b border-muted px-4 py-3">
            <span class="font-mono text-[10px] font-bold text-primary">TS</span>
            <span class="text-sm text-default">reverse.ts</span>
          </div>
          <pre class="ciphers-rotating ciphers-nowrap"><code><span class="tok-kw">import</span> { Cipher, register } <span class="tok-kw">from</span> <span class="tok-str">"@agntn/ciphers"</span>;
<span class="tok-kw">import type</span> { CipherInfo, CipherResult } <span class="tok-kw">from</span> <span class="tok-str">"@agntn/ciphers"</span>;

<span class="tok-kw">class</span> <span class="tok-fn">Reverse</span> <span class="tok-kw">extends</span> Cipher {
  <span class="tok-fn">name</span>() {
    <span class="tok-kw">return</span> <span class="tok-str">"reverse"</span>;
  }

  <span class="tok-fn">info</span>(): CipherInfo {
    <span class="tok-kw">return</span> {
      name: <span class="tok-str">"reverse"</span>,
      label: <span class="tok-str">"Reverse"</span>,
      description: <span class="tok-str">"The text backwards"</span>,
      family: <span class="tok-str">"transposition"</span>,
      selfInverse: <span class="tok-kw">true</span>,
      options: [],
    };
  }

  <span class="tok-fn">encode</span>(text: <span class="tok-kw">string</span>): CipherResult {
    <span class="tok-kw">return</span> {
      text: [...text].<span class="tok-fn">reverse</span>().<span class="tok-fn">join</span>(<span class="tok-str">""</span>),
      cipher: <span class="tok-str">"reverse"</span>,
      operation: <span class="tok-str">"encode"</span>,
      options: {},
    };
  }

  <span class="tok-fn">decode</span>(text: <span class="tok-kw">string</span>): CipherResult {
    <span class="tok-kw">return</span> { ...<span class="tok-kw">this</span>.<span class="tok-fn">encode</span>(text), operation: <span class="tok-str">"decode"</span> };
  }
}

<span class="tok-fn">register</span>(<span class="tok-str">"reverse"</span>, Reverse);</code></pre>
        </div>
      </template>
    </LandingFeature>

    <section class="ciphers-section">
      <div
        class="mx-auto w-full max-w-[var(--ui-container)] px-8 py-20 text-center sm:px-12 lg:px-16"
      >
        <h2 class="text-2xl font-medium tracking-tight text-highlighted sm:text-3xl">
          Start with one command
        </h2>
        <p class="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
          Pre-1.0, so pin exact versions. And these are classical ciphers - fine for a riddle, a
          lesson or a CTF, useless for a secret. Use a real primitive for those, seriously.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-2">
          <UButton to="/guide" color="primary" trailing-icon="i-solar-arrow-right-linear">
            Read the guide
          </UButton>
          <UButton to="/playground" color="neutral" variant="outline"> Open the playground </UButton>
        </div>
      </div>
    </section>
  </div>
</template>
