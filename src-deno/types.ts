import type { AddressCheckResult, ContactEvent, Person, RawPerson } from '../src/types/index.ts';

export interface ContactsDenoSrv {
  fs: web3n.files.WritableFS;
  emitStorageEvent: (event: ContactEvent) => void;
  watchEvent: (obs: web3n.Observer<ContactEvent>) => () => void;

  addImage: ({
    base64,
    id,
    withUploadParentFolder,
  }: {
    base64: string;
    id?: string;
    withUploadParentFolder?: boolean;
  }) => Promise<string>;
  getImage: (id: string) => Promise<string>;
  deleteImage: (id: string, withoutUpload?: boolean) => Promise<void>;

  addContact: (
    contact: RawPerson | Omit<RawPerson, 'timestamp'> | Person | Omit<Person, 'timestamp' | 'avatarImage'>,
  ) => Promise<
    | Person
    | {
        errorType: string;
        errorMessage: string;
      }
  >;
  updateContact: (
    contact: RawPerson | Omit<RawPerson, 'timestamp'> | Person | Omit<Person, 'timestamp' | 'avatarImage'>,
  ) => Promise<Person>;
  upsertContact: (
    contact: RawPerson | Omit<RawPerson, 'timestamp'> | Person | Omit<Person, 'timestamp' | 'avatarImage'>,
  ) => Promise<
    | Person
    | {
        errorType: string;
        errorMessage: string;
      }
  >;
  deleteContact: (id: string, withoutParentUpload?: boolean) => Promise<void>;
  getContactList: (withImage?: boolean) => Promise<Person[]>;
  getContact: (id: string) => Promise<Person | undefined>;
  getContactByMail: (mail: string) => Promise<Person | undefined>;

  /** ASMail's answer on whether the address can receive, or undefined if unknown. */
  checkAddressReachability: (addr: string) => Promise<AddressCheckResult | undefined>;

  removeUnnecessaryImageFiles: () => Promise<void>;
  initialSyncProcess: () => Promise<void>;
}

export type ContactsDenoSrvInternal = Omit<
  ContactsDenoSrv,
  'fs' | 'addContact' | 'updateContact' | 'getContactByMail'
>;

export type ContactsDenoSrvExternal = Pick<
  ContactsDenoSrv,
  'getContactByMail' | 'addContact' | 'upsertContact' | 'getContact' | 'getContactList'
>;
