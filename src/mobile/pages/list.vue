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
import { useRouting } from '../composables/useRouting';
import { useAppStore } from '@main/common/store/app.store';
import { useContactsStore } from '@main/common/store/contacts.store';
import type { ContactListItem, PersonView } from '@main/types';
import ConfirmationDialog from '@main/common/dialogs/confirmation-dialog.vue';
import ListItem from '@main/common/components/contact-list-item.vue';

const { $tr } = inject<I18nPlugin>(I18N_KEY)!;
const dialogs = inject<DialogsPlugin>(DIALOGS_KEY)!;
const notification = inject<NotificationsPlugin>(NOTIFICATIONS_KEY)!;

const { goToNew } = useRouting();

const { user } = storeToRefs(useAppStore());
const contactsStore = useContactsStore();
const { contacts } = storeToRefs(contactsStore);
const { deleteContacts } = contactsStore;

const searchText = ref<string>('');
const selectedContacts = ref<string[]>([]);

const text = computed<string>(() => (searchText.value || '').toLocaleLowerCase());

const filteredContactList = computed(() => contacts.value
  .filter(c => c.displayName.toLocaleLowerCase().includes(text.value)
    || c.mail.toLocaleLowerCase().includes(text.value)),
);

const contactListByLetters = computed(() =>
  filteredContactList.value.reduce((res, item) => {
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
  const res = await dialogs.$openDialog(ConfirmationDialog, {
    component: ConfirmationDialog,
    dialogText: $tr(
      'confirmation.delete.multiple.text',
      { count: `<b>${size(selectedContacts.value)}</b>` },
    ),
    dialogProps: {
      title: $tr('contact.delete.multiple.title'),
      width: 300,
      confirmButtonText: $tr('contact.delete.confirmBtn.text'),
      cancelButtonText: $tr('contact.delete.cancelBtn.text'),
    },
  });

  const { event } = res;
  if (event === 'confirm') {
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
  }

  clearSelectedList();
}

function createNewContact() {
  goToNew();
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
      :placeholder="$tr('contacts.search.placeholder')"
      clearable
      icon="round-search"
      icon-color="var(--color-icon-control-secondary-default)"
      :disabled="size(selectedContacts) > 0"
      :class="$style.search"
    />

    <div :class="$style.content">
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
                :selected-contact-ids="selectedContacts"
                is-mobile-form-factor
                @select="() => selectContact(contact)"
              />
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
@use '@main/common/assets/styles/_mixins' as mixins;

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

.createBtn {
  position: absolute !important;
  bottom: var(--spacing-m);
  right: var(--spacing-m);
  z-index: 2;
}
</style>
