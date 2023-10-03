<script lang="ts" setup>
  import { ref } from 'vue'
  import { Ui3nButton, Ui3nInput } from '@v1nt1248/3nclient-lib'

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
    <ui3n-button
      class="contacts-toolbar__add-btn"
      :disabled="props.disabled"
      @click="addNewContact"
    >
      + {{ $tr('app.btn.add') }}
    </ui3n-button>

    <div class="contacts-toolbar__search">
      <ui3n-input
        v-model:value="searchText"
        clearable
        icon="search"
        icon-color="var(--black-30, #b3b3b3)"
        :disabled="props.disabled"
        @input="onInput"
        @clear="onInput('')"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .contacts-toolbar {
    position: relative;
    width: 100%;
    height: 104px;
    padding: calc(var(--base-size) * 2) calc(var(--base-size) * 2) var(--base-size);

    &__add-btn {
      margin-bottom: calc(var(--base-size) * 2);
    }

    &__search {
      position: relative;
      width: 100%;
      height: calc(var(--base-size) * 4);
    }
  }
</style>
