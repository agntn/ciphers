<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <CiphersCallout kind="caution" :title="title"><slot mdc-unwrap="p" /></CiphersCallout>
</template>
