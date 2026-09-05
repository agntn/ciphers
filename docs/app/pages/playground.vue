<script setup lang="ts">
definePageMeta({ layout: "default" });

const title = "Playground";
const description =
  "Encode, decode, brute force and count letters with any of the eighteen ciphers. In the browser, same library the CLI and the agent tools run.";

useSeo({ title, description, type: "article" });

defineOgImage("Docs", { headline: "Playground", title, description });
</script>

<template>
  <div class="ciphers-landing not-prose">
    <ToolHero
      eyebrow="playground"
      title="Any cipher."
      accent="Right here, in the page."
      description="The page imports @agntn/ciphers and runs it in your browser. What you type never leaves the tab, and every state is a link you can paste to someone."
    >
      <p
        class="ciphers-enter ciphers-enter-3 mx-auto mt-5 inline-flex max-w-xl items-start gap-2 text-left text-sm leading-6 text-dimmed"
      >
        <UIcon name="i-solar-lock-keyhole-linear" class="mt-1 size-4 shrink-0 text-primary" />
        <span
          >Classical ciphers are for puzzles and lessons. Nothing on this page protects a secret
          from anyone with a laptop.</span
        >
      </p>
    </ToolHero>

    <section class="ciphers-section">
      <div class="mx-auto w-full max-w-[var(--ui-container)] px-8 py-12 sm:px-12 lg:px-16">
        <CiphersPlayground />
      </div>
    </section>
  </div>
</template>
