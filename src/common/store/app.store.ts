import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useSystemLevelAppConfig } from './app/system-level-app-config';
import { useAppSize } from './app/app-size';

export const useAppStore = defineStore('app', () => {
  const globalLoading = ref(false);

  const appSize = useAppSize();
  const { appElement } = appSize;

  const commonAppConfs = useSystemLevelAppConfig();
  const { appVersion, user, lang, colorTheme, customLogoSrc } = commonAppConfs;

  function setGlobalLoading(value: boolean) {
    globalLoading.value = value;
  }

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
    appElement,
    globalLoading,
    initialize,
    setGlobalLoading,
    stopWatching,
  };
});
