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
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { dialogs, i18n, I18nOptions, notifications } from '@v1nt1248/3nclient-lib/plugins';
import { piniaRouter } from '@main/common/plugins/pinia-router';
import { router } from './router';
import { initializeServices } from '@main/common/services/services-provider';

import '@v1nt1248/3nclient-lib/style.css';
import '@v1nt1248/3nclient-lib/variables.css';
import '@main/common/assets/styles/main.css';

import en from '@main/common/data/i18/en.json';

import App from '@main/mobile/pages/app.vue';

initializeServices()
  .then(() => {
    const pinia = createPinia();
    pinia.use(piniaRouter);

    const app = createApp(App);

    app.config.compilerOptions.isCustomElement = tag => {
      return tag.startsWith('ui3n-');
    };

    app
      .use(pinia)
      .use<I18nOptions>(i18n, { lang: 'en', messages: { en } })
      .use(dialogs)
      .use(notifications)
      .use(router)
      .mount('#mobile');
  });
