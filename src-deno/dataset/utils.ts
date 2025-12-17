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
import { SQLiteOn3NStorage } from '../../shared-libs/sqlite-on-3nstorage/index.js';
import { CONTACTS_DB_FILE } from '../constants.ts';
import { objectFromQueryExecResult } from './contacts-db.ts';
import type { PersonView } from '../../src/common/types/index.ts';

export function resolveDbFileConflict(
  contactListRemote: PersonView[],
  contactList: PersonView[],
): { areThereDifferences: boolean; resolvedContactList: PersonView[] } {
  const resolvedContactList: PersonView[] = [];
  let areThereDifferences = false;
  const remoteMap = new Map(contactListRemote.map(p => [p.id, p]));

  for (const localPerson of contactList) {
    const remotePerson = remoteMap.get(localPerson.id);

    if (!remotePerson) {
      resolvedContactList.push(localPerson);
    } else {
      const mergedPerson = localPerson.timestamp >= remotePerson.timestamp
        ? localPerson
        : remotePerson;

      resolvedContactList.push(mergedPerson);

      if (remotePerson.timestamp > localPerson.timestamp) {
        areThereDifferences = true;
      }

      remoteMap.delete(localPerson.id);
    }
  }

  for (const remotePerson of remoteMap.values()) {
    areThereDifferences = true;
    resolvedContactList.push(remotePerson);
  }

  return { areThereDifferences, resolvedContactList };
}

export async function handleDbFileSyncConflict(
  fs: web3n.files.WritableFS,
  sqlite: SQLiteOn3NStorage,
  dbFileSyncStatus: web3n.files.SyncStatus,
  updateContactsTable: (contacts: PersonView[]) => Promise<void>,
) {
  const { remote } = dbFileSyncStatus;
  if (remote?.latest) {
    const { bytes } = (await fs.v?.readBytes(
      CONTACTS_DB_FILE,
      undefined,
      undefined,
      { remoteVersion: remote.latest }
    ))!;

    const sqliteTemp = await SQLiteOn3NStorage.makeReadonly(bytes!);
    const [sqlValueRemote] = sqliteTemp.db.exec('SELECT * FROM contacts');
    const [sqlValue] = sqlite.db.exec('SELECT * FROM contacts');
    const contactListRemote = objectFromQueryExecResult<PersonView>(sqlValueRemote);
    const contactList = objectFromQueryExecResult<PersonView>(sqlValue);
    const { areThereDifferences, resolvedContactList } = resolveDbFileConflict(
      contactListRemote,
      contactList,
    );

    if (areThereDifferences) {
      await updateContactsTable(resolvedContactList);
      await fs.v?.sync?.upload(CONTACTS_DB_FILE, { uploadVersion: remote!.latest + 1 });
    } else {
      await fs.v?.sync?.adoptRemote(CONTACTS_DB_FILE, { remoteVersion: remote!.latest });
      await sqlite.reloadDb();
    }
  }
}
