import { defineStore } from 'pinia';
import { UISettings } from '@/services/ui-settings';
import type { ConnectivityStatus, AvailableColorTheme, AvailableLanguage } from '@/types';

export interface AppStoreState {
  connectivityStatus: ConnectivityStatus;
  user: string;
  lang: AvailableLanguage;
  colorTheme: AvailableColorTheme;
}

export const useAppStore = defineStore(
  'app',
  {
    state: (): AppStoreState => {
      return {
        connectivityStatus: 'offline',
        user: '',
        lang: 'en',
        colorTheme: 'default',
      };
    },

    actions: {
      async getConnectivityStatus() {
        const status = await w3n.connectivity!.isOnline();
        const parsedStatus = status.split('_');
        this.connectivityStatus = parsedStatus[0] as ConnectivityStatus;
      },

      async getUser() {
        this.user = await w3n.mailerid!.getUserId();
      },

      async getAppConfig() {
        try {
          const config = await UISettings.makeResourceReader();
          const lang = await config.getCurrentLanguage();
          const colorTheme = await config.getCurrentColorTheme();
          this.setLang(lang);
          this.setColorTheme(colorTheme);
          return config;
        } catch (e) {
          console.error('Load the app config error: ', e);
        }
      },

      setLang(lang: AvailableLanguage) {
        this.lang = lang;
      },

      setColorTheme(theme: AvailableColorTheme) {
        this.colorTheme = theme;
        const htmlEl = document.querySelector('html');
        if (!htmlEl) return;

        const prevColorThemeCssClass = theme === 'default' ? 'dark-theme' : 'default-theme';
        const curColorThemeCssClass = theme === 'default' ? 'default-theme' : 'dark-theme';
        htmlEl.classList.remove(prevColorThemeCssClass);
        htmlEl.classList.add(curColorThemeCssClass);
      },
    },
  },
);
