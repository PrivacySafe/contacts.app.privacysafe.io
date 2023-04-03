/*
 Copyright (C) 2020 3NSoft Inc.

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
import { makeServiceCaller } from '@/libs/ipc-service-caller'

interface AppContacts {
  upsertContact(value: Person): Promise<void>;
  getContact(id: string): Promise<Person>;
  getContactList(): Promise<Person[]>;
  deleteContact(id: string): Promise<void>;
}

export let appContactsSrvProxy: AppContacts

export async function initializationServices() {

  try {
    const srvConn = await w3n.appRPC!('AppContactsInternal')
    appContactsSrvProxy = makeServiceCaller<AppContacts>(
      srvConn, [ 'upsertContact', 'getContact',  'getContactList', 'deleteContact' ]
    ) as AppContacts

    console.info('\n--- initializationServices DONE---\n')
  } catch (e) {
    console.error('\nERROR into initializationServices: ', e)
  }
}
