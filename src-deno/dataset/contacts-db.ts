/*
 Copyright (C) 2020-2025 3NSoft Inc.

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
/* eslint-disable @typescript-eslint/no-explicit-any */

// @deno-types="../../shared-libs/sqlite-on-3nstorage/index.d.ts"
import { SQLiteOn3NStorage, QueryExecResult } from '../../shared-libs/sqlite-on-3nstorage/index.js';
import type { Person, PersonView } from '@main/types';
import { randomStr } from '../../src/common/services/base/random.ts';
import { makeContactsException } from '../utils/exceptions.ts';

type SqlValue = number | string | Uint8Array | null;

export interface ContactDB {
  insertContactInto: ({ contact, withoutSaveToFile }: {
    contact: Person | Omit<Person, 'timestamp'>;
    withoutSaveToFile?: boolean;
  }) => Promise<Person>;
  getContactFrom: (id: string) => Person | undefined;
  getContactByMail: (mail: string) => Person | undefined;
  updateContactInto: (contact: Person | Omit<Person, 'timestamp'>, withoutSaveToFile?: boolean) => Promise<Person>;
  deleteContactFrom: (id: string, withoutSaveToFile?: boolean) => Promise<boolean>;
  listAllContactsFrom: () => PersonView[];
  updateContactsTable: (contacts: Omit<Person, 'avatarImage'>[], withoutSaveToFile?: boolean) => Promise<boolean>;
  getIdsOfAllFilesInUse: () => string[];
}

export function objectFromQueryExecResult<T>(sqlResult: QueryExecResult): T[] {
  const { columns, values: rows } = sqlResult;
  return rows.map((row: SqlValue[]) => row.reduce((obj, cellValue, index) => {
    const field = columns[index] as keyof T;
    obj[field] = cellValue as any;
    return obj;
  }, {} as T));
}

export async function contactDb(sqlite: SQLiteOn3NStorage): Promise<ContactDB> {
  function personValueToSqlInsertParams(value: Omit<Person, 'avatarImage'>) {
    return {
      $id: value.id,
      $name: value.name || null,
      $mail: value.mail,
      $avatarId: value.avatarId || null,
      $timestamp: value.timestamp || 0,
      $notice: value.notice || null,
      $phone: value.phone || null,
      $activities: Array.isArray(value.activities)
        ? JSON.stringify(value.activities)
        : null,
      $settings: value.settings
        ? JSON.stringify(value.settings)
        : null,
    };
  }

  function queryResultToPerson(sqlResult: QueryExecResult, row = 0): Omit<Person, 'avatarImage'> {
    const person = objectFromQueryExecResult<Omit<Person, 'avatarImage'>>(sqlResult)[row];
    person.activities = person.activities !== null ? JSON.parse(person.activities as unknown as string) : [];
    person.settings = person.settings !== null ? JSON.parse(person.settings as unknown as string) : {};
    return person;
  }

  async function insertContactInto(
    { contact, withoutSaveToFile }:
    {
      contact: Person | Omit<Person, 'timestamp'>;
      withoutSaveToFile?: boolean;
    },
  ): Promise<Person> {
    const contactData = JSON.parse(JSON.stringify(contact)) as Person | Omit<Person, 'timestamp'>;
    if (!contactData.id || contactData.id === 'new') {
      contactData.id = randomStr(8);
    }

    if (!('timestamp' in contactData) || contactData.timestamp === 0) {
      (contactData as Person).timestamp = Date.now();
    }

    const params = personValueToSqlInsertParams({
      ...contactData as Person,
    });
    sqlite.db.exec(
      `--sql
    INSERT INTO contacts (id, name, mail, avatarId, timestamp, notice, phone, activities, settings)
    VALUES ($id, $name, $mail, $avatarId, $timestamp, $notice, $phone, $activities, $settings)
    ON CONFLICT(id) DO NOTHING`,
      params,
    );

    const dbChanged = sqlite.db.getRowsModified();
    if (dbChanged === 0) {
      throw makeContactsException({ contactAlreadyExists: true });
    }

    if (!withoutSaveToFile && dbChanged && dbChanged > 0) {
      await sqlite.saveToFile({ skipUpload: true });
    }

    return contactData as Person;
  }

  function getContactFrom(id: string): Omit<Person, 'avatarImage'> | undefined {
    const [sqlValue] = sqlite.db.exec(
      `--sql
    SELECT * FROM contacts WHERE id = $id`,
      { $id: id },
    );

    return ((sqlValue && (sqlValue.values.length === 1)) ?
        queryResultToPerson(sqlValue, 0) : undefined
    );
  }

  function getContactByMail(mail: string): Person | undefined {
    const [sqlValue] = sqlite.db.exec(
      `--sql
    SELECT * FROM contacts WHERE mail = $mail`,
      { $mail: mail },
    );

    const data = sqlValue && sqlValue.values.length ? objectFromQueryExecResult<Person>(sqlValue) : undefined;
    return data ? data[0] : undefined
  }

  async function updateContactInto(
    contact: Person | Omit<Person, 'timestamp'>,
    withoutSaveToFile?: boolean,
  ): Promise<Person> {
    if (!contact.id) {
      throw makeContactsException({
        invalidValue: true,
        message: 'Given contact does not contain ID',
      });
    }

    const updatedContact = {
      ...contact,
      timestamp: Date.now(),
    };
    const params = personValueToSqlInsertParams({ ...updatedContact });

    sqlite.db.exec(
      `--sql
      UPDATE contacts
      SET name=$name, mail=$mail, avatarId=$avatarId, timestamp=$timestamp, notice=$notice, phone=$phone, activities=$activities, settings=$settings
      WHERE id = $id`,
      params,
    );

    const dbChanged = sqlite.db.getRowsModified();
    if (!withoutSaveToFile && dbChanged && dbChanged > 0) {
      await sqlite.saveToFile({ skipUpload: true });
    }

    return updatedContact;
  }

  async function deleteContactFrom(id: string, withoutSaveToFile?: boolean): Promise<boolean> {
    sqlite.db.exec(
      `--sql
      DELETE FROM contacts WHERE id = $id`,
      { $id: id },
    );

    const dbChanged = sqlite.db.getRowsModified();
    if (!withoutSaveToFile && dbChanged && dbChanged > 0) {
      await sqlite.saveToFile({ skipUpload: true });
    }

    return dbChanged > 0;
  }

  function listAllContactsFrom(): Omit<PersonView, 'avatarImage'>[] {
    const [sqlValue] = sqlite.db.exec(
      `--sql
      SELECT id, name, mail, avatarId, timestamp
      FROM contacts`,
    );
    return objectFromQueryExecResult<Omit<PersonView, 'avatarImage'>>(sqlValue);
  }

  function getIdsOfAllFilesInUse(): string[] {
    const [sqlValue] = sqlite.db.exec(
      `--sql
      SELECT avatarId FROM contacts
      WHERE avatarId IS NOT NULL AND avatarId <> '' AND TRIM(avatarId) <> ''`,
    );

    if (!sqlValue) {
      return [];
    }

    const res: string[] = [];
    for (const value of (sqlValue.values as string[][])) {
      for (const item of value) {
        res.push(item);
      }
    }

    return res;
  }

  function createContactsTable() {
    sqlite.db.exec(
      `--sql
        CREATE TABLE contacts (
          id          TEXT PRIMARY KEY UNIQUE,
          mail        TEXT NOT NULL,
          name        TEXT,
          avatarId    TEXT,
          timestamp   INTEGER,
          notice      TEXT,
          phone       TEXT,
          activities  TEXT,
          settings    TEXT
        )`,
    );
  }

  async function updateContactsTable(
    contacts: Omit<Person, 'avatarImage'>[],
    withoutSaveToFile?: boolean,
  ): Promise<boolean> {
    sqlite.db.exec(
      `--sql
      DROP TABLE contacts`,
    );
    createContactsTable();

    for (let i = 0; i < contacts.length; i++) {
      await insertContactInto({
        contact: contacts[i],
        withoutSaveToFile: withoutSaveToFile && i !== contacts.length - 1,
      });
    }

    return true;
  }

  async function initializeDB(): Promise<void> {
    const tableList = sqlite.listTables();

    if (!tableList.includes('contacts')) {
      createContactsTable();
      const userOwnAddr = await w3n.mailerid!.getUserId();
      await insertContactInto({
        contact: { id: userOwnAddr, mail: userOwnAddr },
        withoutSaveToFile: true,
      });
    }

    if (!tableList.includes('activities')) {
      sqlite.db.exec(
        `--sql
          CREATE TABLE activities (
          id          TEXT PRIMARY KEY UNIQUE,
          type        TEXT    NOT NULL,
          description TEXT,
          timestamp   INTEGER NOT NULL
        )`,
      );
    }

    const [sqlValue] = sqlite.db.exec('PRAGMA table_info(contacts)');
    const isThereTimestampField = sqlValue.values.some(item => item.includes('timestamp'));
    const isThereAvatarIdField = sqlValue.values.some(item => item.includes('avatarId'));
    const isThereSettingsField = sqlValue.values.some(item => item.includes('settings'));

    if (!isThereTimestampField) {
      sqlite.db.exec(
        `--sql
        ALTER TABLE contacts
        ADD COLUMN timestamp INTEGER
        DEFAULT 0`,
      );
    }

    if (!isThereAvatarIdField) {
      sqlite.db.exec(
        `--sql
        ALTER TABLE contacts
        RENAME COLUMN avatar
        TO avatarId`,
      );
    }

    if (!isThereSettingsField) {
      sqlite.db.exec(
        `--sql
        ALTER TABLE contacts
        RENAME COLUMN avatarMini
        TO settings`,
      );
    }

    if (!isThereTimestampField || !isThereAvatarIdField || !isThereSettingsField) {
      await sqlite.saveToFile({ skipUpload: true });
    }
  }

  await initializeDB();

  return {
    insertContactInto,
    getContactFrom,
    getContactByMail,
    updateContactInto,
    deleteContactFrom,
    listAllContactsFrom,
    updateContactsTable,
    getIdsOfAllFilesInUse,
  };
}
