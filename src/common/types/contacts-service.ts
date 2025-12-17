/*
 Copyright (C) 2020-2025 3NSoft Inc.

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

export interface ContactsService {
  isThereContactWithTheMail(mail: string): Promise<boolean>;

  getContactByMail(mail: string): Promise<Person | undefined>;

  getContactList(withImage?: boolean): Promise<PersonView[]>;

  getContact(id: string): Promise<Person | undefined>;

  insertContact(contact: Person | Omit<Person, 'timestamp'>): Promise<string | {
    errorType: string;
    errorMessage: string
  }>;

  updateContact(contact: Person | Omit<Person, 'timestamp'>): Promise<string>;

  upsertContact(contact: Person | Omit<Person, 'timestamp'>): Promise<string | {
    errorType: string;
    errorMessage: string
  }>;

  deleteContact(id: string): Promise<void>;

  addImage(
    { base64, id, withUploadParentFolder }:
    { base64: string; id?: string; withUploadParentFolder?: boolean },
  ): Promise<string>;

  getImage(id: string): Promise<string>;

  deleteImage(id: string): Promise<void>;

  removeUnnecessaryImageFiles(): Promise<void>;

  watchContactList(obs: web3n.Observer<PersonView[]>): () => void;

  completeAllWatchers(): void;

  checkSyncStatus(): Promise<'synced' | 'unsynced'>;

  watchEvent(obs: web3n.Observer<ContactEvent>): () => void;
}

export interface ContactAddedEvent {
  event: 'added';
  contact: Person;
}

export interface ContactRemovedEvent {
  event: 'removed';
  contactId: string;
}

export interface ContactUpdatedEvent {
  event: 'updated';
  contact: Person;
}

export interface ContactProcessingStartEvent {
  event: 'processing:start';
}

export interface ContactProcessingEndEvent {
  event: 'processing:end';
}

export interface ContactSyncStatusChangeEvent {
  event: 'syncstatus:change';
  status: 'synced' | 'unsynced';
}

export type ContactEvent = ContactAddedEvent
  | ContactRemovedEvent
  | ContactUpdatedEvent
  | ContactProcessingStartEvent
  | ContactProcessingEndEvent
  | ContactSyncStatusChangeEvent;

export interface PersonView {
  id: string;
  name?: string;
  mail: string;
  avatarId?: string;
  avatarImage?: string;
  timestamp: number;
}

export interface Person extends PersonView {
  notice?: string;
  phone?: string;
  activities?: string[];
  settings?: unknown;
}

export interface PersonActivity {
  id: string;
  type: 'chat' | 'mail';
  description: string;
  timestamp: number;
}

export interface ContactsException extends web3n.RuntimeException {
  type: 'contacts';
  contactAlreadyExists?: true;
  invalidValue?: true;
  failASMailCheck?: true;
}
