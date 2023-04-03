<script lang="ts" setup>
  import { Icon } from '@iconify/vue'

  const emit = defineEmits(['close'])
  const props = defineProps<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
    lifetime?: number;
  }>()
  const { type = 'info', text, lifetime = 2000 } = props

  setTimeout(() => {
    emit('close')
  }, lifetime)
</script>

<template>
  <div
    v-if="text"
    :class="['app-notification', `app-notification--${type}`]"
  >
    <div class="app-notification__icon-wrap">
      <icon
        icon="round-warning"
        :width="16"
        :height="16"
        color="#212121"
      />
    </div>
    <div class="app-notification__text">
      {{ text }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .app-notification {
    --notification-bg-color: var(--black-90, #212121);
    --notification-success-color: var(--green-grass-100, #33c653);
    --notification-error-color: var(--pear-100, #f75d53);
    --notification-warning-color: var(--yellow-100, #ffc765);
    --notification-info-color: var(--blue-main, #0090ec);

    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: calc(var(--base-size) * 2);
    border-radius: var(--base-size);
    background-color: var(--notification-bg-color);
    width: 50%;
    font-size: var(--font-12);
    line-height: 1.3;

    &--info {
      color: var(--notification-info-color);

      .app-notification__icon-wrap {
        background-color: var(--notification-info-color);
      }
    }

    &--success {
      color: var(--notification-success-color);

      .app-notification__icon-wrap {
        background-color: var(--notification-success-color);
      }
    }

    &--error {
      color: var(--notification-error-color);

      .app-notification__icon-wrap {
        background-color: var(--notification-error-color);
      }
    }

    &--warning {
      color: var(--notification-warning-color);

      .app-notification__icon-wrap {
        background-color: var(--notification-warning-color);
      }
    }

    &__icon-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      width: calc(var(--base-size) * 4);
      height: calc(var(--base-size) * 4);
      border-radius: 50%;
      margin-right: var(--base-size);
    }

    &__text {
      position: relative;
      width: calc(100% - calc(var(--base-size) * 5));
    }
  }
</style>
