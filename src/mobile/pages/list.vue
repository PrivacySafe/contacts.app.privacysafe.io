<!--
 Copyright (C) 2025 3NSoft Inc.

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
import { computed, inject, ref } from 'vue';
import { storeToRefs } from 'pinia';
import size from 'lodash/size';
import { DIALOGS_KEY, DialogsPlugin, I18N_KEY, I18nPlugin, NOTIFICATIONS_KEY, NotificationsPlugin } from '@v1nt1248/3nclient-lib/plugins';
import { Ui3nButton, Ui3nCheckbox, type Ui3nCheckboxValue, Ui3nInput, Ui3nList } from '@v1nt1248/3nclient-lib';
import { useAppStore } from '@main/common/store/app.store';
import { useContactsStore } from '@main/common/store/contacts.store';
import type { ContactGroup, PersonView } from '@main/common/types';
import ContactIcon from '@main/common/components/contact-icon.vue';
import ConfirmationDialog from '@main/common/dialogs/confirmation-dialog.vue';
import { useRouting } from '../composables/useRouting';

const { $tr } = inject<I18nPlugin>(I18N_KEY)!;
const dialogs = inject<DialogsPlugin>(DIALOGS_KEY)!;
const notification = inject<NotificationsPlugin>(NOTIFICATIONS_KEY)!;

const { goToNew, goToContact } = useRouting();

const { user } = storeToRefs(useAppStore());
const contactsStore = useContactsStore();
const { contactList } = storeToRefs(contactsStore);
const { deleteContacts } = contactsStore;

const searchText = ref<string>('');
const selectedContacts = ref<string[]>([]);

const filteredContactList = computed(() => Object.values(contactList.value)
  .map(p => ({
    ...p,
    displayName: p.name || p.mail || ' ',
  }))
  .filter(c => c.displayName.toLocaleLowerCase().includes(searchText.value.toLocaleLowerCase()))
  .sort((a, b) => (a.displayName.toLocaleLowerCase() > b.displayName.toLocaleLowerCase() ? 1 : -1)),
);

const contactListByLetters = computed(() =>
  filteredContactList.value
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
    }, {} as Record<string, ContactGroup>),
);

const areAllFilteredContactsSelected = computed(() => {
  const isUserInFilteredList = !!filteredContactList.value.find(c => c.mail === user.value);

  return isUserInFilteredList
    ? size(selectedContacts.value) === size(filteredContactList.value) - 1
    : size(selectedContacts.value) === size(filteredContactList.value);
});

function selectContact(contact: PersonView & { displayName: string }) {
  const contactIndex = selectedContacts.value.findIndex(cId => cId === contact.id);
  if (contactIndex === -1) {
    selectedContacts.value.push(contact.id);
  } else {
    selectedContacts.value.splice(contactIndex, 1);
  }
}

function clearSelectedList() {
  selectedContacts.value = [];
}

function toggleSelectedAll(value: Ui3nCheckboxValue) {
  if (value) {
    selectedContacts.value = filteredContactList.value.reduce((res, c) => {
      if (c.mail !== user.value) {
        res.push(c.id);
      }

      return res;
    }, [] as string[]);
  } else {
    selectedContacts.value = [];
  }
}

async function deleteSelectedContacts() {
  dialogs.$openDialog<typeof ConfirmationDialog>({
    component: ConfirmationDialog,
    componentProps: {
      dialogText: $tr(
        'confirmation.delete.multiple.text',
        { count: `<b>${size(selectedContacts.value)}</b>` },
      ),
    },
    dialogProps: {
      title: $tr('contact.delete.multiple.title'),
      width: 300,
      confirmButtonText: $tr('contact.delete.confirmBtn.text'),
      cancelButtonText: $tr('contact.delete.cancelBtn.text'),
      onConfirm: async () => {
        try {
          await deleteContacts(selectedContacts.value);
          notification.$createNotice({
            type: 'success',
            content: $tr('contact.delete.multiple.success.text'),
          });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
          notification.$createNotice({
            type: 'error',
            content: $tr('contact.delete.multiple.error.text'),
          });
        }
      },
    },
  });


  clearSelectedList();
}

async function openContact(contact: PersonView & { displayName: string }) {
  await goToContact(contact.id);
}

function createNewContact() {
  goToNew();
}

function getContactIconStyle(contact: PersonView) {
  if (contact.avatarId && contact.avatarImage) {
    return {
      backgroundImage: `url(${contact.avatarImage})`,
    }
  }

  return {};
}
</script>

<template>
  <div :class="$style.list">
    <div
      v-if="selectedContacts.length > 0"
      :class="$style.toolbar"
    >
      <div :class="$style.toolbarBlock">
        <ui3n-button
          type="icon"
          color="var(--color-bg-block-primary-default)"
          icon="round-arrow-back"
          icon-color="var(--color-icon-block-primary-default)"
          icon-size="20"
          @click="clearSelectedList"
        />

        <span :class="$style.info">{{ size(selectedContacts) }}</span>

        <ui3n-checkbox
          :model-value="areAllFilteredContactsSelected"
          @change="toggleSelectedAll"
        />

        <span :class="$style.info">
          {{ areAllFilteredContactsSelected ? $tr('action.deselect.all') : $tr('action.select.all') }}
        </span>
      </div>

      <ui3n-button
        type="icon"
        color="var(--color-bg-block-primary-default)"
        icon="trash-can"
        icon-color="var(--warning-content-default)"
        @click="deleteSelectedContacts"
      />
    </div>

    <ui3n-input
      v-model="searchText"
      clearable
      icon="round-search"
      icon-color="var(--color-icon-control-secondary-default)"
      :disabled="size(selectedContacts) > 0"
      :class="$style.search"
    />

    <div :class="$style.content">
      <ui3n-list
        :sticky="false"
        :items="Object.values(contactListByLetters)"
      >
        <template #item="{ item }">
          <ui3n-list :items="item.contacts">
            <template #title>
              <div :class="$style.title">
                {{ item.title.toUpperCase() }}
              </div>
            </template>

            <template #item="{ item: contact }">
              <div
                :class="$style.item"
                @click="openContact(contact)"
              >
                <div
                  :class="[$style.icon, contact.avatarId && selectedContacts.includes(contact.id) && $style.iconSelected]"
                  :style="getContactIconStyle(contact)"
                  @click.stop.prevent="selectContact(contact)"
                >
                  <contact-icon
                    v-if="!contact.avatarId"
                    :name="contact.displayName"
                    :size="32"
                    :selected="selectedContacts.includes(contact.id)"
                    :readonly="contact.mail === user"
                  />

                  <div
                    v-if="contact.avatarId && selectedContacts.includes(contact.id)"
                    :class="$style.iconSelectedIcon"
                  />
                </div>

                <span :class="$style.name">
                  {{ contact.displayName }}
                </span>
              </div>
            </template>
          </ui3n-list>
        </template>
      </ui3n-list>
    </div>

    <ui3n-button
      type="icon"
      color="var(--color-bg-button-primary-default)"
      icon="round-plus"
      icon-color="var(--color-icon-button-primary-default)"
      icon-size="20"
      :class="$style.createBtn"
      @click="createNewContact"
    />
  </div>
</template>

<style lang="scss" module>
.list {
  position: relative;
  width: 100%;
  height: 100%;
  padding: var(--spacing-m);
  overflow-x: hidden;
  overflow-y: auto;
  background-color: var(--color-bg-block-primary-default);
}

.toolbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--spacing-xxl);
  background-color: var(--color-bg-block-primary-default);
  border-bottom: 1px solid var(--color-border-block-primary-default);
  z-index: 5;
  padding: 0 var(--spacing-s);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbarBlock {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.info {
  font-size: var(--font-12);
  font-weight: 600;
  color: var(--color-text-control-primary-default);
  padding: 0 var(--spacing-s);
}

.search {
  margin-bottom: var(--spacing-m);
}

.content {
  position: relative;
  width: 100%;
  height: calc(100% - 68px);
  overflow-x: hidden;
  overflow-y: auto;
}

.title {
  position: relative;
  width: var(--spacing-ml);
  text-align: center;
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
  column-gap: var(--spacing-s);
  padding: 0 var(--spacing-m);
  font-size: var(--font-14);
  font-weight: 500;
  color: var(--color-text-control-primary-default);
  cursor: pointer;
}

.icon {
  position: relative;
  width: var(--spacing-l);
  min-width: var(--spacing-l);
  height: var(--spacing-l);
  border-radius: 50%;
  border: 1px solid var(--color-border-block-primary-default);
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.iconSelected {
  &::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background-color: transparent;
    box-sizing: border-box;
    border-radius: 50%;
    border: 4px solid var(--default-fill-default);
  }

  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background-color: transparent;
    box-sizing: border-box;
    border-radius: 50%;
    border: 2px solid var(--color-border-control-accent-default);
  }

  .iconSelectedIcon {
    position: absolute;
    width: 33.3%;
    height: 33.3%;
    border-radius: 50%;
    background-color: var(--color-border-control-accent-default);
    bottom: 0;
    right: 0;
    z-index: 1;
  }
}

.name {
  display: inline-block;
  width: calc(100% - var(--spacing-xl));
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.createBtn {
  position: absolute !important;
  bottom: var(--spacing-m);
  right: var(--spacing-m);
  z-index: 2;
}
</style>
