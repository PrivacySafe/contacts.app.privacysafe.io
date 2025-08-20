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

import { ContactsStore } from '@main/common/store/contacts.store.js';
import { itCond } from '../libs-for-tests/jasmine-utils.js';
import { TestSetupContainer } from '@tests/setups.js';
import { ContactsException, PersonView } from '@main/common/types/index.js';

function findInContactListFrom(
	contactsStore: ContactsStore, addr: string
): PersonView|undefined {
	return Object.values(contactsStore.contactList).find(
    ({ mail }) => (mail === addr)
  );
}

async function deleteAllContactsExceptOneFrom(
  contactsStore: ContactsStore, exceptId: string
): Promise<void> {
  console.log(`contact ids:`, Object.keys(contactsStore.contactList));
  for (const id of Object.keys(contactsStore.contactList)) {
    if (id !== exceptId) {
      await contactsStore.deleteContact(id);
    }
  }
}

describe(`ContactsStore`, () => {

  let contactsStore: ContactsStore;
  let fstUserAddr: string;
  let sndUserAddr: string;
  let ownId: string;

  beforeAll(() => {
    ({
      contactsStore, fstUserAddr, sndUserAddr
    } = (window as any as TestSetupContainer).testSetup);

    const ownUser = Object.values(contactsStore.contactList).find(c => c.mail === fstUserAddr);
    ownId = ownUser?.id || '';
  });

  afterAll(async () => {
    await deleteAllContactsExceptOneFrom(contactsStore, ownId);
  })

  itCond(`own address is present by default`, async () => {
    console.log(`contactsStore is`, contactsStore);
    await contactsStore.fetchContacts();
    const ownContact = Object.values(contactsStore.contactList).find(c => c.mail === fstUserAddr);
    expect(ownContact).toBeDefined();
  });

  itCond(`lists, adds and removes contacts`, async () => {
    const contactAddr = sndUserAddr;

    if (!findInContactListFrom(contactsStore, contactAddr)) {
      await contactsStore.upsertContact({
        id: 'new',
        mail: contactAddr
      });
      expect(findInContactListFrom(contactsStore, contactAddr))
      .withContext(`address is present after addition`)
      .toBeDefined();
    }

    const contact = findInContactListFrom(contactsStore, contactAddr);
    if (!contact) {
      fail(`Contact should've been created and available in list`);
      return;
    }

    // creating contact with same address
    await contactsStore.upsertContact({
      id: 'new',
      mail: contactAddr
    })
    .then(
      res => {
        if (!res) {
          fail(`Creating new contact with existing address should fail`)
        }
      },
      (err: ContactsException) => {
        expect(err.contactAlreadyExists).toBeTrue();
      }
    );

    await contactsStore.deleteContact(contact.id);
    expect(findInContactListFrom(contactsStore, contactAddr))
    .withContext(`contact should be removed`)
    .toBeUndefined();
  });
});
