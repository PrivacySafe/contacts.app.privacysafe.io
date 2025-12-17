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
import { ref } from 'vue';
import { ConnectivityStatus } from '@main/common/types';

export function useConnectivityStatus() {
  const connectivityStatus = ref<string>('offline');
  const connectivityTimerId = ref<ReturnType<typeof setInterval>>();

  async function fetchConnectivityStatus() {
    const status = await w3n.connectivity!.isOnline();

    if (status) {
      const parsedStatus = status.split('_');
      connectivityStatus.value = parsedStatus[0] as ConnectivityStatus;
    }
  }

  async function watchConnectivityStatus() {
    await fetchConnectivityStatus();

    connectivityTimerId.value = setInterval(fetchConnectivityStatus, 60000);
  }

  function stopWatchingConnectivityStatus() {
    connectivityTimerId.value && clearInterval(connectivityTimerId.value!);
  }

  watchConnectivityStatus();

  return {
    connectivityStatus,
    stopWatchingConnectivityStatus,
  };
}
