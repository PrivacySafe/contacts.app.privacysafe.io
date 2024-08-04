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
import { isEmpty } from 'lodash'
import { NamedProcs } from '../../../libs/processes/named-procs'
import { DbCollection, DbCollectionOptions, DbDocBase } from './db-collection'

export interface DbCommon {
  getCollectionList(): Promise<string[]>;
  initCollection<T extends DbDocBase>(name: string, options?: DbCollectionOptions): Promise<DbCollection<T>>;
  deleteCollection(name: string): Promise<void>;
}

export class Db implements DbCommon {
  private readonly procs = new NamedProcs()
  private readonly fs: WritableFS|undefined = undefined

  private constructor(
    fs: WritableFS,
  ) {
    this.fs = fs
  }

  static async init(): Promise<DbCommon> {
    const fs = await (w3n.storage as web3n.storage.Service).getAppSyncedFS('')
    return new Db(fs)
  }

  async getCollectionList(): Promise<string[]> {
    const list = await this.fs?.listFolder('/')
    if (!list)
      return []

    return list.reduce((res: string[], item) => {
      if (item.isFolder)
        res.push(item.name)

      return res
    }, [])
  }

  async initCollection<T extends DbDocBase>(name: string, options?: DbCollectionOptions): Promise<DbCollection<T>> {
    const isCollectionFolderPresence = await this.fs?.checkFolderPresence(name)
    const optionsFilePath = `${name}/options.json`
    let optionsData: DbCollectionOptions|undefined = options
    try {
      if (isCollectionFolderPresence) {
        const isOptionFilePresence = await this.fs!.checkFilePresence(optionsFilePath)
        if (isOptionFilePresence) {
          optionsData = await this.fs!.readJSONFile<DbCollectionOptions>(optionsFilePath)
        }
      } else {
        await this.fs!.makeFolder(name, true)
        if (!isEmpty(optionsData)) {
          await this.procs.startOrChain(
            optionsFilePath,
            () => this.fs!.writeJSONFile(optionsFilePath, optionsData),
          )
        }
      }

      const collectionFs = await this.fs!.writableSubRoot(name)
      return new DbCollection<T>(collectionFs, optionsData)
    } catch (e) {
      console.error(e)
      throw new Error(`Error initialization DB collection '${name}'.`)
    }
  }

  async deleteCollection(name: string): Promise<void> {
    await this.fs!.deleteFolder(name, true)
  }
}
