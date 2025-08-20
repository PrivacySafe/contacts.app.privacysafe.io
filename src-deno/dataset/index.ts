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
import type { Person, PersonView } from '@main/common/types/index.ts';
import { deleteContactFrom, getContactFrom, initializeDB, insertContactInto, listAllContactsFrom, updateContactInto } from './contacts-db.ts';

export class ContactsData {

  private readonly sqlite: SQLiteOn3NStorage;

  constructor(
    sqlite: SQLiteOn3NStorage,
  ) {
    this.sqlite = sqlite;
  }

  static async makeAndStart(): Promise<ContactsData> {
    const fs = await w3n.storage!.getAppSyncedFS();
    const file = await fs.writableFile('contacts-db');

    const sqlite = await SQLiteOn3NStorage.makeAndStart(file);
    const { dbChanged } = await initializeDB(sqlite);
    if (dbChanged) {
      await sqlite.saveToFile({ skipUpload: true });
    }

    return new ContactsData(sqlite);
  }

  async insertContact(contact: Person): Promise<void> {
    insertContactInto(this.sqlite.db, contact);
    await this.sqlite.saveToFile({ skipUpload: true });
  }

  async updateContact(contact: Person): Promise<void> {
    updateContactInto(this.sqlite.db, contact);
    await this.sqlite.saveToFile({ skipUpload: true });
  }

  getContact(id: string): Person|undefined {
    return getContactFrom(this.sqlite.db, id);
  }

  getContactList(): PersonView[] {
    return listAllContactsFrom(this.sqlite.db);
  }

  async deleteContact(id: string): Promise<boolean> {
    const dbChanged = deleteContactFrom(this.sqlite.db, id);
    if (dbChanged) {
      await this.sqlite.saveToFile({ skipUpload: true });
    }
    return dbChanged;
  }

}
