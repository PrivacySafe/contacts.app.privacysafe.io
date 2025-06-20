/*
 Copyright (C) 2020 - 2025 3NSoft Inc.

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

import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { makeServiceCaller } from '@shared/ipc/ipc-service-caller';
import { useAppStore } from '@main/common/store/app.store.ts';
import { useContactsStore } from '@main/common/store/contacts.store.ts';
import type { AppContactsService } from '@main/common/types';

export type AppViewInstance = ReturnType<typeof useAppView>;

export function useAppView() {
  const appStore = useAppStore();
  const {
    user, connectivityStatus, appElement, appVersion
  } = storeToRefs(appStore);

  const { fetchContacts } = useContactsStore();

  const connectivityStatusText = computed(() =>
    connectivityStatus.value === 'online' ? 'app.status.connected.online' : 'app.status.connected.offline',
  );

  async function appExit() {
    w3n.closeSelf!();
  }

  async function doBeforeMount() {
    try {
      await Promise.all([
        appStore.initialize(),

        fetchContacts()
      ]);

      // XXX the following should get to contacts store

      const contactsSrvConnection = await w3n.rpc!.thisApp!(
        'AppContactsInternal'
      );
      const contactsSrv = makeServiceCaller(
        contactsSrvConnection, [], ['watchContactList']
      ) as AppContactsService;
      contactsSrv.watchContactList({
        next: () => fetchContacts(),
        error: e => console.error(e),
        complete: () => contactsSrvConnection.close(),
      });
    } catch (e) {
      console.error('MOUNTED ERROR: ', e);
    }
  }

  function doBeforeUnmount() {
    appStore.stopWatching();
  }

  return {
    appExit,
    appElement,
    appVersion,
    connectivityStatusText,
    doBeforeMount,
    doBeforeUnmount,
    user
  };
}
