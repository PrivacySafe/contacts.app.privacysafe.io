/* eslint-disable @typescript-eslint/triple-slash-reference, max-len */
/// <reference path="../@types/platform-defs/injected-w3n.d.ts" />
/// <reference path="../@types/platform-defs/test-stand.d.ts" />
/// <reference path="../@types/contact.d.ts" />
// @ts-ignore
import { getDefaultContacts } from '../src/constants/contacts.ts';
// @deno-types="./libs/sqlite-on-3nstorage/index.d.ts"
import { SQLiteOn3NStorage, QueryExecResult } from './libs/sqlite-on-3nstorage/index.js';
// @deno-types="./libs/ipc/ipc-service.d.ts"
import { MultiConnectionIPCWrap } from './libs/ipc/ipc-service.js';
import { setupGlobalReportingOfUnhandledErrors } from './libs/error-handling.ts';

type SqlValue = number | string | Uint8Array | null

setupGlobalReportingOfUnhandledErrors(true);

const insertContactQuery = 'INSERT INTO contacts(id, name, mail, avatarMini, avatar, notice, phone, activities) VALUES ($id, $name, $mail, $avatarMini, $avatar, $notice, $phone, $activities)';
const upsertContactQuery = 'INSERT INTO contacts(id, name, mail, avatarMini, avatar, notice, phone, activities) VALUES ($id, $name, $mail, $avatarMini, $avatar, $notice, $phone, $activities) ON CONFLICT(id) DO UPDATE SET id=$id, name=$name, mail=$mail, avatarMini=$avatarMini, avatar=$avatar, notice=$notice, phone=$phone, activities=$activities';
const getContactByIdQuery = 'SELECT * FROM contacts WHERE id=$id';
const getContactListQuery = 'SELECT * FROM contacts';
const deleteContactByIdQuery = 'DELETE FROM contacts WHERE id=$id';

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

class ContactsService {
  private readonly sqlite: SQLiteOn3NStorage;
  private readonly observers = new Set<web3n.Observer<PersonView[]>>();

  constructor(
    sqlite: SQLiteOn3NStorage,
  ) {
    this.sqlite = sqlite;
  }

  static async initialization(): Promise<ContactsService | undefined> {
    try {
      const fs = await w3n.storage!.getAppSyncedFS();
      const file = await fs.writableFile('contacts-db');

      const sqlite = await SQLiteOn3NStorage.makeAndStart(file);

      const tableList = sqlite.listTables();

      if (!tableList.includes('contacts')) {
        sqlite.db.exec(`CREATE TABLE contacts (
        id TEXT PRIMARY KEY UNIQUE,
        name TEXT,
        mail TEXT NOT NULL,
        avatarMini TEXT,
        avatar TEXT,
        notice TEXT,
        phone TEXT,
        activities TEXT
      ) STRICT`);

        const contacts: Person[] = await getDefaultContacts();
        const statement = sqlite.db.prepare(insertContactQuery);

        for (const contact of contacts) {
          const params = personValueToSqlInsertParams(contact) as any;
          statement.run(params);
        }
      }

      sqlite.db.exec(`CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY UNIQUE,
      type TEXT NOT NULL,
      description TEXT,
      timestamp INTEGER NOT NULL
    ) STRICT`);

      await sqlite.saveToFile({ skipUpload: true });
      return new ContactsService(sqlite);
    } catch (e) {
      w3n.log!('error', 'ContactDenoService initialization error.', e);
    }
  }

  async upsertContact(value: Person): Promise<void> {
    try {
      const params = personValueToSqlInsertParams(value);
      this.sqlite.db.exec(upsertContactQuery, params as any);
      const countModifiedRow = this.sqlite.db.getRowsModified();
      if (countModifiedRow > 0) {
        await this.sqlite.saveToFile({ skipUpload: true });
        const contactList = this.getContactList();
        for (const obs of this.observers) {
          if (obs.next) {
            obs.next(contactList);
          }
        }
      }
    } catch (e) {
      console.error('\nUpsert contact error: ', e);
      throw e;
    }
  }

  getContact(id: string): Person {
    const [sqlValue] = this.sqlite.db.exec(getContactByIdQuery, { $id: id });
    const personData = objectFromQueryExecResult<Omit<Person, 'activities'> & { activities: string }>(sqlValue)[0];
    return {
      ...personData,
      activities: JSON.parse(personData.activities),
    };
  }

  getContactList(): PersonView[] {
    const [sqlValue] = this.sqlite.db.exec(getContactListQuery);
    const personsData = objectFromQueryExecResult<Omit<Person, 'activities'> & { activities: string }>(sqlValue);
    return personsData.map(personData => ({
      id: personData.id,
      name: personData.name,
      mail: personData.mail,
      avatarMini: personData.avatarMini,
    }));
  }

  watchContactList(obs: web3n.Observer<PersonView[]>): () => void {
    this.observers.add(obs);
    return () => this.observers.delete(obs);
  }

  deleteContact(id: string) {
    this.sqlite.db.exec(deleteContactByIdQuery, { $id: id });
  }

  completeAllWatchers(): void {
    for (const obs of this.observers) {
      if (obs.complete) {
        obs.complete();
      }
    }
    this.observers.clear();
  }
}

ContactsService.initialization()
  .then(async srv => {
    if (srv) {
      const srvWrapInternal = new MultiConnectionIPCWrap('AppContactsInternal');
      const srvWrap = new MultiConnectionIPCWrap('AppContacts');

      srvWrapInternal.exposeReqReplyMethods(srv, ['upsertContact', 'getContact', 'getContactList', 'deleteContact']);
      srvWrapInternal.exposeObservableMethods(srv, ['watchContactList']);
      srvWrapInternal.startIPC();

      srvWrap.exposeReqReplyMethods(srv, ['getContact', 'getContactList', 'upsertContact']);
      srvWrap.exposeObservableMethods(srv, ['watchContactList']);
      srvWrap.startIPC();
    }
  })
  .catch(err => {
    w3n.log!('error', `Error in a startup of contacts service component`, err);
    setTimeout(() => w3n.closeSelf!(), 100);
  });

