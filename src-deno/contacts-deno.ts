/* eslint-disable @typescript-eslint/triple-slash-reference, max-len */
/// <reference path="../@types/platform-defs/injected-w3n.d.ts" />
/// <reference path="../@types/platform-defs/test-stand.d.ts" />
/// <reference path="../@types/contact.d.ts" />
// @ts-ignore
import { getDefaultContacts } from '../src/constants/contacts.ts'
// @deno-types="./sqlite-on-3nstorage/index.d.ts"
import { SQLiteOn3NStorage, QueryExecResult } from './sqlite-on-3nstorage/index.js'
// @deno-types="./ipc-service.d.ts"
import { MultiConnectionIPCWrap } from './ipc-service.js'

type SqlValue = number | string | Uint8Array | null

const insertContactQuery = 'INSERT INTO contacts(id, name, mail, avatarMini, avatar, notice, phone, activities) VALUES ($id, $name, $mail, $avatarMini, $avatar, $notice, $phone, $activities)'
const upsertContactQuery = 'INSERT INTO contacts(id, name, mail, avatarMini, avatar, notice, phone, activities) VALUES ($id, $name, $mail, $avatarMini, $avatar, $notice, $phone, $activities) ON CONFLICT(id) DO UPDATE SET id=$id, name=$name, mail=$mail, avatarMini=$avatarMini, avatar=$avatar, notice=$notice, phone=$phone, activities=$activities'
const getContactByIdQuery = 'SELECT * FROM contacts WHERE id=$id'
const getContactListQuery = 'SELECT * FROM contacts'
const deleteContactByIdQuery = 'DELETE FROM contacts WHERE id=$id'

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
      : null
  }
}

function objectFromQueryExecResult<T>(sqlResult: QueryExecResult): Array<T> {
  const { columns, values: rows } = sqlResult
  return rows.map((row: SqlValue[]) => row.reduce((obj, cellValue, index) => {
    const field = columns[index] as keyof T
    obj[field] = cellValue as any
    return obj
  }, {} as T))
}

class ContactsService {
  private readonly sqlite: SQLiteOn3NStorage

  constructor(
    sqlite: SQLiteOn3NStorage
  ) {
    this.sqlite = sqlite
  }

  static async initialization(): Promise<ContactsService> {
    const fs = await w3n.storage!.getAppSyncedFS()
    const file = await fs.writableFile('contacts-db')

    const sqlite = await SQLiteOn3NStorage.makeAndStart(file)

    const tableList = sqlite.listTables()

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
      ) STRICT`)

      const contacts: Person[] = await getDefaultContacts()
      const statement = sqlite.db.prepare(insertContactQuery)

      for (const contact of contacts) {
        const params = personValueToSqlInsertParams(contact) as any
        statement.run(params)
      }
    }

    sqlite.db.exec(`CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY UNIQUE,
      type TEXT NOT NULL,
      description TEXT,
      timestamp INTEGER NOT NULL
    ) STRICT`)

    await sqlite.saveToFile()
    return new ContactsService(sqlite)
  }

  async upsertContact(value: Person): Promise<void> {
    try {
      const params = personValueToSqlInsertParams(value)
      this.sqlite.db.exec(upsertContactQuery, params as any)
      const countModifiedRow = this.sqlite.db.getRowsModified()
      if (countModifiedRow > 0) {
        await this.sqlite.saveToFile()
      }
    } catch (e) {
      console.error('\nUpsert contact error: ', e)
      throw e
    }
  }

  getContact(id: string): Person {
    const [sqlValue] = this.sqlite.db.exec(getContactByIdQuery, { $id: id })
    const personData = objectFromQueryExecResult<Omit<Person, 'activities'> & { activities: string }>(sqlValue)[0]
    return {
      ...personData,
      activities: JSON.parse(personData.activities),
    }
  }

  getContactList(): PersonView[] {
    const [sqlValue] = this.sqlite.db.exec(getContactListQuery)
    const personsData = objectFromQueryExecResult<Omit<Person, 'activities'> & { activities: string }>(sqlValue)
    return personsData.map(personData => ({
      id: personData.id,
      name: personData.name,
      mail: personData.mail,
      avatarMini: personData.avatarMini,
    }))
  }

  deleteContact(id: string) {
    this.sqlite.db.exec(deleteContactByIdQuery, { $id: id })
  }
}

ContactsService.initialization()
  .then(async srv => {
    const srvWrapInternal = new MultiConnectionIPCWrap('AppContactsInternal')
    const srvWrap = new MultiConnectionIPCWrap('AppContacts')

    srvWrapInternal.exposeReqReplyMethods(srv, ['upsertContact', 'getContact', 'getContactList', 'deleteContact' ])
    srvWrapInternal.startIPC()

    srvWrap.exposeReqReplyMethods(srv, [ 'getContact', 'getContactList' ])
    srvWrap.startIPC()
  })
  .catch(err => {
    console.error(`Error in a startup of contacts service component`, err)
    setTimeout(() => w3n.closeSelf!(), 100)
  })

