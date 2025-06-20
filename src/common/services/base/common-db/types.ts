import type { DbCollection } from '@main/common/services/base/common-db/db-collection.ts';

export type WritableFS = web3n.files.WritableFS;

export type IndexDataFieldValue = string | number | boolean | undefined | string[]

export interface DataToProcessing {
  fieldValue: string | undefined; // string = result JSON.stringify(string|number|boolean|string[])
  ids: string[];
}

export interface DbDocBase {
  id: string;
  createdAt?: number;
}

export interface DbFileCollection<T extends DbDocBase> {
  getCollectionName(): string | undefined;
  get(id: string): Promise<T | null>;
  insert(docs: T[]): Promise<Record<string, T>>;
  delete(ids: string[]): Promise<void>;
  update(doc: T): Promise<void>;
}

export interface DbCollectionOptions {
  singleFile?: boolean;
  indexes?: string[];
}

export interface DbCommon {
  getCollectionList(): Promise<string[]>;
  initCollection<T extends DbDocBase>(name: string, options?: DbCollectionOptions): Promise<DbCollection<T>>;
  deleteCollection(name: string): Promise<void>;
}
