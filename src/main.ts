import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { router } from './router';
import { i18n, I18nOptions, dialogs, notifications } from '@v1nt1248/3nclient-lib/plugins';
import { initializationServices } from '@/services/services-provider';

import '@v1nt1248/3nclient-lib/style.css';
import '@v1nt1248/3nclient-lib/variables.css';
import '@/assets/styles/main.css';

import en from './data/i18/en.json';

import App from '@/view/app.vue';

const mode = process.env.NODE_ENV;

const init = () => {
  initializationServices()
    .then(() => {
      const pinia = createPinia();
      const app = createApp(App);

      // app.config.errorHandler = (err, instance, info) => {
      //   // handle error, e.g. report to a service
      // }
      app.config.globalProperties.$router = router;
      app.config.compilerOptions.isCustomElement = tag => {
        return tag.startsWith('ui3n-');
      };

      app
        .use(pinia)
        .use<I18nOptions>(i18n, { lang: 'en', messages: { en } })
        .use(dialogs)
        .use(notifications)
        .use(router)
        .mount('#main');
    });
};

if ((w3n as web3n.testing.CommonW3N).testStand && mode !== 'production') {
  import('@vue/devtools')
    .then(devtools => {
      (w3n as web3n.testing.CommonW3N).testStand.staticTestInfo()
        .then((data: { userNum: number, userId: string }) => {
          const { userNum } = data;
          devtools.devtools.connect('http://localhost', 8098 + userNum);
          init();
        });
    });
} else if (mode !== 'production') {
  import('@vue/devtools')
    .then(devtools => {
      devtools.devtools.connect('http://localhost', 8098);
      init();
    });
} else {
  init();
}
