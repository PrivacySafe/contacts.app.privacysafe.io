<!--
 Copyright (C) 2020 - 2025 3NSoft Inc.

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
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Ui3nList } from '@v1nt1248/3nclient-lib';
import { useContactsStore } from '@main/common/store/contacts.store';
import type { ContactListItem } from '@main/types';
import ListItem from '@main/common/components/contact-list-item.vue';

const props = defineProps<{
  searchText?: string;
}>();

const route = useRoute();

const contactsStore = useContactsStore();
const { contacts } = storeToRefs(contactsStore);

const selectedContactId = computed(() => route.params.id as string);
const text = computed<string>(() => (props.searchText || '').toLocaleLowerCase());

const filteredList = computed(() => contacts.value
  .filter(c => c.displayName.toLocaleLowerCase().includes(text.value)
    || c.mail.toLocaleLowerCase().includes(text.value)),
);

const contactListByLetters = computed(() =>
  filteredList.value.reduce((res, item) => {
    const firstLetter = item.displayName[0].toLowerCase();
    if (!res[firstLetter]) {
      res[firstLetter] = [];
    }

    res[firstLetter].push(item);
    return res;
  }, {} as Record<string, ContactListItem[]>),
);

const contactsInitialLetters = computed(() => Object.keys(contactListByLetters.value)
  .sort((a, b) => a > b ? 1 : -1)
  .map(l => ({ id: l, label: l })));
</script>

<template>
  <ui3n-list
    :sticky="false"
    :items="contactsInitialLetters"
  >
    <template #item="{ item }">
      <ui3n-list
        :items="contactListByLetters[item.id]"
        key-field="mail"
      >
        <template #title>
          <div :class="$style.title">
            {{ item.label.toUpperCase() }}
          </div>
        </template>

        <template #item="{ item: contact }">
          <list-item
            :item="contact"
            :selected-contact-ids="selectedContactId ? [selectedContactId] : []"
          />
        </template>
      </ui3n-list>
    </template>
  </ui3n-list>
</template>

<style lang="scss" module>
@use '@main/common/assets/styles/_mixins' as mixins;

.title {
  position: relative;
  width: var(--spacing-l);
  text-align: center;
  padding-left: calc(var(--spacing-s) * 1.5);
  font-size: var(--font-16);
  font-weight: 600;
  color: var(--color-text-block-accent-default);
}
</style>
