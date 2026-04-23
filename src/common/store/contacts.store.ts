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
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import isEmpty from 'lodash/isEmpty';
import difference from 'lodash/difference';
import { appContactsSrvProxy } from '@main/common/services/services-provider';
import { useAppStore } from '@main/common/store/app.store';
import type { Person, PersonView, ContactListItem } from '@main/types';

const contactFields: {
  field: Exclude<keyof ContactListItem, 'id'>;
  extraCheck?: boolean;
}[] = [
  { field: 'name' },
  { field: 'mail' },
  { field: 'avatarId' },
  { field: 'avatarImage' },
  { field: 'timestamp' },
];

export const useContactsStore = defineStore('contacts', () => {
  const appStore = useAppStore();

  const contacts = ref<ContactListItem[]>([]);

  const currentContactIds = computed(() => contacts.value.map(c => c.id));

  const contactList = computed(() => {
    return contacts.value
      .sort((a, b) => (a.displayName.toLocaleLowerCase() > b.displayName.toLocaleLowerCase() ? 1 : -1))
      .reduce(
        (res, item) => {
          res[item.id] = item;
          return res;
        },
        {} as Record<string, ContactListItem>,
      );
  });

  const mailAddressesUsed = computed(() => Object.values(contactList.value).map(p => p.mail));

  function isMailAddressInUse(mail: string, ignoredMailAddresses?: string[]): boolean {
    const mailAddressesUsedFiltered = mailAddressesUsed.value.filter(
      a => !(ignoredMailAddresses || []).includes(a),
    );
    return mailAddressesUsedFiltered.includes(mail);
  }

  async function upsertContact(contact: Omit<Person, 'timestamp'>): Promise<
    | Person
    | {
        errorType: string;
        errorMessage: string;
      }
  > {
    const res = await appContactsSrvProxy.upsertContact(contact);

    await fetchContacts({});
    return res;
  }

  async function getContact(contactId: string): Promise<Person | undefined> {
    return appContactsSrvProxy.getContact(contactId);
  }

  async function fetchContacts({
    withImage,
    withFullOverload,
  }: {
    withImage?: boolean;
    withFullOverload?: boolean;
  }): Promise<ContactListItem[]> {
    const list = await appContactsSrvProxy.getContactList(withImage);

    if (isEmpty(list)) {
      contacts.value = [] as ContactListItem[];
      return contacts.value;
    }

    const { newIds, newContacts } = list.reduce(
      (res, item) => {
        const newContact: ContactListItem = {
          id: item.id,
          name: item.mail === appStore.user ? 'Me' : item.name,
          displayName: item.mail === appStore.user ? 'Me' : item.name || item.mail,
          mail: item.mail,
          avatarId: item.avatarId || '',
          avatarImage: item.avatarImage || '',
          timestamp: item.timestamp || 0,
        };

        res.newIds.push(newContact.id);
        res.newContacts.push(newContact);
        return res;
      },
      { newIds: [] as string[], newContacts: [] as ContactListItem[] },
    );

    if (withFullOverload) {
      contacts.value = newContacts;
    } else {
      const addIds = difference(newIds, currentContactIds.value);
      const removeIds = difference(currentContactIds.value, newIds);

      const removeIdsIndexes = contacts.value
        .reduce((res, contact, index) => {
          if (removeIds.includes(contact.id)) {
            res.push(index);
          }
          return res;
        }, [] as number[])
        .sort()
        .reverse();
      for (let i = 0; i < removeIdsIndexes.length; i++) {
        contacts.value.splice(i, 1);
      }

      for (const newContact of newContacts) {
        const { id } = newContact;
        if (addIds.includes(id)) {
          contacts.value.push(newContact);
        }
      }

      for (const item of contacts.value) {
        const { id } = item;
        const newContact = newContacts.find(c => c.id === id)!;

        for (const f of contactFields) {
          const { field, extraCheck } = f;
          const newContactFieldValue: ContactListItem[keyof ContactListItem] = extraCheck
            ? JSON.stringify(newContact[field])
            : newContact[field];

          const contactFieldValue: ContactListItem[keyof ContactListItem] = extraCheck
            ? JSON.stringify(item[field])
            : item[field];

          if (contactFieldValue !== newContactFieldValue) {
            (item[field] as ContactListItem[keyof ContactListItem]) = newContact[field];
          }
        }
      }
    }

    return contacts.value;
  }

  function upsertContactListItem(id: string, data: Partial<PersonView>) {
    const index = contacts.value.findIndex(item => item.id === id);
    if (index >= 0) {
      contacts.value[index] = {
        ...contacts.value[index],
        id,
        ...data,
      };
    } else {
      contacts.value.push({
        id,
        mail: '',
        name: '',
        displayName: '',
        avatarId: '',
        avatarImage: '',
        timestamp: 0,
        ...data,
      });
    }
  }

  async function deleteContact(contactId: string, withoutParentUpload?: boolean): Promise<void> {
    if (contactId) {
      await appContactsSrvProxy.deleteContact(contactId, withoutParentUpload);
      const index = contacts.value.findIndex(item => item.id === contactId);
      if (index >= 0) {
        contacts.value.splice(index, 1);
      }
    }
  }

  async function deleteContacts(contactIds: string[]): Promise<void> {
    if (isEmpty(contactIds)) {
      return;
    }

    for (let i = 0; i < contactIds.length; i++) {
      const withoutParentUpload = i !== contactIds.length - 1;
      await deleteContact(contactIds[i], withoutParentUpload);
    }
  }

  return {
    contacts,
    contactList,
    isMailAddressInUse,
    upsertContactListItem,
    fetchContacts,
    getContact,
    upsertContact,
    deleteContact,
    deleteContacts,
  };
});

export type ContactsStore = ReturnType<typeof useContactsStore>;
