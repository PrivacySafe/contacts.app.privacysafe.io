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
import { get as lGet } from 'lodash';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useContactsStore } from '@/store/contacts.store';
import { Ui3nList } from '@v1nt1248/3nclient-lib';
import type { ContactGroup, PersonView } from '@/types';
import ContactIcon from '@/components/contact-icon.vue';

const route = useRoute();
const router = useRouter();
const contactsStore = useContactsStore();

const props = defineProps<{
  searchText?: string;
}>();
const selectedContactId = computed<string>(() => route.params.id as string);
const text = computed<string>(() => (props.searchText || '').toLocaleLowerCase());

const contactList = computed((): Array<PersonView & { displayName: string }> => {
  return Object.values(contactsStore.contactList)
    .map(p => ({
      ...p,
      displayName: lGet(p, 'name') || lGet(p, 'mail') || ' ',
    }))
    .filter(c => c.displayName.toLocaleLowerCase().includes(text.value))
    .sort((a, b) => (a.displayName > b.displayName ? 1 : -1));
});
const contactListByLetters = computed(() => contactList.value
  .reduce((res, item) => {
    const letter = item.displayName[0].toLowerCase() as string;
    if (!res[letter])
      res[letter] = {
        id: letter,
        title: letter,
        contacts: [],
      };

    res[letter].contacts.push(item);
    return res;
  }, {} as Record<string, ContactGroup>));

const selectContact = (id: string) => {
  router.push(`/contacts/${id}`);
};
</script>

<template>
  <ui3n-list
    :sticky="false"
    :items="Object.values(contactListByLetters)"
  >
    <template #item="{ item }">
      <ui3n-list
        :items="item.contacts"
      >
        <template #title>
          <div :class="$style.title">
            {{ item.title.toUpperCase() }}
          </div>
        </template>
        <template #item="{ item: contact }">
          <div
            :class="[$style.item, contact.id === selectedContactId && $style.selected]"
            @click="selectContact(contact.id)"
          >
            <contact-icon
              :name="contact.displayName"
              :size="32"
              :readonly="true"
            />
            <span :class="$style.name">
              {{ contact.displayName }}
            </span>
          </div>
        </template>
      </ui3n-list>
    </template>
  </ui3n-list>
</template>

<style lang="scss" module>
.title {
  position: relative;
  width: var(--spacing-l);
  text-align: center;
  padding-left: calc(var(--spacing-s) * 1.5);
  font-size: var(--font-16);
  font-weight: 600;
  color: var(--color-text-block-accent-default);
}

.item {
  position: relative;
  width: 100%;
  height: var(--spacing-xxl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--spacing-m) 0 var(--spacing-l);
  font-size: var(--font-14);
  font-weight: 500;
  color: var(--color-text-control-primary-default);
  cursor: pointer;

  &:hover {
    background-color: var(--color-bg-control-primary-hover);
  }
}

.name {
  display: inline-block;
  margin-left: var(--spacing-s);
  width: calc(100% - var(--spacing-xl));
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.selected {
  background-color: var(--color-bg-control-primary-hover);
}
</style>
