/*
 Copyright (C) 2026 3NSoft Inc.

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
// Pure part of the contacts-db conflict resolution, kept free of any
// sqlite/3NStorage import so that it can be unit-tested without pulling in the
// ~1MB precompiled sqlite-on-3nstorage bundle.
import { normalizeJsonField } from './obj-processing.ts';
import type { Person, RawPerson } from '../../src/types/index.ts';

interface ValidatedContactField {
  field: Exclude<keyof Person, 'id' | 'mail' | 'avatarImage'>;
  extraCheck?: boolean;
}

export const validatedContactFields: ValidatedContactField[] = [
  {
    field: 'name',
  },
  {
    field: 'avatarId',
  },
  {
    field: 'timestamp',
  },
  {
    field: 'notice',
    extraCheck: true,
  },
  {
    field: 'phone',
  },
  {
    field: 'activities',
    extraCheck: true,
  },
  {
    field: 'settings',
    extraCheck: true,
  }];

const jsonFields = ['activities', 'settings'];

/**
 * Copies a contact row read out of sqlite, passing the JSON-ish columns through
 * normalizeJsonField. Iterating field NAMES here is essential: `for...in` over
 * the Object.keys() array walks its indices ("0", "1", …) instead, which
 * silently produces a row with numeric keys and undefined values.
 */
export function normalizeContactRow(contact: RawPerson): RawPerson {
  const normalized = {} as RawPerson;
  for (const field of Object.keys(contact)) {
    if (jsonFields.includes(field)) {
      // @ts-ignore
      normalized[field] = normalizeJsonField(contact[field] as string);
    } else {
      // @ts-ignore
      normalized[field] = contact[field];
    }
  }
  return normalized;
}

/**
 * Merges the local and the remote contact lists field by field, matching rows
 * by mail address. For a field present on both sides the value of the record
 * with the newer timestamp wins.
 *
 * `areThereDifferences` reports whether the remote side contributed anything
 * the local side did not have; the caller uses it to decide between rewriting
 * the table plus uploading, and simply adopting the remote version.
 */
export function resolveDbFileConflict(
  contactListRemote: RawPerson[],
  contactList: RawPerson[],
): { areThereDifferences: boolean; resolvedContactList: RawPerson[] } {
  const resolvedContactList: RawPerson[] = [];
  let areThereDifferences = false;
  const remoteMap = new Map(contactListRemote.map(p => [p.mail, p]));

  for (const localPerson of contactList) {
    const remotePerson = remoteMap.get(localPerson.mail);

    if (!remotePerson) {
      resolvedContactList.push(localPerson);
    } else {
      const resolvedContact = { id: localPerson.id, mail: localPerson.mail } as RawPerson;
      const olderRecord = localPerson.timestamp >= remotePerson.timestamp ? localPerson : remotePerson;

      for (const item of validatedContactFields) {
        const { field } = item;

        if (!localPerson[field] && !remotePerson[field]) {
          // @ts-ignore
          resolvedContact[field] = null;
          continue;
        }

        if (localPerson[field] && !remotePerson[field]) {
          // @ts-ignore
          resolvedContact[field] = localPerson[field];
        } else if (remotePerson[field] && !localPerson[field]) {
          // @ts-ignore
          resolvedContact[field] = remotePerson[field];
          areThereDifferences = true;
        } else {
          // @ts-ignore
          resolvedContact[field] = olderRecord[field];
          remotePerson.timestamp > localPerson.timestamp && (areThereDifferences = true);
        }
      }

      resolvedContactList.push(resolvedContact);

      remoteMap.delete(localPerson.mail);
    }
  }

  for (const remotePerson of remoteMap.values()) {
    areThereDifferences = true;
    resolvedContactList.push(remotePerson);
  }

  return { areThereDifferences, resolvedContactList };
}
