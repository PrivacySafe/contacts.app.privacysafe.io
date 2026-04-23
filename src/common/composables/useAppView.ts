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
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { VueBusPlugin, VUEBUS_KEY, NotificationsPlugin, NOTIFICATIONS_KEY } from '@v1nt1248/3nclient-lib/plugins';
import { makeServiceCaller } from '@shared/ipc/ipc-service-caller';
import { appContactsSrvProxy } from '@main/common/services/services-provider';
import { useAppStore } from '@main/common/store/app.store';
import { useSyncStore } from '@main/common/store/sync.store';
import { useContactsStore } from '@main/common/store/contacts.store';
import { useConnectivityStatus } from '@main/common/composables/useConnectivityStatus';
import type { AppGlobalEvents } from '@main/types';
import type { ContactsDenoSrv } from '../../../src-deno/contacts-deno-srv';
import { CONTACTS_DB_FILE } from '../../../src-deno/constants';

export type AppViewInstance = ReturnType<typeof useAppView>;

export function useAppView() {
  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();

  const { $emitter } = inject<VueBusPlugin<AppGlobalEvents>>(VUEBUS_KEY)!;
  const { $createNotice } = inject<NotificationsPlugin>(NOTIFICATIONS_KEY)!;

  const { connectivityStatus } = useConnectivityStatus();

  const appStore = useAppStore();
  const { user, appElement, appVersion, customLogoSrc, globalLoading } = storeToRefs(appStore);
  const { setGlobalLoading } = appStore;

  const syncStore = useSyncStore();
  const { isSyncRunning } = storeToRefs(syncStore);
  const { addToSyncList, removeFromSyncList } = syncStore;

  const contactsStore = useContactsStore();
  const { contacts } = storeToRefs(contactsStore);
  const { fetchContacts } = contactsStore;

  const connectivityStatusText = computed(() =>
    connectivityStatus.value === 'online' ? t('app.status.connected.online') : t('app.status.connected.offline'),
  );

  const syncStatusText = computed(() => (isSyncRunning.value ? t('app.status.unsynced') : t('app.status.synced')));

  async function appExit() {
    w3n.closeSelf!();
  }

  watch(
    connectivityStatus,
    async (val, oVal) => {
      if (val === 'online' && oVal === 'offline') {
        $createNotice({
          type: 'info',
          content: t('app.info.status.online'),
          duration: 4000,
        });
      } else if (val === 'offline' && oVal === 'online') {
        $createNotice({
          type: 'warning',
          content: t('app.info.status.offline'),
          duration: 4000,
        });
      }
    },
    {
      immediate: true,
    },
  );

  let tu: ReturnType<typeof setInterval> | null = null;

  async function doBeforeMount() {
    setGlobalLoading(true);
    try {
      const contactsSrvConnection = await w3n.rpc!.thisApp!('AppContactsInternal');
      const contactsDenoSrv = makeServiceCaller(contactsSrvConnection, [], ['watchEvent']) as ContactsDenoSrv;

      await appStore.initialize();

      contactsDenoSrv.watchEvent({
        next: async evt => {
          // console.log('🕐 EVENT FROM DENO => ', JSON.stringify(evt));
          const { event, payload } = evt;
          // eslint-disable-next-line default-case
          switch (event) {
            case 'sync:start': {
              const { path } = payload;
              addToSyncList(path || 'root');
              break;
            }

            case 'sync:end': {
              const { path } = payload;
              removeFromSyncList(path || 'root');
              if (path === CONTACTS_DB_FILE) {
                $emitter.emit('contact-list:updated', void 0);
                await fetchContacts({});
              }
              break;
            }

            case 'update:contact-list': {
              await fetchContacts({});
              const { name } = route;
              if (name === 'contact') {
                const contactId = route.params.id as string;
                const contactIds = contacts.value.map(c => c.id);
                if (!contactIds.includes(contactId)) {
                  await router.push({ name: 'contacts' });
                }
              }
              break;
            }
          }
        },
        error: (e: unknown) => w3n.log('error', 'Error watching contact events. ', e),
        complete: () => contactsSrvConnection.close(),
      });

      await appContactsSrvProxy.initialSyncProcess();
      await fetchContacts({ withFullOverload: true });

      tu = setInterval(() => {
        appContactsSrvProxy.removeUnnecessaryImageFiles();
      }, 86400000); // every 24 hours
    } catch (e) {
      console.error('Error while the app mounting: ', e);
    } finally {
      setGlobalLoading(false);
    }
  }

  function doBeforeUnmount() {
    if (tu) {
      clearInterval(tu);
      tu = null;
    }

    appStore.stopWatching();
  }

  return {
    t,
    user,
    customLogoSrc,
    appElement,
    appVersion,
    connectivityStatusText,
    isSyncRunning,
    syncStatusText,
    globalLoading,
    appExit,
    doBeforeMount,
    doBeforeUnmount,
  };
}
