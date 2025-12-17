/*
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
*/
import { ref } from 'vue';
import { defineStore } from 'pinia';
import isEmpty from 'lodash/isEmpty';
import { toRO } from '@main/common/utils/readonly';
import { appContactsSrvProxy } from '@main/common/services/services-provider';
import { useAppStore } from '@main/common/store/app.store';
import type { Person, PersonView } from '@main/common/types';

export type ContactsStore = ReturnType<typeof useContactsStore>;

export const useContactsStore = defineStore('contacts', () => {
  const appStore = useAppStore();

  const contactList = ref<Record<string, PersonView>>({});

  async function upsertContact(contact: Omit<Person, 'timestamp'>): Promise<string | { errorType: string; errorMessage: string }> {
    const res = await appContactsSrvProxy.upsertContact(contact);

    await fetchContacts();
    return res;
  }

  async function getContact(contactId: string): Promise<Person | undefined> {
    return appContactsSrvProxy.getContact(contactId);
  }

  async function fetchContacts(withImage?: boolean): Promise<void> {
    const lst = await appContactsSrvProxy.getContactList(withImage);

    if (!isEmpty(lst)) {
      contactList.value = lst.reduce((res, item) => {
        res[item.id] = item;
        if (item.mail === appStore.user) {
          item.name = 'Me';
        }

        return res;
      }, {} as Record<string, PersonView>);
    }
  }

  function upsertContactListItem(id: string, data: Partial<PersonView>) {
    if (contactList.value[id]) {
      contactList.value[id] = {
        ...contactList.value[id],
        id,
        ...data,
      };
    } else {
      contactList.value[id] = {
        id,
        avatarId: '',
        avatarImage: '',
        mail: '',
        name: '',
        timestamp: 0,
        ...data,
      };
    }
  }

  async function deleteContact(contactId: string): Promise<void> {
    if (contactId) {
      await appContactsSrvProxy.deleteContact(contactId);
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete contactList.value[contactId];
    }
  }

  async function deleteContacts(contactIds: string[]): Promise<void> {
    if (isEmpty(contactIds)) {
      return;
    }

    const pr = contactIds.map(id => appContactsSrvProxy.deleteContact(id));
    await Promise.allSettled(pr);
    for (const contactId of contactIds) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete contactList.value[contactId];
    }
  }

  return {
    contactList: toRO(contactList),
    upsertContactListItem,
    fetchContacts,
    getContact,
    upsertContact,
    deleteContact,
    deleteContacts,
  };
});
