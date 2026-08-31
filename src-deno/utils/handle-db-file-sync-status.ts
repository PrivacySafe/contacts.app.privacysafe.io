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
import { SQLiteOn3NStorage } from '../../shared-libs/sqlite-on-3nstorage/index.js';
import { ContactDB, objectFromQueryExecResult } from '../dataset/contacts-db.ts';
import { CONTACTS_DB_FILE } from '../constants.ts';
import { syncUpload } from './sync-upload.ts';
import { syncAdopt } from './sync-adopt.ts';
import { syncDownload } from './sync-download.ts';
import { normalizeContactRow, resolveDbFileConflict } from './db-file-conflict.ts';
import  { ContactEvent, RawPerson } from '../../src/types/index.ts';

export async function handleDbFileSyncStatus({ fs, sqlite, contactDbSrv, emitStorageEvent }: {
  fs: web3n.files.WritableFS;
  sqlite: SQLiteOn3NStorage;
  contactDbSrv: ContactDB;
  emitStorageEvent: (event: ContactEvent) => void;
}) {
  const dbFileSyncStatus = await fs.v?.sync?.status(CONTACTS_DB_FILE);
  if (!dbFileSyncStatus) {
    return;
  }

  switch (dbFileSyncStatus.state) {
    case 'unsynced': {
      await syncUpload({
        fs,
        path: CONTACTS_DB_FILE,
        emitStorageEvent,
      });
      break;
    }

    case 'behind': {
      await syncAdopt({
        fs,
        path: CONTACTS_DB_FILE,
        opts: { remoteVersion: dbFileSyncStatus.remote!.latest },
        emitStorageEvent,
      });
      const isRemoteVersionOnDisk = await fs.v?.sync?.isRemoteVersionOnDisk(
        CONTACTS_DB_FILE,
        dbFileSyncStatus.remote!.latest!,
      );

      if (isRemoteVersionOnDisk !== 'complete') {
        await syncDownload({
          fs,
          path: CONTACTS_DB_FILE,
          version: dbFileSyncStatus.remote!.latest!,
          emitStorageEvent,
        });
      }

      await sqlite.reloadDb();
      emitStorageEvent({ event: 'update:contact-list' });
      break;
    }

    case 'conflicting': {
      emitStorageEvent({
        event: 'sync:start',
        payload: { path: CONTACTS_DB_FILE },
      });
      const { bytes } = await fs.v!.readBytes(
        CONTACTS_DB_FILE,
        undefined,
        undefined,
        { remoteVersion: dbFileSyncStatus.remote!.latest },
      );

      const sqliteTemp = await SQLiteOn3NStorage.makeReadonly(bytes!);
      const [sqlValueRemote] = sqliteTemp.db.exec('SELECT * FROM contacts');
      const [sqlValue] = sqlite.db.exec('SELECT * FROM contacts');
      const contactListRemote = objectFromQueryExecResult<RawPerson>(sqlValueRemote)
        .map(normalizeContactRow);
      const contactList = objectFromQueryExecResult<RawPerson>(sqlValue)
        .map(normalizeContactRow);

      const { areThereDifferences, resolvedContactList } = resolveDbFileConflict(
        contactListRemote,
        contactList,
      );
      if (areThereDifferences) {
        await contactDbSrv.updateContactsTable(resolvedContactList);
        await syncUpload({
          fs,
          path: CONTACTS_DB_FILE,
          opts: { uploadVersion: dbFileSyncStatus.remote!.latest! + 1 },
          emitStorageEvent,
        });
      } else {
        await syncAdopt({
          fs,
          path: CONTACTS_DB_FILE,
          opts: { remoteVersion: dbFileSyncStatus.remote!.latest! },
          emitStorageEvent,
        });
        await sqlite.reloadDb();
      }

      emitStorageEvent({ event: 'update:contact-list' });
      break;
    }

    // no default
  }
}
