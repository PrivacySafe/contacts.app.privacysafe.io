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
import type { ContactsService } from '@main/common/types';

export let appContactsSrvProxy: ContactsService;

export async function initializeServices() {
  try {
    const srvConn = await w3n.rpc!.thisApp!('AppContactsInternal');
    appContactsSrvProxy = makeServiceCaller<ContactsService>(
      srvConn, [
        'isThereContactWithTheMail',
        'upsertContact',
        'getContact',
        'getContactList',
        'deleteContact',
        'addImage',
        'deleteImage',
        'removeUnnecessaryImageFiles',
      ],
    ) as ContactsService;

    console.info('<- SERVICES ARE INITIALIZED ->');
  } catch (e) {
    console.error('# ERROR WHILE SERVICES INITIALISE # ', e);
  }
}
