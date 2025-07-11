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
import { ref } from 'vue';
import ContactsToolbar from '@main/common/components/contacts-toolbar.vue';
import ContactList from '../components/contact-list.vue';
import { useRouting } from '../composables/useRouting';

const { goToNew } = useRouting();

const searchText = ref<string>('');

function addNewContact() {
  goToNew();
}

function onInput(text: string) {
  searchText.value = text;
}
</script>

<template>
  <div :class="$style.contacts">
    <div :class="$style.aside">
      <contacts-toolbar
        @add="addNewContact"
        @input="onInput"
      />
      <div :class="$style.asideBody">
        <contact-list
          :search-text="searchText"
        />
      </div>
    </div>

    <div :class="$style.content">
      <router-view v-slot="{ Component }">
        <transition>
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<style lang="scss" module>
.contacts {
  --contacts-aside-width: calc(var(--column-size) * 4);

  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: stretch;
}

.aside {
  position: relative;
  width: var(--contacts-aside-width);
  border-right: 1px solid var(--color-border-block-primary-default);
}

.asideBody {
  position: relative;
  width: 100%;
  height: calc(100% - 112px);
  padding: var(--spacing-xs) 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.content {
  position: relative;
  width: calc(100% - var(--contacts-aside-width));
  height: 100%;
}
</style>
