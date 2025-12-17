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
/// <reference path="../@types/platform-defs/injected-w3n.d.ts" />
/// <reference path="../@types/platform-defs/test-stand.d.ts" />
// @deno-types="../shared-libs/ipc/ipc-service.d.ts"
import { MultiConnectionIPCWrap } from '../shared-libs/ipc/ipc-service.js';
import { setupGlobalReportingOfUnhandledErrors } from '../shared-libs/error-handling.ts';
import { contactsDataSet } from './dataset/dataset.ts';
import { sleep } from '../shared-libs/processes/sleep.ts';
import type { ContactsService, Person, PersonView } from '../src/common/types/index.ts';

async function contactsService(): Promise<ContactsService> {
  const observers = new Set<web3n.Observer<PersonView[]>>();

  const data = await contactsDataSet();

  setupGlobalReportingOfUnhandledErrors(true);

  async function sendUpdatedListToObservers(): Promise<void> {
    const contactList = await data.getContactList();
    for (const obs of observers) {
      if (obs.next) {
        obs.next(contactList);
      }
    }
  }

  async function getContactByMail(mail: string): Promise<Person | undefined> {
    const contactList = await data.getContactList();
    return contactList.find(contact => contact.mail === mail);
  }

  async function getContact(id: string): Promise<Person | undefined> {
    return data.getContact(id);
  }

  async function getContactList(withImage?: boolean): Promise<PersonView[]> {
    return data.getContactList(withImage);
  }

  async function isThereContactWithTheMail(mail: string): Promise<boolean> {
    return !!(await getContactByMail(mail));
  }

  async function insertContact(contact: Person | Omit<Person, 'timestamp'>): Promise<string | {
    errorType: string;
    errorMessage: string
  }> {
    const isThereSuchContact = await isThereContactWithTheMail(contact.mail);

    if (isThereSuchContact) {
      return {
        errorType: 'exists',
        errorMessage: `There is already the contact with mail ${contact.mail}`,
      };
    }

    const contactId = await data.insertContact(contact);
    await sendUpdatedListToObservers();
    return contactId;
  }

  async function updateContact(contact: Person | Omit<Person, 'timestamp'>): Promise<string> {
    await data.updateContact(contact);
    await sendUpdatedListToObservers();
    return contact.id;
  }

  async function upsertContact(contact: Person | Omit<Person, 'timestamp'>): Promise<string | {
    errorType: string;
    errorMessage: string
  }> {
    if (contact.id === 'new') {
      return await insertContact(contact);
    }

    return await updateContact(contact);
  }

  async function deleteContact(id: string) {
    const dbChanged = await data.deleteContact(id);
    if (dbChanged) {
      sendUpdatedListToObservers();
    }
  }

  async function addImage(
    { base64, id, withUploadParentFolder }:
    { base64: string; id?: string; withUploadParentFolder?: boolean },
  ): Promise<string> {
    return data.addImage({ base64, id, withUploadParentFolder });
  }

  async function getImage(id: string): Promise<string> {
    return data.getImage(id);
  }

  async function deleteImage(id: string): Promise<void> {
    return data.deleteImage(id);
  }

  function removeUnnecessaryImageFiles() {
    return data.removeUnnecessaryImageFiles();
  }

  function watchContactList(obs: web3n.Observer<PersonView[]>): () => void {
    observers.add(obs);
    return () => observers.delete(obs);
  }

  function completeAllWatchers(): void {
    for (const obs of observers) {
      if (obs.complete) {
        obs.complete();
      }
    }
    observers.clear();
  }

  data.fs.watchFile('contacts-db', {
    next: data.fileObs,
    error: e => w3n.log('error', 'Error watching DB-file. ', e),
  });

  data.fs.watchFolder('images', {
    next: data.imagesFolderObs,
    error: e => w3n.log('error', 'Error watching the images folder. ', e),
  });

  return {
    isThereContactWithTheMail,
    getContactByMail,
    getContact,
    getContactList,
    insertContact,
    updateContact,
    upsertContact,
    deleteContact,
    addImage,
    getImage,
    deleteImage,
    removeUnnecessaryImageFiles,
    watchContactList,
    completeAllWatchers,
    checkSyncStatus: data.checkSyncStatus,
    watchEvent: data.watchEvent,
  };
}

contactsService()
  .then(async srv => {
    const srvWrapInternal = new MultiConnectionIPCWrap('AppContactsInternal');
    const srvWrap = new MultiConnectionIPCWrap('AppContacts');

    srvWrapInternal.exposeReqReplyMethods<ContactsService>(srv, [
      'isThereContactWithTheMail',
      'getContactByMail',
      'upsertContact',
      'insertContact',
      'updateContact',
      'getContact',
      'getContactList',
      'deleteContact',
      'addImage',
      'getImage',
      'deleteImage',
      'removeUnnecessaryImageFiles',
      'checkSyncStatus',
    ]);
    srvWrapInternal.exposeObservableMethods<ContactsService>(srv, [
      'watchContactList',
      'watchEvent',
    ]);
    srvWrapInternal.startIPC();

    srvWrap.exposeReqReplyMethods<ContactsService>(srv, [
      'isThereContactWithTheMail',
      'getContactByMail',
      'getContact',
      'getContactList',
      'upsertContact',
      'insertContact',
    ]);
    srvWrap.exposeObservableMethods<ContactsService>(srv, [
      'watchContactList',
    ]);
    srvWrap.startIPC();
  })
  .catch(async err => {
    await w3n.log('error', 'Error in a startup of contacts service component. ', err);
    await sleep(10);
    w3n.closeSelf();
  });
