<script lang="ts" setup>
  import { watch, onMounted, ref } from 'vue'

  const emit = defineEmits(['input', 'update:text', 'update:valid'])
  const props = defineProps<{
    text: string | undefined;
    type?: 'input'|'textarea';
    autofocus?: boolean;
    label: string;
    rules?: ((value: string) => boolean|string)[];
    placeholder?: string;
    disabled?: boolean;
    valid: boolean;
  }>()

  const field = ref<HTMLElement|null>(null)
  const validate = (value: string) => {
    if (props.rules && props.rules.length > 0) {
      let isValid = true
      for (const f of props.rules) {
        if (typeof f === 'function') {
          const v = f(value)
          isValid = typeof v === 'boolean' && v
            ? isValid && true
            : isValid && false
        }
      }
      emit('update:valid', isValid)
    }
  }

  watch(
    () => props.text,
    val => validate(val || ''),
    { immediate: true },
  )

  onMounted(() => {
    if (props.autofocus && field.value) {
      field.value.focus()
    }
  })

  const onInput = (ev: InputEvent) => {
    const value = (ev.target as HTMLInputElement).value
    validate(value)
    emit('update:text', value)
    emit('input', value)
  }
</script>

<template>
  <div
    :class="[
      'p-field',
      {
        'p-field--disabled': props.disabled,
        'p-field--invalid': !props.valid,
      },
    ]"
  >
    <label v-if="props.label">
      {{ props.label }}
    </label>
    <textarea
      v-if="props.type === 'textarea'"
      ref="field"
      :value="props.text"
      :placeholder="props.placeholder || ''"
      :readonly="props.disabled"
      rows="6"
      class="p-field__content"
      @input="onInput"
    />
    <input
      v-else
      ref="field"
      :value="props.text"
      :placeholder="props.placeholder || ''"
      :readonly="props.disabled"
      class="p-field__content"
      @input="onInput"
    >
  </div>
</template>

<style lang="scss" scoped>
  .p-field {
    position: relative;
    width: 100%;

    label {
      display: block;
      width: 100%;
      font-size: var(--font-12);
      font-weight: 600;
      color: var(--black-90, #212121);
      margin-bottom: calc(var(--base-size) / 2);
    }

    input {
      height: calc(var(--base-size) * 4);
    }

    textarea {
      resize: none;
    }

    &__content {
      display: block;
      box-sizing: border-box;
      position: relative;
      width: 100%;
      margin-left: 0;
      border-radius: 4px;
      background-color: var(--gray-50, #f2f2f2);
      padding: var(--base-size);
      font-family: OpenSans, sans-serif;
      font-size: var(--font-13);
      font-weight: 400;
      color: var(--black-90, #212121);
      border: none;

      &::placeholder {
        font-size: var(--font-13);
        font-weight: 300;
        font-style: italic;
        color: var(--gray-90, #444);
      }

      &:focus-visible {
        width: calc(100% - 4px);
        margin-left: 2px;
        padding-left: calc(var(--base-size) - 2px);
        padding-right: calc(var(--base-size) - 2px);
        outline: 2px solid var(--blue-main, #0090ec);
      }
    }

    &--disabled {
      pointer-events: none;
      user-select: none;
    }

    &--invalid {
      label {
        color: var(--pear-100, #f75d53);
      }

      input {
        width: calc(100% - 4px);
        margin-left: 2px;
        padding-left: calc(var(--base-size) - 2px);
        padding-right: calc(var(--base-size) - 2px);
        outline: 2px solid var(--pear-100, #f75d53);
      }
    }
  }
</style>
