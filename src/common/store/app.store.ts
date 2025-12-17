import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useSystemLevelAppConfig } from './app/system-level-app-config';
import { useAppSize } from './app/app-size';

export const useAppStore = defineStore('app', () => {
  const syncStatus = ref<'synced' | 'unsynced'>('unsynced');

  function setSyncStatus(val: 'synced' | 'unsynced') {
    syncStatus.value = val;
  }

  const appSize = useAppSize();
  const { appElement } = appSize;

  const commonAppConfs = useSystemLevelAppConfig();
  const { appVersion, user, lang, colorTheme, customLogoSrc } = commonAppConfs;

  async function initialize() {
    await commonAppConfs.initialize();
  }

  function stopWatching() {
    appSize.stopWatching();
    commonAppConfs.stopWatching();
  }

  return {
    appVersion,
    user,
    lang,
    colorTheme,
    customLogoSrc,
    syncStatus,
    appElement,
    initialize,
    stopWatching,
    setSyncStatus,
  };
});
