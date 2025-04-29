import { defineStore } from 'pinia';
import { useSystemLevelAppConfig } from './app/system-level-app-config';
import { useConnectivityStatus } from './app/connectivity';
import { useAppSize } from './app/app-size';

export type AppStore = ReturnType<typeof useAppStore>;

export const useAppStore = defineStore('app', () => {

  const appSize = useAppSize();
  const {
    appElement
  } = appSize;

  const connectivity = useConnectivityStatus();
  const {
    connectivityStatus
  } = connectivity;

  const commonAppConfs = useSystemLevelAppConfig();
  const {
    appVersion,
    user,
    lang,
    colorTheme
  } = commonAppConfs;

  async function initialize() {
    await Promise.all([
      connectivity.initialize(),
      commonAppConfs.initialize()
    ]);
  }

  function stopWatching() {
    appSize.stopWatching();
    connectivity.stopConnectivityCheck();
    commonAppConfs.stopWatching();
  }

  return {
    appVersion,
    user,
    lang,
    colorTheme,

    connectivityStatus,

    appElement,

    initialize,
    stopWatching,
  };
});
