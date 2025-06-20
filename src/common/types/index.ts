export * from './common-app.ts';
export * from './contacts-service.ts';

import { ContactsService, Person, PersonView } from './contacts-service.ts';

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

export interface OpenInboxCmdArg {
  peerAddress: string;
}
