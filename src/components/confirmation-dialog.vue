<script lang="ts" setup>
  import { Icon } from '@iconify/vue'

  const emit = defineEmits(['confirm', 'cancel'])

  const props =defineProps<{
    show: boolean;
    text: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
  }>()

  const handleEvents = (eventName: 'confirm'|'cancel') => {
    emit(eventName)
  }

</script>

<template>
  <var-dialog
    dialog-class="confirmation-dialog"
    :show="props.show"
    :confirm-button-text="props.confirmButtonText || 'Confirm'"
    :cancel-button-text="props.cancelButtonText || 'Cancel'"
    teleport="body"
    @cancel="handleEvents('cancel')"
    @confirm="handleEvents('confirm')"
  >
    <template #title>
      <div class="confirmation-dialog__header">
        <icon
          icon="round-warning"
          :width="13"
          :height="13"
          color="var(--yellow-100, #ffc765)"
        />
        <span>{{ $tr('confirmation.warning') }}</span>
      </div>
    </template>

    <div
      class="confirmation-dialog__content"
      v-html="props.text"
    />
  </var-dialog>
</template>

<style lang="scss">
  html {
    --dialog-title-font-size: var(--font-12) !important;
    --dialog-title-padding: calc(var(--base-size) * 2) !important;
    --dialog-message-padding: calc(var(--base-size) * 2) !important;
    --dialog-actions-padding: 0 calc(var(--base-size) * 2) calc(var(--base-size) * 2) !important;
  }

  .confirmation-dialog {
    width: calc(var(--column-size) * 4);

    .var-dialog__title {
      border-bottom: 1px solid var(--gray-50, #f2f2f2);
    }

    &__header {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      font-weight: 500;

      .iconify {
        margin-right: calc(var(--base-size) / 2);
      }
    }

    &__content {
      text-align: center;
      font-size: var(--font-12);
      color: var(--black-90, #212121);
    }

    .var-dialog__actions {
      --button-normal-height: calc(var(--base-size) * 4);
      --dialog-cancel-button-color: var(--system-white, #fff);
      --font-size-md: var(--font-12);

      flex-direction: row-reverse;
      justify-content: center !important;

      .var-dialog__button {
        font-weight: 500;
      }

      .var-dialog__cancel-button {
        background-color: var(--blue-main, #0090ec);
      }
    }
  }
</style>
