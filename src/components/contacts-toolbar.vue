<script lang="ts" setup>
  import { ref } from 'vue'
  import { Icon } from '@iconify/vue'

  const props = defineProps<{
    disabled?: boolean;
  }>()
  const emit = defineEmits(['add', 'input'])
  const searchText = ref<string>('')

  const addNewContact = () => {
    emit('add')
  }
  const onInput = (ev: string) => {
    emit('input', ev)
  }
</script>

<template>
  <div class="contacts-toolbar">
    <var-button
      class="contacts-toolbar__add-btn"
      type="primary"
      :disabled="props.disabled"
      @click="addNewContact"
    >
      + {{ $tr('app.btn.add') }}
    </var-button>

    <div class="contacts-toolbar__search">
      <var-input
        v-model="searchText"
        clearable
        :hint="false"
        :line="false"
        :disabled="props.disabled"
        @input="onInput"
        @clear="onInput('')"
      >
        <template #prepend-icon>
          <icon
            icon="round-search"
            :size="16"
            color="var(--black-30, #b3b3b3)"
          />
        </template>
      </var-input>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .contacts-toolbar {
    --button-normal-height: calc(var(--base-size) * 4);
    --button-primary-color: var(--blue-main, #0090ec);
    --font-size-md: var(--font-12);

    position: relative;
    width: 100%;
    height: 104px;
    padding: calc(var(--base-size) * 2) calc(var(--base-size) * 2) var(--base-size);

    &__add-btn {
      margin-bottom: calc(var(--base-size) * 2);
    }

    &__search {
      --input-icon-padding: 0;
      --input-placeholder-size: 0;
      --input-input-text-color: var(--black-90, #212121);

      position: relative;
      width: 100%;
      height: calc(var(--base-size) * 4);
      padding: var(--base-size);
      background-color: var(--gray-50, #f2f2f2);
      border-radius: calc(var(--base-size) / 2);

      :deep(.var-input__input) {
        height: calc(var(--base-size) * 2);
        font-size: var(--font-13);

        &::placeholder {
          font-size: var(--font-13);
          font-style: italic;
          color: var(--black-30, #b3b3b3);
        }
      }
    }
  }
</style>
