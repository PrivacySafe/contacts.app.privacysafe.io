export type FileException = web3n.files.FileException;
export type XAttrsChanges = web3n.files.XAttrsChanges;
export type WritableFS = web3n.files.WritableFS;
export type ReadonlyFS = web3n.files.ReadonlyFS;

export interface LabelledFileStore {
  addBlob(blob: Blob, info?: ItemAttrs): Promise<string>;
  addFolder(folder: ReadonlyFS, info?: ItemAttrs): Promise<string>;
  getBlob(id: string): Promise<Blob>;
  getFolderRO(id: string): Promise<ReadonlyFS>;
  getFolderWR(id: string): Promise<WritableFS>;
  updateBlob(id: string, blob: Blob): Promise<void>;
  updateInfo(id: string, info: ItemAttrs): Promise<void>;
  getInfo(id: string): Promise<FileInfo | FolderInfo>;
  delete(id: string): Promise<void>;
}

export interface ItemAttrs {
  fileName?: string;
}

export interface ItemInfo extends ItemAttrs {
  id: string;
  version: number;
  ctime: Date;
  mtime: Date;
}

export interface FileInfo extends ItemInfo {
  isFile: true;
  size: number;
  type: string;
}

export interface FolderInfo extends ItemInfo {
  isFolder: true;
}
