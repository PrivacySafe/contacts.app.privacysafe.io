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

// @deno-types="../shared-libs/sqlite-on-3nstorage/index.d.ts"
import { SQLiteOn3NStorage } from '../../shared-libs/sqlite-on-3nstorage/index.js';
import { randomStr } from '../../src/common/services/base/random.ts';
import { contactDb } from './contacts-db.ts';
import { filesStoreService } from './files-store-service.ts';
import { ObserversSet } from '../../shared-libs/observer-utils.ts';
import { handleDbFileSyncConflict } from './utils.ts';
import { CONTACTS_DB_FILE, IMAGES_FOLDER } from '../constants.ts';
import type { ContactEvent, Person, PersonView } from '../../src/common/types/index.ts';

export interface ContactsData {
  fs: web3n.files.WritableFS;

  emitContactEvent(event: ContactEvent): void;

  watchEvent(obs: web3n.Observer<ContactEvent>): () => void;

  insertContact(contact: Omit<Person, 'timestamp'>): Promise<string>;

  updateContact(contact: Person | Omit<Person, 'timestamp'>): Promise<void>;

  getContact(id: string): Promise<Person | undefined>;

  getContactList(withImage?: boolean): Promise<PersonView[]>;

  deleteContact(id: string): Promise<boolean>;

  addImage(
    { base64, id, withUploadParentFolder }:
    { base64: string; id?: string; withUploadParentFolder?: boolean },
  ): Promise<string>;

  getImage(id: string): Promise<string>;

  deleteImage(id: string): Promise<void>;

  fileObs(event: web3n.files.FileEvent | web3n.files.RemoteEvent): Promise<void>;

  imagesFolderObs(event: web3n.files.FolderEvent | web3n.files.RemoteEvent): Promise<void>;

  removeUnnecessaryImageFiles(): Promise<void>;

  checkSyncStatus(): Promise<'synced' | 'unsynced'>;
}

export async function contactsDataSet(): Promise<ContactsData> {
  const updateEventsObservers = new ObserversSet<ContactEvent>();
  let isSynchronizationModeInitiated = false;
  const synchronizationQueue: `${'upload' | 'download' | 'adopt'}:${string}:${string}`[] = []; // an item of type `upload:${path}` or `download:${path}:${version}` or `adopt:${path}`

  const fs = await w3n.storage!.getAppSyncedFS();
  const file = await fs.writableFile(CONTACTS_DB_FILE);
  const imagesFolder = await fs.writableSubRoot(IMAGES_FOLDER);

  const sqlite = await SQLiteOn3NStorage.makeAndStart(file);
  const contactDbSrv = await contactDb(sqlite);
  await sqlite.saveToFile({ skipUpload: true });
  const filesSrv = await filesStoreService(imagesFolder);

  async function imageFileSyncModeInit(file: web3n.files.ListingEntry) {
    const path = `${IMAGES_FOLDER}/${file.name}`;
    try {
      const status = await fs.v?.sync?.status(path);
      if (status?.state === 'synced') {
        if (!await fs.v?.sync?.isRemoteVersionOnDisk(path, status.synced!.latest!)) {
          fs.v?.sync?.download(path, status.synced!.latest!);
        }
        return;
      }

      if (status?.state === 'unsynced') {
        await fs.v?.sync?.upload(path);
      }
    } catch (e) {
      if (!(e as web3n.files.FileException).notFound) {
        w3n.log('error', `Error processing a synchronization state of the file ${path}. `, e);
        throw e;
      }
    }
  }

  async function imagesFolderSyncModeInit() {
    try {
      const imagesFolderSyncStatus = await fs.v?.sync?.status(IMAGES_FOLDER);
      if (imagesFolderSyncStatus?.state === 'unsynced') {
        await fs.v?.sync?.upload(IMAGES_FOLDER);
      } else if (imagesFolderSyncStatus?.state === 'behind') {
        await fs.v?.sync?.adoptRemote(IMAGES_FOLDER);
        await fs.v?.sync?.download(IMAGES_FOLDER, imagesFolderSyncStatus.remote!.latest!);
      } else if (imagesFolderSyncStatus?.state === 'conflicting') {
        w3n.log(
          'info',
          'The contacts images folder is conflict of synchronization. ',
          JSON.stringify(imagesFolderSyncStatus, null, 2),
        );

        const diff = await fs.v?.sync?.diffCurrentAndRemoteFolderVersions(IMAGES_FOLDER);
        if (diff) {
          const { inCurrent, inRemote = [] } = diff;
          if (inRemote.length === 0 && !inCurrent) {
            await fs.v?.sync?.adoptRemote(IMAGES_FOLDER);
            await fs.v?.sync?.download(IMAGES_FOLDER, imagesFolderSyncStatus.remote!.latest!);
          } else {
            const newCurrentImageIds = inRemote.map(i => i.name);
            for (const imageId of newCurrentImageIds) {
              await fs.v?.sync?.adoptRemoteFolderItem(IMAGES_FOLDER, imageId);
              fs.v?.sync?.status(`${IMAGES_FOLDER}/${imageId}`).then(status => {
                fs.v?.sync?.download(
                  `${IMAGES_FOLDER}/${imageId}`,
                  (status.remote?.latest || status.synced?.latest) as number,
                );
              });
            }

            await fs?.v?.sync?.upload(IMAGES_FOLDER, { uploadVersion: diff.remoteVersion });
            if (!imagesFolderSyncStatus?.existsInSyncedParent) {
              await fs.v?.sync?.upload('');
            }
          }
        } else {
          await fs.v?.sync?.adoptRemote(IMAGES_FOLDER);
          await fs.v?.sync?.download(IMAGES_FOLDER, imagesFolderSyncStatus.remote!.latest!);
        }
      }
    } catch (e) {
      w3n.log('error', 'Error processing a synchronization state of the images folder. ', e);
      throw e;
    }
  }

  async function dbFileSyncModeInit(sqlite: SQLiteOn3NStorage): Promise<web3n.files.SyncStatus | undefined> {
    if (file.isNew) {
      await fs.v?.sync?.upload(CONTACTS_DB_FILE);
      return fs.v?.sync?.status(CONTACTS_DB_FILE);
    }

    const dbFileSyncStatus = await fs.v?.sync?.status(CONTACTS_DB_FILE);
    if (dbFileSyncStatus?.state === 'unsynced') {
      await fs.v?.sync?.upload(CONTACTS_DB_FILE);
      return fs.v?.sync?.status(CONTACTS_DB_FILE);
    }

    if (dbFileSyncStatus?.state === 'synced') {
      if (!await fs.v?.sync?.isRemoteVersionOnDisk(CONTACTS_DB_FILE, dbFileSyncStatus.synced!.latest!)) {
        await fs.v?.sync?.download(CONTACTS_DB_FILE, dbFileSyncStatus.synced!.latest!);
      }

      return fs.v?.sync?.status(CONTACTS_DB_FILE);
    }

    if (dbFileSyncStatus?.state === 'behind') {
      await fs.v?.sync?.adoptRemote(CONTACTS_DB_FILE);
      await fs.v?.sync?.download(CONTACTS_DB_FILE, dbFileSyncStatus.remote!.latest!);
      await sqlite.reloadDb();
      return fs.v?.sync?.status(CONTACTS_DB_FILE);
    }

    if (dbFileSyncStatus?.state === 'conflicting') {
      w3n.log(
        'info',
        'The contacts DB-file is conflict of synchronization. ',
        JSON.stringify(dbFileSyncStatus, null, 2),
      );

      await handleDbFileSyncConflict(
        fs,
        sqlite,
        dbFileSyncStatus,
        updateContactsTable,
      );

      return fs.v?.sync?.status(CONTACTS_DB_FILE);
    }
  }

  async function syncModeInit(sqlite: SQLiteOn3NStorage): Promise<void> {
    const isDeviceOnline = await w3n.connectivity?.isOnline();
    if (isDeviceOnline?.includes('offline')) {
      return;
    }

    try {
      const imagesFolderList = await fs.listFolder(IMAGES_FOLDER);
      for (const file of imagesFolderList) {
        await imageFileSyncModeInit(file);
      }

      await imagesFolderSyncModeInit();
      const dbFileSyncStatus = await dbFileSyncModeInit(sqlite);
      if (!dbFileSyncStatus?.existsInSyncedParent) {
        await fs.v?.sync?.upload('');
      }

      isSynchronizationModeInitiated = true;
      await removeUnnecessaryImageFiles();
    } catch (e) {
      w3n.log('error', 'Error while the sync mode initialization. ', e);
    }
  }

  async function uploadSync(path: string): Promise<void> {
    try {
      // console.info(`### UPLOAD ### IS SYNC INITIATED = ${isSynchronizationModeInitiated} # PATH = ${path} # QUEUE = ${JSON.stringify(synchronizationQueue)}`);
      if (isSynchronizationModeInitiated) {
        await fs.v?.sync?.upload(path);
        await checkSyncStatus();
      } else {
        synchronizationQueue.push(`upload:${path}:`);
      }
    } catch (e) {
      if ((e as web3n.ConnectException).type === 'connect' || (e as web3n.RuntimeException).type === 'fs-sync') {
        synchronizationQueue.push(`upload:${path}:`);
      } else {
        w3n.log('error', `Error while sync upload ${path} `, JSON.stringify(e, null, 2));
      }
    }
  }

  async function adoptRemoteSync(path: string): Promise<void> {
    try {
      // console.info(`### ADOPT ### IS SYNC INITIATED = ${isSynchronizationModeInitiated} # PATH = ${path} # QUEUE = ${JSON.stringify(synchronizationQueue)}`);
      if (isSynchronizationModeInitiated) {
        await fs.v?.sync?.adoptRemote(path);
        await checkSyncStatus();
      } else {
        synchronizationQueue.push(`adopt:${path}:`);
      }
    } catch (e) {
      if ((e as web3n.ConnectException).type === 'connect' || (e as web3n.RuntimeException).type === 'fs-sync') {
        synchronizationQueue.push(`adopt:${path}:`);
      } else {
        w3n.log('error', `Error while sync adopt ${path}`, JSON.stringify(e, null, 2));
      }
    }
  }

  async function downloadSync(path: string, version: number): Promise<void> {
    try {
      // console.info(`### DOWNLOAD ### IS SYNC INITIATED = ${isSynchronizationModeInitiated} # PATH = ${path} # VERSION = ${version} # QUEUE = ${JSON.stringify(synchronizationQueue)}`);
      if (isSynchronizationModeInitiated) {
        await fs.v?.sync?.download(path, version);
        await checkSyncStatus();
      } else {
        synchronizationQueue.push(`download:${path}:${version}`);
      }
    } catch (e) {
      if ((e as web3n.ConnectException).type === 'connect' || (e as web3n.RuntimeException).type === 'fs-sync') {
        synchronizationQueue.push(`download:${path}:${version}`);
      } else {
        w3n.log('error', `Error while sync download version ${version} of  ${path}`, JSON.stringify(e, null, 2));
      }
    }
  }

  function emitContactEvent(event: ContactEvent): void {
    updateEventsObservers.next(event);
  }

  function watchEvent(obs: web3n.Observer<ContactEvent>): () => void {
    updateEventsObservers.add(obs);
    return () => updateEventsObservers.delete(obs);
  }

  async function checkSyncStatus(): Promise<'synced' | 'unsynced'> {
    const dbFileSyncStatus = await fs.v?.sync?.status(CONTACTS_DB_FILE);
    const imageFolderSyncStatus = await fs.v?.sync?.status(IMAGES_FOLDER);
    const syncStatus = dbFileSyncStatus?.state === 'synced' && imageFolderSyncStatus?.state === 'synced' ? 'synced' : 'unsynced';
    emitContactEvent({ event: 'syncstatus:change', status: syncStatus });
    return syncStatus;
  }

  async function insertContact(contact: Omit<Person, 'timestamp'>): Promise<string> {
    const contactId = contactDbSrv.insertContactInto(contact);
    await sqlite.saveToFile({ skipUpload: true });
    await uploadSync(CONTACTS_DB_FILE);
    return contactId;
  }

  async function updateContact(contact: Person | Omit<Person, 'timestamp'>): Promise<void> {
    contactDbSrv.updateContactInto(contact);
    await sqlite.saveToFile({ skipUpload: true });
    await uploadSync(CONTACTS_DB_FILE);
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

    const imageFile = await filesSrv.getFile(avatarId);
    contact.avatarImage = imageFile ? await (imageFile as web3n.files.ReadonlyFile).readTxt() : '';
    return contact;
  }

  async function getContactList(withImage?: boolean): Promise<PersonView[]> {
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

  async function deleteContact(id: string): Promise<boolean> {
    const dbChanged = contactDbSrv.deleteContactFrom(id);
    if (dbChanged) {
      await sqlite.saveToFile({ skipUpload: true });
      await uploadSync(CONTACTS_DB_FILE);
    }
    return dbChanged;
  }

  async function updateContactsTable(contacts: PersonView[]): Promise<void> {
    const dbChanged = contactDbSrv.updateContactsTable(contacts);
    if (dbChanged) {
      await sqlite.saveToFile({ skipUpload: true });
    }
  }

  async function addImage(
    { base64, id, withUploadParentFolder }:
    { base64: string; id?: string; withUploadParentFolder?: boolean },
  ): Promise<string> {
    const imageFileId = id || randomStr(20);
    await filesSrv.saveFile({ base64, id: imageFileId });
    await uploadSync(`${IMAGES_FOLDER}/${imageFileId}`);
    withUploadParentFolder && await uploadSync(IMAGES_FOLDER);
    return imageFileId;
  }

  async function getImage(id: string): Promise<string> {
    const imageFile = await filesSrv.getFile(id);
    return imageFile ? (imageFile as web3n.files.ReadonlyFile).readTxt() : '';
  }

  async function deleteImage(id: string, withoutUpload?: boolean): Promise<void> {
    await filesSrv.deleteFile(id);
    await filesSrv.deleteFile(`${id}-mini`);
    !withoutUpload && await uploadSync(IMAGES_FOLDER);
  }

  async function removeUnnecessaryImageFiles() {
    const imageFilesInUse = contactDbSrv.getIdsOfAllFilesInUse();
    const imagesOnFs = (await imagesFolder.listFolder('')).reduce((res, entry) => {
      const { isFile, name } = entry;
      if (isFile) {
        res.push(name);
      }

      return res;
    }, [] as string[]);
    const unnecessaryImageFiles = imagesOnFs.filter(f => !imageFilesInUse.includes(f) && !f.includes('-mini'));
    const promises = [] as Promise<void>[];
    for (const imageId of unnecessaryImageFiles) {
      promises.push(imagesFolder.deleteFile(imageId));
    }
    await Promise.allSettled(promises);
    await uploadSync(IMAGES_FOLDER);
  }

  /* handlers part (handle events on receiver side) */
  async function fileObs(event: web3n.files.FileEvent | web3n.files.RemoteEvent): Promise<void> {
    const { type, path } = event;

    if (type === 'remote-change' && path === CONTACTS_DB_FILE) {
      const dbFileSyncStatus = await fs.v?.sync?.status(CONTACTS_DB_FILE);

      if (dbFileSyncStatus?.state === 'behind') {
        emitContactEvent({ event: 'processing:start' });
        await adoptRemoteSync(CONTACTS_DB_FILE);
        await sqlite.reloadDb();
        emitContactEvent({ event: 'processing:end' });
      } else if (dbFileSyncStatus?.state === 'conflicting') {
        await handleDbFileSyncConflict(
          fs,
          sqlite,
          dbFileSyncStatus,
          updateContactsTable,
        );
      }
    }
  }

  function getImageFilesFromList(list: web3n.files.ListingEntry[]): string[] {
    return list.reduce((res, entry) => {
      const { isFile, name } = entry;
      if (isFile) {
        res.push(name);
      }
      return res;
    }, [] as string[]).sort();
  }

  async function imagesFolderObs(event: web3n.files.FolderEvent | web3n.files.RemoteEvent): Promise<void> {
    const { type, path, newVersion } = event as web3n.files.RemoteChangeEvent;
    if (type === 'remote-change' && path === IMAGES_FOLDER) {
      const imageFolderSyncStatus = await fs.v?.sync?.status(IMAGES_FOLDER, true);

      if (newVersion === imageFolderSyncStatus?.synced?.latest) {
        return;
      }

      const folderList = await fs.listFolder(IMAGES_FOLDER);
      const imageFiles = getImageFilesFromList(folderList);

      await adoptRemoteSync(IMAGES_FOLDER);
      const currentFolderList = await fs.listFolder(IMAGES_FOLDER);
      const currentImageFiles = getImageFilesFromList(currentFolderList);

      const addedFiles = currentImageFiles.filter(item => !imageFiles.includes(item));

      if (addedFiles.length > 0) {
        const addedActionPromises = [];
        for (const id of addedFiles) {
          const path = `${IMAGES_FOLDER}/${id}`;
          const status = await fs.v?.sync?.status(path);
          if (status?.synced && status?.synced.latest) {
            const version = status.synced.latest;
            addedActionPromises.push(downloadSync(path, version));
          }
        }
        await Promise.allSettled(addedActionPromises);
      }
    }
  }

  await syncModeInit(sqlite);

  setInterval(async () => {
    if (!isSynchronizationModeInitiated) {
      await syncModeInit(sqlite);
    }

    while (synchronizationQueue.length > 0) {
      const item = synchronizationQueue[0];
      if (!item) {
        break;
      }

      const [action, path, version = ''] = item.split(':');
      switch (action) {
        case 'upload': {
          await fs.v?.sync?.upload(path);
          synchronizationQueue.shift();
          await checkSyncStatus();
          break;
        }
        case 'adopt': {
          await fs.v?.sync?.adoptRemote(path);
          synchronizationQueue.shift();
          await checkSyncStatus();
          break;
        }
        case 'download': {
          const ver = version ? Number(version) : 1;
          await fs.v?.sync?.download(path, ver);
          synchronizationQueue.shift();
          await checkSyncStatus();
          break;
        }
        default:
          break;
      }
    }
  }, 60000); // every 1 minute

  setInterval(async () => {
    await removeUnnecessaryImageFiles();
  }, 604800000); // every 1 week

  return {
    fs,
    emitContactEvent,
    watchEvent,
    insertContact,
    updateContact,
    getContact,
    getContactList,
    deleteContact,
    addImage,
    getImage,
    deleteImage,
    fileObs,
    imagesFolderObs,
    removeUnnecessaryImageFiles,
    checkSyncStatus,
  };
}
