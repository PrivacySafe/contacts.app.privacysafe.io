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

export interface ContactSyncCleanEvent {
  event: 'sync:clean';
  payload: {
    reason?: string;
  };
}

/**
 * Synchronisation cannot be resumed although the device reports being online.
 * Unlike sync:clean this is a STATE, not a one-off notice: it stays until
 * `isStuck` arrives as false, so the ui can keep telling the user that what
 * they see is not reaching the server.
 */
export interface ContactSyncStuckEvent {
  event: 'sync:stuck';
  payload: {
    isStuck: boolean;
    reason?: string;
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

export type ContactEvent =
  | ContactSyncStartEvent
  | ContactSyncEndEvent
  | ContactSyncCleanEvent
  | ContactSyncStuckEvent
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
  activities?: string[] | null;
  settings?: unknown | null;
}

export interface RawPerson extends Omit<Person, 'activities' | 'settings' | 'avatarImage'> {
  activities?: string | null;
  settings?: string | null;
}

export type ContactListItem = PersonView & { displayName: string };

export interface PersonActivity {
  id: string;
  type: 'chat' | 'mail';
  description: string;
  timestamp: number;
}

/**
 * Outcome of asking ASMail whether an address can receive at all.
 * Shared, because the check runs in the deno component - only it is granted
 * `mail: { preflightsTo }` - while the decision is made in the GUI.
 */
export type AddressCheckResult =
  'found'
  | 'found-but-access-restricted'
  | 'not-present-at-domain'
  | 'no-service-for-domain';

export interface ContactsException extends web3n.RuntimeException {
  type: 'contacts';
  contactAlreadyExists?: true;
  contactNotFound?: true;
  invalidValue?: true;
}
