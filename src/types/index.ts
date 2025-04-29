export * from './common-app';
export * from './contacts-service';

import { ContactsService, Person, PersonView } from './contacts-service';

export interface AppContactsService extends ContactsService {
  updateContact(contact: Person): Promise<void>;
  deleteContact(id: string): Promise<void>;
}

export type ContactContent = Omit<Person, 'id'|'avatar'|'avatarMini'|'activities'>;

export interface ContactGroup {
  id: string;
  title: string;
  contacts: Array<PersonView & { displayName: string }>;
}

export interface OpenChatCmdArg {
  peerAddress: string;
}
