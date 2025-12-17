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

import { computed, inject, watch } from 'vue';
import { storeToRefs } from 'pinia';
import {
  I18nPlugin,
  I18N_KEY,
  VueBusPlugin,
  VUEBUS_KEY,
  NotificationsPlugin,
  NOTIFICATIONS_KEY,
} from '@v1nt1248/3nclient-lib/plugins';
import { makeServiceCaller } from '@shared/ipc/ipc-service-caller';
import { useAppStore } from '@main/common/store/app.store.ts';
import { useContactsStore } from '@main/common/store/contacts.store.ts';
import { useConnectivityStatus } from '@main/common/composables/useConnectivityStatus.ts';
import type { AppContactsService, AppGlobalEvents } from '@main/common/types';

export type AppViewInstance = ReturnType<typeof useAppView>;

export function useAppView() {
  const { $emitter } = inject<VueBusPlugin<AppGlobalEvents>>(VUEBUS_KEY)!;
  const { $tr } = inject<I18nPlugin>(I18N_KEY)!;
  const { $createNotice } = inject<NotificationsPlugin>(NOTIFICATIONS_KEY)!;

  const appStore = useAppStore();
  const { user, syncStatus, appElement, appVersion, customLogoSrc } = storeToRefs(appStore);
  const { setSyncStatus } = appStore;

  const { fetchContacts } = useContactsStore();

  const { connectivityStatus, stopWatchingConnectivityStatus } = useConnectivityStatus();

  const connectivityStatusText = computed(() => connectivityStatus.value === 'online'
    ? $tr('app.status.connected.online')
    : $tr('app.status.connected.offline'),
  );
  const syncStatusText = computed(() => syncStatus.value === 'synced'
    ? $tr('app.status.synced')
    : $tr('app.status.unsynced'),
  );

  async function appExit() {
    w3n.closeSelf!();
  }

  watch(
    connectivityStatus,
    async (val, oVal) => {
      if (val === 'online' && oVal === 'offline') {
        $createNotice({
          type: 'info',
          content: $tr('app.info.for.online.status'),
          duration: 4000,
        });
      } else if (val === 'offline' && oVal === 'online') {
        $createNotice({
          type: 'warning',
          content: $tr('app.info.for.offline.status'),
          duration: 4000,
        });
        setSyncStatus('unsynced');
      }
    }, {
      immediate: true,
    },
  );

  async function doBeforeMount() {
    try {
      await Promise.all([
        appStore.initialize(),
        fetchContacts(true),
      ]);

      const contactsSrvConnection = await w3n.rpc!.thisApp!('AppContactsInternal');
      const contactsSrv = makeServiceCaller(
        contactsSrvConnection,
        ['checkSyncStatus'],
        ['watchContactList', 'watchEvent'],
      ) as AppContactsService;

      const sStatus = await contactsSrv.checkSyncStatus();
      setSyncStatus(sStatus);

      contactsSrv.watchContactList({
        next: () => fetchContacts(true),
        error: e => w3n.log('error', 'Error watching the contact list. ', e),
        complete: () => contactsSrvConnection.close(),
      });

      contactsSrv.watchEvent({
        next: evt => {
          if (evt.event === 'processing:end') {
            $emitter.emit('contact-list:updated', void 0);
            fetchContacts(true);
          } else if (evt.event === 'syncstatus:change') {
            setSyncStatus(evt.status);
          }
        },
        error: e => w3n.log('error', 'Error watching contact events. ', e),
        complete: () => contactsSrvConnection.close(),
      });
    } catch (e) {
      console.error('Error while the app mounting: ', e);
    }
  }

  function doBeforeUnmount() {
    appStore.stopWatching();
    stopWatchingConnectivityStatus();
  }

  return {
    user,
    customLogoSrc,
    appElement,
    appVersion,
    connectivityStatusText,
    syncStatusText,
    appExit,
    doBeforeMount,
    doBeforeUnmount,
  };
}
