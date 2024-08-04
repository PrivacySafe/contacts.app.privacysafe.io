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
  import { get as lGet } from 'lodash'
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useContactsStore } from '@/store/contacts.store'
  import { Ui3nList } from '@v1nt1248/3nclient-lib'
  import ContactIcon from '@/components/contact-icon.vue'

  const route = useRoute()
  const router = useRouter()
  const contactsStore = useContactsStore()

  const props = defineProps<{
    searchText?: string;
  }>()
  const selectedContactId = computed<string>(() => route.params.id as string)
  const text = computed<string>(() => (props.searchText || '').toLocaleLowerCase())

  const contactList = computed((): Array<PersonView & { displayName: string }> => {
    return Object.values(contactsStore.contactList)
      .map(p => ({
        ...p,
        displayName: lGet(p, 'name') || lGet(p, 'mail') || ' '
      }))
      .filter(c => c.displayName.toLocaleLowerCase().includes(text.value))
      .sort((a, b) => (a.displayName > b.displayName ? 1 : -1))
  })
  const contactListByLetters = computed(() => contactList.value
    .reduce((res, item) => {
      const letter = item.displayName[0].toLowerCase() as string
      if (!res[letter])
        res[letter] = {
          id: letter,
          title: letter,
          contacts: []
        }

      res[letter].contacts.push(item)
      return res
    }, {} as Record<string, ContactGroup>))

  const selectContact = (id: string) => {
    router.push(`/contacts/${id}`)
  }
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
          <div class="contact-list__title">
            {{ item.title.toUpperCase() }}
          </div>
        </template>
        <template #item="{ item: contact }">
          <div
            :class="[
              'contact-list__item',
              { 'contact-list__item--selected': contact.id === selectedContactId },
            ]"
            @click="selectContact(contact.id)"
          >
            <contact-icon
              :name="contact.displayName"
              :size="32"
              :readonly="true"
            />
            <span class="contact-list__item-name">
              {{ contact.displayName }}
            </span>
          </div>
        </template>
      </ui3n-list>
    </template>
  </ui3n-list>
</template>

<style lang="scss" scoped>
  .contact-list {
    &__title {
      position: relative;
      width: calc(var(--base-size) *4);
      text-align: center;
      padding-left: calc(var(--base-size) * 1.5);
      font-size: var(--font-16, 16px);
      font-weight: 600;
      color: var(--blue-main, #0090ec);
    }

    &__item {
      position: relative;
      width: 100%;
      height: calc(var(--base-size) * 5.5);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 calc(var(--base-size) * 2) 0 calc(var(--base-size) * 4);
      font-size: var(--font-14);
      font-weight: 500;
      color: var(--black-90, #212121);
      cursor: pointer;

      &-name {
        display: inline-block;
        margin-left: var(--base-size);
        width: calc(100% - calc(var(--base-size) * 5));
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      &--selected,
      &:hover {
        background-color: var(--blue-main-30, #b0dafc);
      }
    }
  }
</style>
