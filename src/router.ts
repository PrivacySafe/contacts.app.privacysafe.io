import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Contacts from '@/view/contacts.vue';
import ContactPlaceholder from '@/view/contact-placeholder.vue';
import Contact from '@/view/contact.vue';
import ContactNew from '@/view/contact-new.vue';

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

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
