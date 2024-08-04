/*
 Copyright (C) 2022 3NSoft Inc.

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
import { get as lGet, keyBy, isEmpty, union } from 'lodash'
import { randomStr } from '../random'
import { NamedProcs } from '../../../libs/processes/named-procs'

type IndexDataFieldValue = string|number|boolean|undefined|string[]

interface DataToProcessing {
  fieldValue: string|undefined; // string = result JSON.stringify(string|number|boolean|string[])
  ids: string[];
}

export interface DbDocBase {
  id: string;
  createdAt?: number;
}

export interface DbFileCollection<T extends DbDocBase> {
  getCollectionName(): string|undefined;
  get(id: string): Promise<T|null>;
  insert(docs: T[]): Promise<Record<string, T>>;
  delete(ids: string[]): Promise<void>;
  update(doc: T): Promise<void>;
}

export interface DbCollectionOptions {
  singleFile?: boolean;
  indexes?: string[];
}

export class DbCollection<T extends DbDocBase> implements DbFileCollection<T> {
  private readonly allowedDataTypes = ['string', 'number', 'boolean', 'undefined']
  private readonly procs = new NamedProcs()
  private readonly fs: WritableFS|undefined = undefined
  private readonly options: DbCollectionOptions|undefined = undefined

  constructor(
    fs: WritableFS,
    options?: DbCollectionOptions,
  ) {
    this.fs = fs
    this.options = options
  }

  getCollectionName(): string|undefined {
    return this.fs?.name
  }

  private async getIndexFileData(field: string): Promise<{
    fieldIndexFilePath: string;
    fieldIndexesDataParsed: Map<string|undefined, string[]>;
  }> {
    const fieldIndexFilePath = `index-${field}.json`
    const fieldIndexesData = await this.fs!.readJSONFile<string>(fieldIndexFilePath)
    const fieldIndexesDataParsed = new Map<string|undefined, string[]>(JSON.parse(fieldIndexesData))
    return { fieldIndexFilePath, fieldIndexesDataParsed }
  }

  private getPreparedFieldValue(fieldValue: IndexDataFieldValue): string|undefined {
    return fieldValue !== undefined
      ? Array.isArray(fieldValue) ? JSON.stringify(fieldValue.sort()) : JSON.stringify(fieldValue)
      : undefined
  }

  private async prepareDataToProcessing(docsData: T[], field: string): Promise<{
    preparedData: DataToProcessing[];
    fieldIndexFilePath: string;
    fieldIndexesDataParsed: Map<string|undefined, string[]>;
  }> {
    const preparedData = docsData.reduce((res: DataToProcessing[], docData: T) => {
      if (field in docData) {
        // @ts-ignore
        const fieldValue = docData[field] as IndexDataFieldValue
        const typeOfDocDataField = typeof fieldValue
        if (
          !this.allowedDataTypes.includes(typeOfDocDataField)
          || (typeOfDocDataField === 'object' && !Array.isArray(fieldValue))
        ) {
          throw new Error(`The data type of the field '${field}' of the document isn't allowed.`)
        }

        const preparedFieldValue = this.getPreparedFieldValue(fieldValue)
        const whereInRes = res.findIndex(i => i.fieldValue === preparedFieldValue)
        if (whereInRes === -1) {
          res.push({fieldValue: preparedFieldValue, ids: [docData.id]})
        } else {
          res[whereInRes].ids.push(docData.id)
        }
      }
      return res
    }, [])
    const { fieldIndexFilePath, fieldIndexesDataParsed } = await this.getIndexFileData(field)
    return { preparedData, fieldIndexFilePath, fieldIndexesDataParsed }
  }

  private async addInIndexFile(docsData: T[]): Promise<void> {
    const { indexes = [] } = this.options || {}
    for (const field of indexes) {
      const {
        preparedData,
        fieldIndexFilePath,
        fieldIndexesDataParsed,
      } = await this.prepareDataToProcessing(docsData, field)

      for (const item of preparedData) {
        const currentValue = fieldIndexesDataParsed.get(item.fieldValue) as string[]|undefined
        if (currentValue) {
          fieldIndexesDataParsed.set(item.fieldValue, [...currentValue, ...item.ids])
        } else {
          fieldIndexesDataParsed.set(item.fieldValue, item.ids)
        }
      }
      const savedData = JSON.stringify(Array.from(fieldIndexesDataParsed.entries()))
      await this.fs!.writeJSONFile(fieldIndexFilePath, savedData)
    }
  }

  private async delFromIndexFile(docsData: T[]): Promise<void> {
    const { indexes = [] } = this.options || {}
    for (const field of indexes) {
      const {
        preparedData,
        fieldIndexFilePath,
        fieldIndexesDataParsed,
      } = await this.prepareDataToProcessing(docsData, field)

      for (const item of preparedData) {
        const currentValue = fieldIndexesDataParsed.get(item.fieldValue) as string[]|undefined
        if (currentValue) {
          for (const id of item.ids) {
            const idIndex = currentValue.findIndex(i => i === id)
            if (idIndex > -1) {
              currentValue.splice(idIndex, 1)
            }
          }
          fieldIndexesDataParsed.set(item.fieldValue, currentValue)
        }
      }
      const savedData = JSON.stringify(Array.from(fieldIndexesDataParsed.entries()))
      await this.fs!.writeJSONFile(fieldIndexFilePath, savedData)
    }
  }

  private async updateInIndexFile(oldDocData: T, newDocData: T): Promise<void> {
    const { indexes = [] } = this.options || {}
    const oldDocDataFields = Object.keys(oldDocData)
    const newDocDataFields = Object.keys(newDocData)
    const docDataField = union(oldDocDataFields, newDocDataFields)
    for (const field of docDataField) {
      if (indexes.includes(field)) {
        const addNewIndexData = async (newDoc: T, f: string): Promise<{
          fieldIndexFilePath: string;
          savedData: string;
        }> => {
          const { fieldIndexFilePath, fieldIndexesDataParsed } = await this.getIndexFileData(f)
          const newDocFields = Object.keys(newDoc)
          // @ts-ignore
          const fieldValue = newDocFields[f]
          const preparedFieldValue = this.getPreparedFieldValue(fieldValue)
          const currentValue = fieldIndexesDataParsed.get(preparedFieldValue) as string[]|undefined
          if (currentValue) {
            fieldIndexesDataParsed.set(preparedFieldValue, [...currentValue, newDoc.id])
          } else {
            fieldIndexesDataParsed.set(preparedFieldValue, [newDoc.id])
          }
          const savedData = JSON.stringify(Array.from(fieldIndexesDataParsed.entries()))
          return { fieldIndexFilePath, savedData }
        }

        const delOldIndexData = async (oldDoc: T, f: string): Promise<{
          fieldIndexFilePath: string;
          savedData: string;
        }> => {
          const { fieldIndexFilePath, fieldIndexesDataParsed } = await this.getIndexFileData(f)
          const oldDocFields = Object.keys(oldDoc)
          // @ts-ignore
          const fieldValue = oldDocFields[field]
          const preparedFieldValue = this.getPreparedFieldValue(fieldValue)
          const currentValue = fieldIndexesDataParsed.get(preparedFieldValue) as string[]|undefined
          if (currentValue) {
            const idIndex = currentValue.findIndex(i => i === oldDoc.id)
            if (idIndex > -1) {
              currentValue.splice(idIndex, 1)
            }
            fieldIndexesDataParsed.set(preparedFieldValue, currentValue)
            const savedData = JSON.stringify(Array.from(fieldIndexesDataParsed.entries()))
            return { fieldIndexFilePath, savedData }
          }

          return { fieldIndexFilePath: '', savedData: '' }
        }

        if (newDocDataFields.includes(field) && !oldDocDataFields.includes(field)) {
          const { fieldIndexFilePath, savedData } = await addNewIndexData(newDocData, field)
          await this.fs!.writeJSONFile(fieldIndexFilePath, savedData)
        }

        if (!newDocDataFields.includes(field) && oldDocDataFields.includes(field)) {
          const { fieldIndexFilePath, savedData } = await delOldIndexData(oldDocData, field)
          if (!!fieldIndexFilePath && !!savedData) {
            await this.fs!.writeJSONFile(fieldIndexFilePath, savedData)
          }
        }

        if (newDocDataFields.includes(field) && oldDocDataFields.includes(field)) {
          // @ts-ignore
          const newDocDataFieldValue = this.getPreparedFieldValue(newDocData[field])
          // @ts-ignore
          const oldDocDataFieldValue = this.getPreparedFieldValue(oldDocData[field])
          if (oldDocDataFieldValue === newDocDataFieldValue) {
            return
          }
          const { fieldIndexFilePath, fieldIndexesDataParsed } = await this.getIndexFileData(field)
          const currentValue = fieldIndexesDataParsed.get(newDocDataFieldValue) as string[]|undefined
          if (currentValue) {
            const oldIdIndex = currentValue.findIndex(i => i === oldDocData.id)
            if (oldIdIndex > -1) {
              currentValue.splice(oldIdIndex, 1)
            }
            fieldIndexesDataParsed.set(newDocDataFieldValue, [...currentValue, newDocData.id])
          } else {
            fieldIndexesDataParsed.set(newDocDataFieldValue, [newDocData.id])
          }
          const savedData = JSON.stringify(Array.from(fieldIndexesDataParsed.entries()))
          await this.fs!.writeJSONFile(fieldIndexFilePath, savedData)
        }
      }
    }
  }

  async get(id: string): Promise<T|null>
  async get(id?: string): Promise<Record<string, T>|null>
  async get(id?: string): Promise<T|Record<string, T>|null> {
    const { singleFile = false } = this.options || {}

    if (!singleFile && !id) {
      throw new Error('No document id')
    }

    const docDataFilePath = singleFile
      ? 'data.json'
      : `${id}.json`

    if (singleFile) {
      const singleFileData = await this.procs.startOrChain(
        docDataFilePath,
        () => this.fs!.readJSONFile<Record<string, T>>(docDataFilePath)
      ).catch((err: web3n.files.FileException) => {
        console.error(JSON.stringify(err))
        return null
      })
      if (!singleFileData || (singleFileData && !id)) {
        return singleFileData
      }
      // @ts-ignore
      return lGet(singleFileData, id, null)
    }

    return this.procs.startOrChain(
      docDataFilePath,
      () => this.fs!.readJSONFile<T>(docDataFilePath)
    ).catch((err: web3n.files.FileException) => {
      console.error(JSON.stringify(err))
      return null
    })
  }

  async insert(docs: T[]): Promise<Record<string, T>> {
    const docsData = docs.map(doc =>
      !doc.id || doc.id === 'new'
        ? {
          ...doc,
          id: randomStr(6),
          createdAt: Date.now(),
        }
        : {
          ...doc,
          createdAt: Date.now(),
        }
    )

    const { singleFile = false, indexes = [] } = this.options || {}
    if (singleFile) {
      const singleFilePath = 'data.json'
      const currentData = await this.fs!.readJSONFile<Record<string, T>>(singleFilePath)
        .catch((err: web3n.files.FileException) => {
          if (err.notFound && err.path === 'data.json') {
            return {}
          }
          console.error(JSON.stringify(err))
          return null
        })
      const data = currentData || {}
      const updatedData = docsData
        .reduce((res: Record<string, T>, item: T) => {
          res[item.id] = item
          return res
        }, data)
      await this.procs.startOrChain(
        singleFilePath,
        () => this.fs!.writeJSONFile(singleFilePath, updatedData)
      )
      return keyBy(docsData, 'id')
    }

    const actionPromises = []
    for (const docData of docsData) {
      const docDataFilePath = `${docData.id}.json`
      const prom = this.procs.startOrChain(
        docDataFilePath,
        () => this.fs!.writeJSONFile(docDataFilePath, docData)
      )
      actionPromises.push(prom)
    }

    try {
      await Promise.all(actionPromises)
    } catch (e) {
      console.error(JSON.stringify(e))
    }

    if (!isEmpty(indexes)) {
      await this.addInIndexFile(docsData)
    }
    return keyBy(docsData, 'id')
  }

  async delete(ids: string[]): Promise<void> {
    const { singleFile = false, indexes = [] } = this.options || {}
    if (singleFile) {
      const singleFilePath = 'data.json'
      const data = await this.fs!.readJSONFile<Record<string, T>>(singleFilePath)
      for (const id of ids) {
        delete data[id]
      }
      await this.procs.startOrChain(
        singleFilePath,
        () => this.fs!.writeJSONFile(singleFilePath, data)
      )
      return
    }

    const tmpPromises = ids.map(id => {
      const docDataFilePath = `${id}.json`
      return this.fs!.readJSONFile<T>(docDataFilePath)
    })
    const deletedDocs = await Promise.all(tmpPromises)

    const actionPromises = ids.map(id => {
      const docDataFilePath = `${id}.json`
      return this.procs.startOrChain(
        docDataFilePath,
        () => this.fs!.deleteFile(docDataFilePath)
      )
    })
    await Promise.all(actionPromises)

    if (!isEmpty(indexes)) {
      await this.delFromIndexFile(deletedDocs)
    }
  }

  async update(docData: T): Promise<void> {
    const { singleFile = false, indexes = [] } = this.options || {}
    if (singleFile) {
      const singleFilePath = 'data.json'
      const data = await this.fs!.readJSONFile<Record<string, T>>(singleFilePath)
      data[docData.id] = docData
      await this.procs.startOrChain(
        singleFilePath,
        () => this.fs!.writeJSONFile(singleFilePath, data)
      )
      return
    }

    const docDataFilePath = `${docData.id}.json`
    const currentDocData = await this.get(docData.id)

    await this.procs.startOrChain(
      docDataFilePath,
      () => this.fs!.writeJSONFile(docDataFilePath, docData)
    )
    if (!isEmpty(indexes)) {
      await this.updateInIndexFile(currentDocData!, docData)
    }
  }
}
