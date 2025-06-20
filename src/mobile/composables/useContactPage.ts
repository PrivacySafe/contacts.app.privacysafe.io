/*
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
*/

import { computed, onBeforeMount, ref } from 'vue';
import cloneDeep from 'lodash/cloneDeep';
import type { ContactContent, Person } from '@main/common/types';
import { useRouting } from '@main/mobile/composables/useRouting';
import { useContact } from '@main/common/composables/useContact';
import { areAddressesEqual } from '@shared/address-utils';

export function useContactPage() {

  const { goToList, goToContact, getContactIdFromRoute, getEditStateFromRoute } = useRouting();

  const {
    user,
    rules,
    contact,
    initialContact,
    contactDisplayName,
    contactValid,
    contactLetters,
    contactAvatarStyle,
    getContact,
    delContact: commonDelContact,
    saveContact: commonSaveContact,
    openChat,
    openInbox,
    personDataFromContact,
  } = useContact();

  const isOwnKeysInfoOpen = ref(false);
  const isContactKeysInfoOpen = ref(false);

  const isUserAddress = computed(() => !!contact.value?.mail && areAddressesEqual(contact.value.mail, user.value));

  const isEditMode = computed(() => getEditStateFromRoute());

  function goBack() {
    goToList();
  }

  function openEditMode() {
    goToContact(contact.value!.id, { edit: true });
  }

  function closeEditMode() {
    if (contact.value!.id === 'new') {
      goBack();
    } else {
      contact.value = cloneDeep(initialContact.value);
      goToContact(contact.value!.id, { edit: false });
    }
  }

  async function saveContact() {
    const data = personDataFromContact();
    await commonSaveContact(data, closeEditMode);
  }

  function delContact() {
    commonDelContact(goBack);
  }

  function onFieldUpdate({ field, val }: { field: keyof (ContactContent | Person), val: string }) {
    contact.value![field] = val;
  }

  function closeKeysInfo() {
    isOwnKeysInfoOpen.value = false;
    isContactKeysInfoOpen.value = false;
  }

  onBeforeMount(async () => {
    const contactId = getContactIdFromRoute()!;
    if (contactId === 'new') {
      contact.value = {
        id: 'new',
        mail: '',
        phone: '',
        notice: '',
      };
    } else {
      contact.value = await getContact(contactId);
    }

    initialContact.value = cloneDeep(contact.value);
  });

  return {
    contact,
    contactDisplayName,
    isUserAddress,
    isEditMode,
    contactValid,
    contactLetters,
    contactAvatarStyle,
    rules,
    isOwnKeysInfoOpen,
    isContactKeysInfoOpen,

    goBack,
    openEditMode,
    openChat,
    openInbox,
    saveContact,
    onFieldUpdate,
    closeEditMode,
    delContact,
    closeKeysInfo,
  };
}
