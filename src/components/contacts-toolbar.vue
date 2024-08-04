<!-- 
 Copyright (C) 2020 - 2024 3NSoft Inc.

 This program is free software: you can redistribute it and/or modify it under
 the terms of the GNU General Public License as published by the Free Software
 Foundation, either version 3 of the License, or (at your option) any later
 version.

 This program is distributed in the hope that it will be useful, but
 WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 this program. If not, see <http://www.gnu.org/licenses/>.
-->

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
