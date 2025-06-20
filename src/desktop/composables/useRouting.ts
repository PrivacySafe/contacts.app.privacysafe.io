/*
 Copyright (C) 2025 3NSoft Inc.

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

import { useRoute, useRouter } from 'vue-router';
import type { ContactRoute, ContactsRoute, NewContactRoute } from '../router';

export function useRouting() {
  const route = useRoute();
  const router = useRouter();

  function goToContacts() {
    const r: ContactsRoute = {
      name: 'contacts',
    };
    return router.push(r);
  }

  function goToContact(id: string) {
    const r: ContactRoute = {
      name: 'contact',
      params: {
        id,
      },
    };
    return router.push(r);
  }

  function getContactIdFromRoute(
    params?: ContactRoute['params'],
  ): string | undefined {
    const { id } = params ?? route.params as ContactRoute['params'];
    return id;
  }

  function goToNew() {
    const r: NewContactRoute = {
      name: 'contact-new',
    };
    return router.push(r);
  }

  return {
    route,
    router,
    goToContacts,
    goToContact,
    getContactIdFromRoute,
    goToNew,
  };
}
