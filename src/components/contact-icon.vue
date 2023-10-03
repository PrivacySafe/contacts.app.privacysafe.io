<script lang="ts" setup>
  import { computed } from 'vue'
  import { getElementColor, Ui3nIcon } from '@v1nt1248/3nclient-lib'

  const props = defineProps<{
    size?: number;
    name?: string;
    photo?: string;
    isGroup?: boolean;
    selected?: boolean;
    readonly?: boolean;
  }>()
  const emit = defineEmits(['click'])

  const letters = computed<string>(() => {
    if (props.name && !props.photo) {
      return props.name.length === 1
        ? props.name.toLocaleUpperCase()
        : `${props.name[0].toLocaleUpperCase()}${props.name[1].toLocaleLowerCase()}`
    }
    return ''
  })

  const innerSize = computed<number>(() => props.size || 24)
  const mainStyle = computed<Record<string, string>>(() => {
    const styles: Record<string, string> = {
      width: `${innerSize.value}px`,
      height: `${innerSize.value}px`,
      backgroundColor: getElementColor(letters.value || '?'),
    }
    return props.photo
      ? {
        ...styles,
        backgroundImage: `url(${props.photo})`,
      }
      : styles
  })
  const nameStyle = computed<Record<string, string>>(() => ({
    fontSize: `${Math.floor(innerSize.value * 0.5) - 4}px`,
  }))

  const onClick = (ev: MouseEvent): void => {
    emit('click', ev)
  }
</script>

<template>
  <div
    class="contact-icon"
    :style="mainStyle"
    v-on="readonly ? {} : { 'click': onClick }"
  >
    <div
      v-if="!props.selected && !props.photo"
      class="contact-icon__letter"
      :style="nameStyle"
    >
      {{ letters }}
    </div>

    <ui3n-icon
      v-if="props.selected"
      icon="check"
      :width="innerSize / 2"
      :height="innerSize / 2"
    />
  </div>
</template>

<style lang="scss" scoped>
  .contact-icon {
    position: relative;
    box-sizing: border-box;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-repeat: no-repeat;
    background-position: 50% 50%;
    background-size: cover;

    &__letter {
      -webkit-font-smoothing: antialiased;
      color: var(--system-white, #fff);
      font-weight: 500;
      line-height: 1;
      z-index: 1;
      pointer-events: none;
      user-select: none;
      text-shadow: 2px 2px 5px var(--gray-90, #444);
    }
  }
</style>
