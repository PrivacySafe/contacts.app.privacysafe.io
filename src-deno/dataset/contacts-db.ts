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

// @deno-types="../../shared-libs/sqlite-on-3nstorage/index.d.ts"
import { SQLiteOn3NStorage, QueryExecResult, Database } from '../../shared-libs/sqlite-on-3nstorage/index.js';
import { toCanonicalAddress } from '../../shared-libs/address-utils.ts';
import { Person, PersonView } from '../../src/types';
import { makeContactsException } from '../exceptions.ts';

type SqlValue = number | string | Uint8Array | null

const queryToCreateContactsTab = `CREATE TABLE contacts (

  -- id is a canonical form of mail address
  id TEXT PRIMARY KEY UNIQUE,

  -- fields for PersonView
  mail TEXT NOT NULL,
  name TEXT,
  avatarMini TEXT,

  -- the rest of fields for Person
  avatar TEXT,
  notice TEXT,
  phone TEXT,
  activities TEXT
) STRICT`;

const queryToInsertContact = `INSERT INTO contacts (
  id, name, mail, avatarMini, avatar, notice, phone, activities
) VALUES (
  $id, $name, $mail, $avatarMini, $avatar, $notice, $phone, $activities
) ON CONFLICT(id) DO NOTHING`;
const queryToUpdateContact = `UPDATE contacts
SET
  name=$name, mail=$mail, avatarMini=$avatarMini, avatar=$avatar,
  notice=$notice, phone=$phone, activities=$activities
WHERE id=$id
`;
const queryToGetContactById = `SELECT * FROM contacts WHERE id=$id`;
const queryToDeleteContactById = `DELETE FROM contacts WHERE id=$id`;
const queryToContactsList = `SELECT id, name, mail, avatarMini FROM contacts`;

function personValueToSqlInsertParams(value: Person) {
  return {
    $id: value.id,
    $name: value.name || null,
    $mail: value.mail,
    $avatarMini: value.avatarMini || null,
    $avatar: value.avatar || null,
    $notice: value.notice || null,
    $phone: value.phone || null,
    $activities: Array.isArray(value.activities)
      ? JSON.stringify(value.activities)
      : null,
  };
}

function objectFromQueryExecResult<T>(sqlResult: QueryExecResult): Array<T> {
  const { columns, values: rows } = sqlResult;
  return rows.map((row: SqlValue[]) => row.reduce((obj, cellValue, index) => {
    const field = columns[index] as keyof T;
    obj[field] = cellValue as any;
    return obj;
  }, {} as T));
}

function queryResultToPerson(sqlResult: QueryExecResult, row = 0): Person {
  const person = objectFromQueryExecResult<Person>(sqlResult)[row];
  person.activities = JSON.parse(person.activities as unknown as string);
  return person;
}

/**
 * This inserts contact into a given db.
 * @param db sqlite (sqljs) db
 * @param contact 
 */
export function insertContactInto(db: Database, contact: Person): void {
  contact.id = toCanonicalAddress(contact.mail);
  const params = personValueToSqlInsertParams(contact);
  db.exec(queryToInsertContact, params);
  if (db.getRowsModified() === 0) {
    throw makeContactsException({ contactAlreadyExists: true });
  }
}

/**
 * This updates existing contact into a given db.
 * @param db sqlite (sqljs) db
 * @param contact 
 */
export function updateContactInto(db: Database, contact: Person): void {
  if (toCanonicalAddress(contact.mail) !== contact.id) {
    throw makeContactsException({
      invalidValue: true,
      message: `Given contact id is not equal to canonical form of its mail`
    });
  }
  const params = personValueToSqlInsertParams(contact);
  db.exec(queryToUpdateContact, params);
}

/**
 * @param db sqlite (sqljs) db
 * @param id contact's id
 * @returns found contact, or undefined
 */
export function getContactFrom(db: Database, id: string): Person|undefined {
  const [sqlValue] = db.exec(queryToGetContactById, { $id: id });
  return ((sqlValue && (sqlValue.values.length === 1)) ?
    queryResultToPerson(sqlValue, 0) : undefined
  );
}

/**
 * @param db sqlite (sqljs) db
 * @param id contact's id
 * @returns true, if db was changed, and false, if contact was not found
 */
export function deleteContactFrom(db: Database, id: string): boolean {
  db.exec(queryToDeleteContactById, { $id: id });
  return (db.getRowsModified() > 0);
}

export function listAllContactsFrom(db: Database): PersonView[] {
  const [sqlValue] = db.exec(queryToContactsList);
  return objectFromQueryExecResult<PersonView>(sqlValue);
}

export async function initializeDB(
  sqlite: SQLiteOn3NStorage
): Promise<{ dbChanged: boolean; }> {
  const tableList = sqlite.listTables();
  let dbChanged = false;

  if (!tableList.includes('contacts')) {
    sqlite.db.exec(queryToCreateContactsTab);
    const userOwnAddr = await w3n.mailerid!.getUserId();
    insertContactInto(sqlite.db, {
      mail: userOwnAddr
    } as Person);
    dbChanged = true;
  }

  if (!tableList.includes('activities')) {
    sqlite.db.exec(queryToCreateActivitiesTab);
    dbChanged = true;
  }

  return { dbChanged };
}

const queryToCreateActivitiesTab = `CREATE TABLE activities (
  id TEXT PRIMARY KEY UNIQUE,
  type TEXT NOT NULL,
  description TEXT,
  timestamp INTEGER NOT NULL
) STRICT`;

