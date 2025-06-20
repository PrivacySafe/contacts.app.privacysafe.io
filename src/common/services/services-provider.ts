/*
 Copyright (C) 2024 3NSoft Inc.

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
import { makeServiceCaller } from '@shared/ipc/ipc-service-caller';
import type { Person } from '@main/common/types';

interface AppContacts {
  isThereContactWithTheMail(mail: string): boolean;
  upsertContact(value: Person): Promise<void | { errorType: string; errorMessage: string }>;
  getContact(id: string): Promise<Person>;
  getContactList(): Promise<Person[]>;
  deleteContact(id: string): Promise<void>;
}

export let appContactsSrvProxy: AppContacts;

export async function initializeServices() {

  try {
    const srvConn = await w3n.rpc!.thisApp!('AppContactsInternal');
    appContactsSrvProxy = makeServiceCaller<AppContacts>(
      srvConn, ['isThereContactWithTheMail', 'upsertContact', 'getContact', 'getContactList', 'deleteContact'],
    ) as AppContacts;

    console.info('<- SERVICES ARE INITIALIZED ->');
  } catch (e) {
    console.error('# ERROR WHILE SERVICES INITIALISE # ', e);
  }
}
