/*
 Copyright (C) 2020-2025 3NSoft Inc.

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

/* eslint-disable @typescript-eslint/triple-slash-reference, max-len */
/// <reference path="../@types/platform-defs/injected-w3n.d.ts" />
/// <reference path="../@types/platform-defs/test-stand.d.ts" />
// @deno-types="../shared-libs/ipc/ipc-service.d.ts"
import { MultiConnectionIPCWrap } from '../shared-libs/ipc/ipc-service.js';
import { setupGlobalReportingOfUnhandledErrors } from '../shared-libs/error-handling.ts';
import { AppContactsService, ContactsService, Person, PersonView } from '../src/types/index.ts';
import { sleep } from '../shared-libs/processes/sleep.ts';
import { ContactsData } from './dataset/index.ts';
import { ensureASMailAddressExists } from './contact-checks.ts';

setupGlobalReportingOfUnhandledErrors(true);

class ContactsServiceInstance implements ContactsService, AppContactsService {
  private readonly observers = new Set<web3n.Observer<PersonView[]>>();

  constructor(
    private readonly data: ContactsData
  ) {}

  static async initialization(): Promise<ContactsServiceInstance | undefined> {
    const data = await ContactsData.makeAndStart();
    return new ContactsServiceInstance(data);
  }

  // XXX this can be replaced by insertContact and updateContact
  async upsertContact(contact: Person): Promise<void> {
    if (contact.id === 'new') {
      await this.insertContact(contact);
    } else {
      await this.updateContact(contact);
    }
  }

  async updateContact(contact: Person): Promise<void> {
    await this.data.updateContact(contact);
    this.sendUpdatedListToObservers();
  }

  async insertContact(contact: Person): Promise<void> {
    await ensureASMailAddressExists(contact.mail);
    await this.data.insertContact(contact);
    this.sendUpdatedListToObservers();
  }

  private sendUpdatedListToObservers(): void {
    const contactList = this.data.getContactList();
    for (const obs of this.observers) {
      if (obs.next) {
        obs.next(contactList);
      }
    }
  }

  async getContact(id: string): Promise<Person|undefined> {
    return this.data.getContact(id);
  }

  async getContactList(): Promise<PersonView[]> {
    return this.data.getContactList();
  }

  watchContactList(obs: web3n.Observer<PersonView[]>): () => void {
    this.observers.add(obs);
    return () => this.observers.delete(obs);
  }

  async deleteContact(id: string) {
    const dbChanged = await this.data.deleteContact(id);
    if (dbChanged) {
      this.sendUpdatedListToObservers();
    }
  }

  completeAllWatchers(): void {
    for (const obs of this.observers) {
      if (obs.complete) {
        obs.complete();
      }
    }
    this.observers.clear();
  }
}

ContactsServiceInstance.initialization()
.then(async srv => {
  if (srv) {
    const srvWrapInternal = new MultiConnectionIPCWrap('AppContactsInternal');
    const srvWrap = new MultiConnectionIPCWrap('AppContacts');

    srvWrapInternal.exposeReqReplyMethods<AppContactsService>(srv, [
      'upsertContact', 'insertContact', 'updateContact',
      'getContact', 'getContactList', 'deleteContact'
    ]);
    srvWrapInternal.exposeObservableMethods<AppContactsService>(srv, [
      'watchContactList'
    ]);
    srvWrapInternal.startIPC();

    srvWrap.exposeReqReplyMethods<ContactsService>(srv, [
      'getContact', 'getContactList', 'upsertContact', 'insertContact'
    ]);
    srvWrap.exposeObservableMethods<ContactsService>(srv, [
      'watchContactList'
    ]);
    srvWrap.startIPC();
  }
})
.catch(async err => {
  await w3n.log('error', `Error in a startup of contacts service component`, err);
  await sleep(10);
  w3n.closeSelf();
});

