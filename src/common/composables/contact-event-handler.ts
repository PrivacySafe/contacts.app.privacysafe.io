/*
 Copyright (C) 2026 3NSoft Inc.

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
// The routing of ContactEvents coming off the deno service, lifted out of
// useAppView's closure so that it can be exercised without an RPC connection.
// Collaborators arrive as plain functions, keeping this module free of pinia
// and vue-router.
import { CONTACTS_DB_FILE } from '@deno/constants';
import type { ContactEvent } from '@main/types';

export interface ContactEventHandlerDeps {
  addToSyncList: (path: string) => void;
  removeFromSyncList: (path: string) => void;
  cleanSyncList: () => void;
  /**
   * Tells the ui that synchronisation cannot be resumed although the device
   * reports being online. A STATE, not a notice: it is set and later cleared.
   */
  setSyncStuck: (isStuck: boolean) => void;
  emitContactListUpdated: () => void;
  fetchContacts: () => Promise<unknown>;
  /** Name of the currently active route, or undefined when there is none. */
  currentRouteName: () => string | undefined;
  /** The :id param of the currently open contact route. */
  openContactId: () => string | undefined;
  listedContactIds: () => string[];
  goToContactList: () => Promise<unknown>;
}

/** Path reported for the synced FS root, which arrives as an empty string. */
const ROOT_PATH = 'root';

export function makeContactEventHandler(
  deps: ContactEventHandlerDeps,
): (evt: ContactEvent) => Promise<void> {
  return async function handleContactEvent(evt: ContactEvent): Promise<void> {
    // eslint-disable-next-line default-case
    switch (evt.event) {

      case 'sync:start': {
        deps.addToSyncList(evt.payload.path || ROOT_PATH);
        break;
      }

      case 'sync:end': {
        const { path } = evt.payload;
        deps.removeFromSyncList(path || ROOT_PATH);
        if (path === CONTACTS_DB_FILE) {
          deps.emitContactListUpdated();
          await deps.fetchContacts();
        }
        break;
      }

      case 'sync:clean': {
        deps.cleanSyncList();
        console.log(
          '[❗] The sync list was cleared due to: ', evt.payload.reason || ' unknown ',
        );
        break;
      }

      case 'sync:stuck': {
        deps.setSyncStuck(evt.payload.isStuck);
        break;
      }

      case 'update:contact-list': {
        await deps.fetchContacts();
        if (deps.currentRouteName() === 'contact') {
          const openId = deps.openContactId();
          if (!deps.listedContactIds().includes(openId!)) {
            await deps.goToContactList();
          }
        }
        break;
      }

    }
  };
}
