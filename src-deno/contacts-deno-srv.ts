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
import { MultiConnectionIPCWrap } from '../shared-libs/ipc/ipc-service.js';
import { ObserversSet } from '../shared-libs/observer-utils.ts';
import { SQLiteOn3NStorage } from '../shared-libs/sqlite-on-3nstorage/index.js';
import { setupGlobalReportingOfUnhandledErrors } from '../shared-libs/error-handling.ts';
import { sleep } from '../shared-libs/processes/sleep.ts';
import { filesStoreService } from './file-store-service/files-store-service.ts';
import { contactDb } from './dataset/contacts-db.ts';
import { checkServerConnection } from './utils/check-server-connection.ts';
import {
  removeUnnecessaryImageFiles as _removeUnnecessaryImageFiles,
} from './utils/remove-unnecessary-image-files.ts';
import { handleRootFolderSyncStatus } from './utils/handle-root-folder-sync-status.ts';
import { handleImagesFolderSyncStatus } from './utils/handle-images-folder-sync-status.ts';
import { handleDbFileSyncStatus } from './utils/handle-db-file-sync-status.ts';
import { randomStr } from '../src/common/services/base/random.ts';
import { syncUpload } from './utils/sync-upload.ts';
import { CONTACTS_DB_FILE, IMAGES_FOLDER } from './constants.ts';
import type { ContactEvent, Person } from '../src/types/index.ts';

export interface ContactsDenoSrv {
  fs: web3n.files.WritableFS;
  emitStorageEvent: (event: ContactEvent) => void;
  watchEvent: (obs: web3n.Observer<ContactEvent>) => () => void;

  addImage: (
    { base64, id, withUploadParentFolder }:
    { base64: string; id?: string; withUploadParentFolder?: boolean },
  ) => Promise<string>;
  getImage: (id: string) => Promise<string>;
  deleteImage: (id: string, withoutUpload?: boolean) => Promise<void>;

  addContact: (contact: Omit<Person, 'timestamp'>) => Promise<Person | {
    errorType: string;
    errorMessage: string;
  }>;
  updateContact: (contact: Person | Omit<Person, 'timestamp'>) => Promise<Person>;
  upsertContact: (contact: Person | Omit<Person, 'timestamp'>) => Promise<Person | {
    errorType: string;
    errorMessage: string
  }>;
  deleteContact: (id: string, withoutParentUpload?: boolean) => Promise<void>;
  getContactList: (withImage?: boolean) => Promise<Person[]>;
  getContact: (id: string) => Promise<Person | undefined>;
  getContactByMail: (mail: string) => Promise<Person | undefined>;

  removeUnnecessaryImageFiles: () => Promise<void>;
  initialSyncProcess: () => Promise<void>;
}

async function contactsDenoSrv(): Promise<ContactsDenoSrv> {
  const fs = await w3n.storage!.getAppSyncedFS();
  const file = await fs.writableFile(CONTACTS_DB_FILE);
  const imagesFolder = await fs.writableSubRoot(IMAGES_FOLDER);

  const filesSrv = await filesStoreService(imagesFolder);
  const sqlite = await SQLiteOn3NStorage.makeAndStart(file);
  const contactDbSrv = await contactDb(sqlite);
  await sqlite.saveToFile({ skipUpload: true });

  const updateEventsObservers = new ObserversSet<ContactEvent>();

  setupGlobalReportingOfUnhandledErrors(true);

  function emitStorageEvent(event: ContactEvent) {
    updateEventsObservers.next(event);
  }

  function watchEvent(obs: web3n.Observer<ContactEvent>): () => void {
    updateEventsObservers.add(obs);
    return () => updateEventsObservers.delete(obs);
  }

  fs.watchTree('', 3, {
    next: async val => {
      // console.log('[🔔] WATCH_TREE => ', JSON.stringify(val));
      const { type, path } = val;
      const processedPath = path.replace('./', '');

      // eslint-disable-next-line default-case
      switch (type) {
        case 'download-done': {
          emitStorageEvent({
            event: 'sync:end',
            payload: { path: processedPath },
          });
          break;
        }

        case 'upload-done': {
          emitStorageEvent({
            event: 'sync:end',
            payload: { path: processedPath },
          });
          break;
        }

        case 'remote-change': {
          if (processedPath === CONTACTS_DB_FILE) {
            await handleDbFileSyncStatus(fs, sqlite, emitStorageEvent, contactDbSrv);
          } else if (processedPath.includes(IMAGES_FOLDER)) {
            await handleImagesFolderSyncStatus(fs, emitStorageEvent);
          } else {
            await handleRootFolderSyncStatus(fs, sqlite, emitStorageEvent, contactDbSrv);
          }
          break;
        }
      }
    },
    error: err => w3n.log('error', 'Error watching the synced FS tree', err),
  });

  /* images code block */
  async function addImage(
    { base64, id, withUploadParentFolder }:
    { base64: string; id?: string; withUploadParentFolder?: boolean },
  ): Promise<string> {
    const imageFileId = id || randomStr(20);
    await filesSrv.saveFile({ base64, id: imageFileId });
    await syncUpload({ fs, path: `${IMAGES_FOLDER}/${imageFileId}`, emitStorageEvent });

    if (withUploadParentFolder) {
      await syncUpload({ fs, path: IMAGES_FOLDER, emitStorageEvent, immediately: true });
    }

    return imageFileId;
  }

  async function getImage(id: string): Promise<string> {
    const imageFile = await filesSrv.getFile(id);
    if (imageFile) {
      return (imageFile as web3n.files.ReadonlyFile).readTxt();
    }

    if (!imageFile && typeof imageFile === 'string') {
      return '[error]';
    }

    return '';
  }

  async function deleteImage(id: string, withoutUpload?: boolean): Promise<void> {
    await filesSrv.deleteFile(id);
    await filesSrv.deleteFile(`${id}-mini`);
    if (!withoutUpload) {
      await syncUpload({ fs, path: IMAGES_FOLDER, emitStorageEvent, immediately: true });
    }
  }

  /* contacts code block */
  async function addContact(contact: Omit<Person, 'timestamp'>): Promise<Person | {
    errorType: string;
    errorMessage: string;
  }> {
    const isThereSuchContact = !!(await getContactByMail(contact.mail));
    if (isThereSuchContact) {
      return {
        errorType: 'exists',
        errorMessage: `There is already the contact with mail ${contact.mail}`,
      };
    }

    const addedContact = await contactDbSrv.insertContactInto({ contact });
    emitStorageEvent({
      event: 'add:contact',
      payload: {
        data: addedContact,
      },
    });
    await syncUpload({ fs, path: CONTACTS_DB_FILE, emitStorageEvent });
    return addedContact;
  }

  async function updateContact(contact: Person | Omit<Person, 'timestamp'>): Promise<Person> {
    const updatedContact = await contactDbSrv.updateContactInto(contact);
    emitStorageEvent({
      event: 'update:contact',
      payload: {
        data: updatedContact,
      },
    });
    await syncUpload({ fs, path: CONTACTS_DB_FILE, emitStorageEvent });
    return updatedContact;
  }

  async function upsertContact(contact: Person | Omit<Person, 'timestamp'>): Promise<Person | {
    errorType: string;
    errorMessage: string
  }> {
    if (contact.id === 'new') {
      return await addContact(contact);
    }

    return await updateContact(contact);
  }

  async function deleteContact(id: string, withoutParentUpload?: boolean): Promise<void> {
    await contactDbSrv.deleteContactFrom(id);
    emitStorageEvent({
      event: 'remove:contact',
      payload: { id },
    });

    if (!withoutParentUpload) {
      await syncUpload({ fs, path: CONTACTS_DB_FILE, emitStorageEvent });
    }
  }

  async function getContactList(withImage?: boolean): Promise<Person[]> {
    const list = contactDbSrv.listAllContactsFrom();
    if (!withImage) {
      return list;
    }

    for (const contact of list) {
      const { avatarId } = contact;
      if (avatarId) {
        contact.avatarImage = await getImage(`${avatarId}-mini`);
      }
    }
    return list;
  }

  async function getContact(id: string): Promise<Person | undefined> {
    const contact = contactDbSrv.getContactFrom(id);
    if (!contact) {
      return undefined;
    }

    const { avatarId } = contact;
    if (!avatarId) {
      return contact;
    }

    contact.avatarImage = await getImage(avatarId);
    return contact;
  }

  async function getContactByMail(mail: string): Promise<Person | undefined> {
    if (!mail) {
      return undefined;
    }

    const contact = contactDbSrv.getContactByMail(mail);
    if (!contact) {
      return undefined;
    }

    const { avatarId } = contact;
    if (!avatarId) {
      return contact;
    }

    contact.avatarImage = await getImage(avatarId);
    return contact;
  }

  /* utils code block */
  async function removeUnnecessaryImageFiles() {
    return _removeUnnecessaryImageFiles(fs, contactDbSrv.getIdsOfAllFilesInUse, emitStorageEvent);
  }

  async function initialSyncProcess(): Promise<void> {
    const isThereConnection = await checkServerConnection(fs);
    if (!isThereConnection) {
      setTimeout(() => {
        initialSyncProcess();
        return;
      }, 60000);
    }

    try {
      await handleDbFileSyncStatus(fs, sqlite, emitStorageEvent, contactDbSrv);
      await handleImagesFolderSyncStatus(fs, emitStorageEvent);
      await handleRootFolderSyncStatus(fs, sqlite, emitStorageEvent, contactDbSrv);

      await removeUnnecessaryImageFiles();
    } catch (err) {
      w3n.log('error', '🔥 Error while initial synchronization process. ', err);
    }
  }

  return {
    fs,
    emitStorageEvent,
    watchEvent,

    addImage,
    getImage,
    deleteImage,

    addContact,
    updateContact,
    upsertContact,
    deleteContact,
    getContactList,
    getContact,
    getContactByMail,

    removeUnnecessaryImageFiles,
    initialSyncProcess,
  };
}

export type ContactsDenoSrvInternal = Omit<ContactsDenoSrv, 'fs' | 'addContact' | 'updateContact' | 'getContactByMail'>;
export type ContactsDenoSrvExternal = Pick<ContactsDenoSrv, 'getContactByMail' | 'addContact' | 'upsertContact' | 'getContact' | 'getContactList'>;

contactsDenoSrv()
  .then(srv => {
    const srvWrapInternal = new MultiConnectionIPCWrap('AppContactsInternal');
    const srvWrap = new MultiConnectionIPCWrap('AppContacts');

    srvWrapInternal.exposeReqReplyMethods<ContactsDenoSrvInternal>(srv, [
      'addImage',
      'getImage',
      'deleteImage',

      'upsertContact',
      'deleteContact',
      'getContactList',
      'getContact',

      'removeUnnecessaryImageFiles',
      'initialSyncProcess',
    ]);
    srvWrapInternal.exposeObservableMethods<Pick<ContactsDenoSrv, 'watchEvent'>>(srv, [
      'watchEvent',
    ]);
    srvWrapInternal.startIPC();

    srvWrap.exposeReqReplyMethods<ContactsDenoSrvExternal>(srv, [
      'getContactByMail',
      'addContact',
      'upsertContact',
      'getContact',
      'getContactList',
    ]);
    srvWrap.startIPC();
  })
  .catch(async err => {
    await w3n.log('error', '🔥 Error in a startup of contacts deno service component. ', err);
    await sleep(10);
    w3n.closeSelf();
  });
