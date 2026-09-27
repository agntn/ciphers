<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <CiphersCallout kind="tip" :title="title"><slot mdc-unwrap="p" /></CiphersCallout>
</template>
