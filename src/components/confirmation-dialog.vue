<script lang="ts" setup>
  import { Ui3nHtml } from '@v1nt1248/3nclient-lib'

  const props = defineProps<{
    dialogText: string;
    additionalDialogText?: string;
  }>()

  const vUi3nHtml = Ui3nHtml
</script>

<template>
  <div class="confirmation-dialog">
    <div v-ui3n-html="props.dialogText" />
    <div v-if="props.additionalDialogText">
      {{ props.additionalDialogText }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .confirmation-dialog {
    font-size: var(--font-14);
    font-weight: 400;
    color: var(--black-90);
    text-align: center;
    padding-top: calc(var(--base-size) * 3);
    padding-bottom: var(--base-size);
  }
</style>
