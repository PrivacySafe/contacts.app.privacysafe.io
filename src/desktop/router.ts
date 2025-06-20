import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import Contacts from '@main/desktop/pages/contacts.vue';
import ContactPlaceholder from '@main/desktop/pages/contact-placeholder.vue';
import Contact from '@main/desktop/pages/contact.vue';
import ContactNew from '@main/desktop/pages/contact-new.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/contacts' },
  { path: '/index.html', redirect: '/contacts' },
  {
    path: '/contacts',
    name: 'contacts',
    component: Contacts,
    children: [
      {
        name: 'contact-new',
        path: 'new',
        component: ContactNew,
      },
      {
        name: 'contact',
        path: ':id',
        component: Contact,
        props: true,
      },
      {
        name: 'empty',
        path: '',
        component: ContactPlaceholder,
      },
    ],
  },
];

export interface ContactsRoute {
  name: 'contacts';
}

export interface ContactRoute {
  name: 'contact';
  params: {
    id: string;
  };
}

export interface NewContactRoute {
  name: 'contact-new';
}

export interface EmptyRoute {
  name: 'empty';
}

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
