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
export interface ContactSyncStartEvent {
  event: 'sync:start';
  payload: {
    path: string;
  };
}

export interface ContactSyncEndEvent {
  event: 'sync:end';
  payload: {
    path: string;
    error?: string;
  };
}

export interface ContactListUpdate {
  event: 'update:contact-list';
  payload?: {
    data: PersonView[];
  };
}

export interface ContactAddEvent {
  event: 'add:contact';
  payload: {
    data: Person;
  };
}

export interface ContactRemoveEvent {
  event: 'remove:contact';
  payload: {
    id: string;
  };
}

export interface ContactUpdateEvent {
  event: 'update:contact';
  payload: {
    data: Person;
  };
}

export type ContactEvent = ContactSyncStartEvent
  | ContactSyncEndEvent
  | ContactListUpdate
  | ContactAddEvent
  | ContactRemoveEvent
  | ContactUpdateEvent;

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

export type ContactListItem = PersonView & { displayName: string };

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
