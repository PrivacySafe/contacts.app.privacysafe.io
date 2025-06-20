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

import { computed, onBeforeUnmount, ref, watch, WatchHandle } from 'vue';
import { debounce, omit } from 'lodash';
import { useRouting } from '@main/desktop/composables/useRouting';
import { useContact } from '@main/common/composables/useContact';
import type { ContactContent, Person } from '@main/common/types';
import { areAddressesEqual } from '@shared/address-utils';

export function useContactPage() {

  const { route, goToContacts, getContactIdFromRoute } = useRouting();

  const {
    rules,
    user,
    contact,
    contactValid,
    contactLetters,
    contactAvatarStyle,
    getContact,
    delContact: commonDelContact,
    saveContact,
    openChat,
    openInbox,
    showContactKeysInfo,
    showOwnKeysInfo,
    personDataFromContact,
  } = useContact();

  const contentEl = ref<HTMLDivElement | null>(null);

  const isUserAddress = computed(() => !!contact.value?.mail && areAddressesEqual(contact.value.mail, user.value));

  const contactId = computed(() => getContactIdFromRoute());

  async function prepareContactFields() {
    if (!contactId.value) return;

    if (contactId.value === 'new') {
      contact.value = {
        id: 'new',
        name: '',
        mail: '',
        notice: '',
        phone: '',
      };
      return;
    }

    const res = await getContact(contactId.value);
    if (res) {
      contact.value = {
        name: '',
        notice: '',
        phone: '',
        ...(omit(res, ['avatar', 'avatarMini', 'activities'])),
      };
    }
  }

  function cancel() {
    goToContacts();
  }

  function delContact() {
    commonDelContact(cancel);
  }

  async function onFieldUpdate({ field, val }: { field: keyof (ContactContent | Person), val: string }) {
    contact.value![field] = val;

    const data = personDataFromContact();

    await saveContact(data);
  }

  const onFieldUpdateDebounced = debounce(onFieldUpdate, 500);

  const routeWatching: WatchHandle = watch(
    () => route.params,
    async () => {
      await prepareContactFields();
      if (contentEl.value) {
        contentEl.value!.scrollTop = 0;
      }
    }, {
      immediate: true,
    },
  );

  onBeforeUnmount(() => {
    routeWatching && routeWatching.stop();
  });

  return {
    isUserAddress,
    contact,
    contactAvatarStyle,
    contactLetters,
    contactValid,
    onFieldUpdateDebounced,
    rules,

    delContact,
    openChat,
    openInbox,
    showContactKeysInfo,
    showOwnKeysInfo,
  };
}
