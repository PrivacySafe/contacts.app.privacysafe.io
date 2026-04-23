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
import { syncUpload } from '../utils/sync-upload.ts';
import { syncAdopt } from '../utils/sync-adopt.ts';
import { syncDownload } from '../utils/sync-download.ts';
import type { ContactEvent, Person } from '../../src/types/index.ts';

interface ValidatedContactField {
  field: Exclude<keyof Person, 'id' | 'mail' | 'avatarImage'>;
  extraCheck?: boolean;
}

const validatedContactFields: ValidatedContactField[] = [
  {
    field: 'name',
  },
  {
    field: 'avatarId',
  },
  {
    field: 'timestamp',
  },
  {
    field: 'notice',
    extraCheck: true,
  },
  {
    field: 'phone',
  },
  {
    field: 'activities',
    extraCheck: true,
  },
  {
    field: 'settings',
    extraCheck: true,
  }];

export function resolveDbFileConflict(
  contactListRemote: Person[],
  contactList: Person[],
): { areThereDifferences: boolean; resolvedContactList: Person[] } {
  const resolvedContactList: Person[] = [];
  let areThereDifferences = false;
  const remoteMap = new Map(contactListRemote.map(p => [p.mail, p]));

  for (const localPerson of contactList) {
    const remotePerson = remoteMap.get(localPerson.mail);

    if (!remotePerson) {
      resolvedContactList.push(localPerson);
    } else {
      const resolvedContact = { id: localPerson.id, mail: localPerson.mail } as Person;
      const olderRecord = localPerson.timestamp >= remotePerson.timestamp ? localPerson : remotePerson;

      for (const item of validatedContactFields) {
        const { field } = item;

        if (!localPerson[field] && !remotePerson[field]) {
          // @ts-ignore
          resolvedContact[field] = null;
          continue;
        }

        if (localPerson[field] && !remotePerson[field]) {
          // @ts-ignore
          resolvedContact[field] = localPerson[field];
        } else if (remotePerson[field] && !localPerson[field]) {
          // @ts-ignore
          resolvedContact[field] = remotePerson[field];
          areThereDifferences = true;
        } else {
          // @ts-ignore
          resolvedContact[field] = olderRecord[field];
          remotePerson.timestamp > localPerson.timestamp && (areThereDifferences = true);
        }
      }

      resolvedContactList.push(resolvedContact);

      remoteMap.delete(localPerson.mail);
    }
  }

  for (const remotePerson of remoteMap.values()) {
    areThereDifferences = true;
    resolvedContactList.push(remotePerson);
  }

  return { areThereDifferences, resolvedContactList };
}

export async function handleDbFileSyncStatus(
  fs: web3n.files.WritableFS,
  sqlite: SQLiteOn3NStorage,
  emitStorageEvent: (event: ContactEvent) => void,
  contactDbSrv: ContactDB,
) {
  const dbFileSyncStatus = await fs.v?.sync?.status(CONTACTS_DB_FILE);
  // console.log('🔔 handleDbFileSyncStatus => ', dbFileSyncStatus ? JSON.stringify(dbFileSyncStatus) : '👎');
  if (dbFileSyncStatus) {
    // eslint-disable-next-line default-case
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
        // console.log('💠 DB-FILE SYNC BEHIND | IS_REMOTE_VERSION_ON_DISK => ', isRemoteVersionOnDisk);

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
        const contactListRemote = objectFromQueryExecResult<Person>(sqlValueRemote);
        const contactList = objectFromQueryExecResult<Person>(sqlValue);
        const { areThereDifferences, resolvedContactList } = resolveDbFileConflict(
          contactListRemote,
          contactList,
        );
        // console.log('🎈 ARE_THERE_DIFFERENCES => ', areThereDifferences);
        // console.log('🎈 RESOLVED CONTACT LIST => ', resolvedContactList);
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
    }
  }
}
