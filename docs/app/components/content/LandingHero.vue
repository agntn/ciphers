<script setup lang="ts">
import { version } from "../../../../package.json";
import type { LandingSample } from "../../composables/useLandingCipher";
import { CIPHERS, FAMILY_COUNT } from "../../utils/ciphers";
import { TOOLS } from "../../utils/tools";

defineProps<{ sample: LandingSample; samples: readonly LandingSample[] }>();
const emit = defineEmits<{ step: [delta: number]; pause: [paused: boolean] }>();

const INSTALL = "pnpm add @agntn/ciphers";

const classical = CIPHERS.filter((entry) => entry.info.category === "classical").length;
const block = CIPHERS.length - classical;

const { copied, copy } = useCopied();
</script>

<template>
  <header class="ciphers-hero hero-page">
    <div class="hero-zone">
      <span class="hero-cross hero-cross-tl" aria-hidden="true">+</span>
      <span class="hero-cross hero-cross-tr" aria-hidden="true">+</span>
      <span class="hero-bracket hero-bracket-l" aria-hidden="true" />
      <span class="hero-bracket hero-bracket-r" aria-hidden="true" />

      <p class="console-id">
        <span class="console-id-tag">ID</span>
        <span>@agntn/ciphers</span>
        <span class="console-id-sep" aria-hidden="true">/</span>
        <span>v{{ version }}</span>
      </p>

      <h1 class="hero-title">Pick a cipher. <span>One call.</span></h1>
      <p class="hero-lead">
        Caesar to Serpent behind the same two methods. Encode, decode, brute force a Caesar, count
        letters. It all runs in your process, no network, no keys to sign up for, nothing to
        configure. For lessons, and for the puzzle you're stuck on at 1am.
      </p>

      <dl class="hero-metrics">
        <div>
          <dt>Ciphers</dt>
          <dd>{{ CIPHERS.length }}</dd>
          <dd class="hero-metric-sub">{{ classical }} classical · {{ block }} block</dd>
        </div>
        <div>
          <dt>Families</dt>
          <dd>{{ FAMILY_COUNT }}</dd>
          <dd class="hero-metric-sub">{{ TOOLS.length }} agent tools on top</dd>
        </div>
        <div>
          <dt>Network calls</dt>
          <dd class="hero-metric-accent">0</dd>
          <dd class="hero-metric-sub">every value computed in place</dd>
        </div>
      </dl>

      <div class="console-actions">
        <UButton
          to="/guide"
          color="primary"
          variant="solid"
          trailing-icon="i-lucide-arrow-right"
          label="Get started"
        />
        <UButton
          to="https://github.com/agntn/ciphers"
          target="_blank"
          color="neutral"
          variant="outline"
          icon="i-simple-icons-github"
          label="Star on GitHub"
        />
      </div>
      <div class="console-install">
        <span class="console-install-tag">Install</span>
        <code><span class="console-install-prompt">$</span> {{ INSTALL }}</code>
        <UButton
          color="neutral"
          variant="subtle"
          :icon="copied === 'install' ? 'i-lucide-check' : 'i-lucide-copy'"
          :aria-label="copied === 'install' ? 'Copied' : 'Copy install command'"
          @click="copy('install', INSTALL)"
        />
      </div>
    </div>

    <!-- One sentence through one cipher: the plaintext on one tape, what the library made of it on the other. -->
    <div class="hero-instrument">
      <svg class="hero-circuit" viewBox="0 0 160 56" aria-hidden="true">
        <path class="hero-circuit-rail" d="M80 0V16L96 32V56" />
        <path :key="sample.entry.slug" class="hero-circuit-live" d="M80 0V16L96 32V56" pathLength="1" />
        <path class="hero-circuit-seg" d="M96 38V48" />
        <rect class="hero-circuit-node" x="92.5" y="52.5" width="7" height="7" />
      </svg>
      <span class="hero-circuit-tag" aria-hidden="true">encode</span>
      <LandingTape :sample="sample" :samples="samples" @step="emit('step', $event)" @pause="emit('pause', $event)" />
    </div>
  </header>
</template>
