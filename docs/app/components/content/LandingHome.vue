<script setup lang="ts">
import { analyzeFrequency } from "@agntn/ciphers";
import { CIPHERS, FAMILY_COUNT, categorySize } from "../../utils/ciphers";
import { spellOutCapital, spellOut } from "../../utils/format";
import { TOOLS } from "../../utils/tools";

const { samples, paused, current, caesar, step } = useLandingCipher();

/** Plaintext's index of coincidence as the library's English table puts it. */
const ENGLISH_IC = analyzeFrequency("A", "en")!.referenceIc.toFixed(3);

</script>

<template>
  <div class="ciphers-landing not-prose">
    <LandingHero :sample="current" :samples="samples" @step="step" @pause="paused = $event" />

    <LandingFeature
      title="Same two methods, every cipher"
      to="/guide/transform"
      link="Encode and decode"
      :checks="[
        'create(name) returns one cached instance. resolveCipher fixes case and spaces, nothing fuzzier',
        'Every result is { text, cipher, operation, options }. One log line tells you what ran',
        'Missing key is a MissingOptionError, shift 26 an InvalidOptionError. Never a silent identity',
      ]"
    >
      <code class="ciphers-code">create("vigenere")</code> gives you a class with
      <code class="ciphers-code">encode</code> and <code class="ciphers-code">decode</code>. Each
      cipher keeps its own option names. Case survives by default, punctuation passes through, and
      <code class="ciphers-code">stripNonAlpha</code> flattens the input when a puzzle wants one
      clean block. This file walks through {{ samples.length }} ciphers and none of it is a
      recording, the library computes every line in your browser.
      <template #visual>
        <LandingRotatingCode :sample="current" @step="step" @pause="paused = $event" />
      </template>
    </LandingFeature>

    <LandingFeature
      title="Twenty-five shifts, best fit on top"
      to="/guide/analysis"
      link="Brute force and frequency"
      :checks="[
        'ciphers brute prints every shift, the one that reads most like English on top',
        'ciphers_caesar_brute returns the same list as text, so a model can pick too',
        'Shift 0 is not on the list. An identity is not a decode',
      ]"
      reverse
    >
      A Caesar has 25 keys and the fastest attack is all of them. The panel takes the current
      plaintext, shifts it by 3, then decodes it with every shift and ranks the results by how much
      they read like English. Short samples are the honest failure, three letters don't make a
      histogram, so the right key sometimes lands second.
      <template #visual>
        <LandingBrute
          :ciphertext="caesar"
          :plaintext="current.plaintext"
          :shift="3"
          @pause="paused = $event"
        />
      </template>
    </LandingFeature>

    <LandingFeature
      title="Count letters before guessing a key"
      to="/guide/analysis"
      link="analyzeFrequency"
      :checks="[
        'Counts sorted by frequency, the expected order for English, Polish or Japanese romaji next to them',
        `Index of coincidence near ${ENGLISH_IC} is one alphabet, near 0.038 several or none`,
        'No letters in, undefined out. Not an empty histogram',
      ]"
    >
      <code class="ciphers-code">analyzeFrequency(text, "en")</code> tells you whether a
      ciphertext still has English underneath. A shift keeps the histogram's shape and only moves
      it. A Vigenère flattens it, and the block ciphers leave nothing but a to f. The panel counts
      whatever the walk just produced, so watch it collapse when Enigma comes around.
      <template #visual>
        <LandingFrequency
          :text="current.ciphertext || current.plaintext"
          :slug="current.entry.slug"
          @pause="paused = $event"
        />
      </template>
    </LandingFeature>

    <section class="ciphers-section">
      <div class="mx-auto w-full max-w-[var(--ui-container)] px-8 py-20 sm:px-12 lg:px-16">
        <div class="max-w-2xl">
          <h2 class="text-2xl font-medium tracking-tight text-highlighted sm:text-[1.75rem]">
            {{ spellOutCapital(CIPHERS.length) }} ciphers, {{ spellOut(FAMILY_COUNT) }} families
          </h2>
          <p class="mt-4 text-sm leading-6 text-muted">
            {{ spellOutCapital(categorySize("classical")) }} classical, from Caesar to Enigma,
            {{ spellOut(categorySize("block")) }} block ciphers from DES to Serpent, and
            {{ spellOut(categorySize("stream")) }} stream ciphers, XOR, RC4 and Rabbit. Latin alphabets are A to Z.
            Playfair and Polybius fold J into I, tap code shares C and K, Enigma is the Wehrmacht M3
            with rotors I, II, III and reflector B, and the block and stream ciphers count bytes, not letters.
            Every one of those is a choice, and every choice is written
            down on the cipher's page. A puzzle answer you can't reproduce is not an answer.
          </p>
          <p class="landing-entry">
            <span class="console-tag">Import</span>
            <code>import { ciphers, create } from "@agntn/ciphers"</code>
          </p>
        </div>
        <LandingRegistry :sample="current" class="mt-10" @pause="paused = $event" />
      </div>
    </section>

    <LandingFeature
      :title="`${spellOutCapital(TOOLS.length)} tools, three hosts`"
      to="/guide/agents"
      link="MCP, Pi and OMP"
      :checks="[
        TOOLS.join(', '),
        'Arguments checked against the published JSON Schema before a cipher sees them',
        'Text and key lengths are bounded. A model can\'t hand the process a novel',
      ]"
      reverse
    >
      <code class="ciphers-code">ciphers mcp</code> serves the tools over stdio, the Pi and OMP
      extensions render them in the terminal. All three call the same executors, so they answer
      identically and a fix lands once. The page runs those executors too, the text in the dialog
      is what a model reads. Nothing leaves the machine, there is nowhere for it to go.
      <template #visual>
        <LandingToolCall :sample="current" @pause="paused = $event" />
      </template>
    </LandingFeature>

    <LandingFeature
      title="Extend Cipher, call register"
      to="/guide/custom"
      link="Custom ciphers"
      :checks="[
        'name(), info(), encode() and decode(). The same four the built-ins implement',
        'register(name, Class) makes it visible to create and resolveCipher',
        'Register a name again and the cached instance is dropped, so a hot reload takes',
      ]"
    >
      Every built-in is a concrete class extending the exported abstract
      <code class="ciphers-code">Cipher</code>. Yours is the same shape, one file. Throw
      <code class="ciphers-code">InvalidOptionError</code> when an option is wrong and let
      <code class="ciphers-code">normalizeError</code> wrap the rest. No base class magic, no
      plugin manifest.
      <template #visual>
        <LandingCustom />
      </template>
    </LandingFeature>

    <section class="ciphers-section">
      <div class="mx-auto w-full max-w-[var(--ui-container)] px-8 py-20 sm:px-12 lg:px-16">
        <LandingStart />
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing-entry {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 20px 0 0;
  min-width: 0;
}
.landing-entry > .console-tag {
  flex: none;
  margin: 0;
}
.landing-entry > code {
  min-width: 0;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
}
</style>
