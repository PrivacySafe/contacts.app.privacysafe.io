export * from './common-app.ts';
export * from './contacts-service.ts';

import type { ContactsService, Person, PersonView } from './contacts-service.ts';

export interface AppGlobalEvents {
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  'contact-list:updated': void;
}

export type AppContactsService = ContactsService;

export type ContactContent = Omit<Person, 'id'|'avatar'|'avatarMini'|'activities'|'timestamp'>;

export interface ContactGroup {
  id: string;
  title: string;
  contacts: (PersonView & { displayName: string })[];
}

export interface OpenChatCmdArg {
  peerAddress: string;
}

export interface OpenInboxCmdArg {
  peerAddress: string;
}


