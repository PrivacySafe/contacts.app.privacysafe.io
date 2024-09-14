<!--
 Copyright (C) 2020 - 2024 3NSoft Inc.

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
-->
<script lang="ts" setup>
import { computed, defineAsyncComponent, inject, onBeforeMount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { debounce, omit } from 'lodash';
import { Ui3nButton, Ui3nIcon } from '@v1nt1248/3nclient-lib';
import {
  I18N_KEY,
  I18nPlugin,
  NOTIFICATIONS_KEY,
  NotificationsPlugin,
  DIALOGS_KEY,
  DialogsPlugin,
} from '@v1nt1248/3nclient-lib/plugins';
import { mailReg, getElementColor } from '@v1nt1248/3nclient-lib/utils';
import { useContactsStore } from '@/store/contacts.store';
import { useAppStore } from '@/store/app.store';
import { areAddressesEqual } from '../../shared-libs/address-utils';
import { chatApp, nonEditableContacts } from '@/constants';
import type { ContactContent, OpenChatCmdArg } from '@/types';
import ContactBody from '@/components/contact-content.vue';

const { $tr } = inject<I18nPlugin>(I18N_KEY)!;
const notification = inject<NotificationsPlugin>(NOTIFICATIONS_KEY)!;
const dialog = inject<DialogsPlugin>(DIALOGS_KEY);

const route = useRoute();
const router = useRouter();
const contactsStore = useContactsStore();
const { getContact } = contactsStore;

const appStore = useAppStore();
const isUserAddress = computed(() => (data.value.mail ?
    areAddressesEqual(appStore.user, data.value.mail) : false
));

const contactId = computed<string>(() => route.params.id as string);
const contactDisplayName = computed<string>(() => data.value.name || data.value.mail || ' ');
const contactLetters = computed<string>(() => (contactDisplayName.value.length > 1
    ? `${contactDisplayName.value[0].toLocaleUpperCase()}${contactDisplayName.value[1].toLocaleLowerCase()}`
    : contactDisplayName.value[0].toLocaleUpperCase()
));
const contactAvatarStyle = computed<Record<string, string>>(() => ({
  backgroundColor: getElementColor(contactLetters.value),
}));

const contentEl = ref<HTMLDivElement | null>(null);
const data = ref<ContactContent>({
  name: '',
  mail: '',
  notice: '',
  phone: '',
});
const contactValid = ref(true);

async function prepareContactFields() {
  if (contactId.value === 'new') {
    data.value = {
      name: '',
      mail: '',
      notice: '',
      phone: '',
    };
  } else if (contactId.value) {
    const contact = await getContact(contactId.value);
    if (contact) {
      data.value = {
        name: '',
        notice: '',
        phone: '',
        ...(omit(contact, ['id', 'avatar', 'avatarMini', 'activities'])),
      };
    }
  }
}

function checkRequired(mail?: string): boolean | string {
  return !!mail || $tr('validation.text.required');
}

function checkEmail(mail?: string): boolean | string {
  return mailReg.test(mail!) || $tr('validation.text.mail');
}

const rules = { mail: [checkRequired, checkEmail] };

function cancel() {
  router.push('/contacts');
}

async function deleteContact() {
  const confirmationDialogComponent = defineAsyncComponent(() => import('../components/confirmation-dialog.vue'));

  dialog?.$openDialog({
    component: confirmationDialogComponent,
    componentProps: {
      dialogText: $tr('confirmation.delete.text', { name: `<b>${contactDisplayName.value}</b>` }),
    },
    dialogProps: {
      title: $tr('contact.delete.title'),
      confirmButtonText: $tr('contact.delete.confirmBtn.text'),
      cancelButtonText: $tr('contact.delete.cancelBtn.text'),
      onConfirm: () => {
        contactsStore.deleteContact(contactId.value)
          .then(() => {
            notification.$createNotice({
              type: 'success',
              content: $tr('contact.delete.success.text'),
            });
          })
          .catch(() => {
            notification.$createNotice({
              type: 'error',
              content: $tr('contact.delete.error.text'),
            });
          })
          .finally(() => {
            cancel();
          });
      },
    },
  });
}

function onInput(value: ContactContent) {
  if (contactValid.value) {
    const savedData = {
      id: contactId.value,
      ...value,
    };
    contactsStore.upsertContact(savedData)
      .then(() => {
        notification.$createNotice({
          type: 'success',
          content: $tr('contact.upsert.success.text'),
        });
      })
      .catch(() => {
        notification.$createNotice({
          type: 'error',
          content: $tr('contact.upsert.error.text'),
        });
      });
  }
}

const debouncedOnInput = debounce(onInput, 500);

function openChat() {
  const peerAddress = data.value.mail;
  w3n.shell!.startAppWithParams!(
    chatApp.domain, chatApp.openCmd,
    {
      peerAddress,
    } as OpenChatCmdArg,
  )
    .then(() => console.log())
    .catch(err => console.error(err));
}

onBeforeMount(async () => {
  await prepareContactFields();
});

watch(
  () => contactId.value,
  async () => {
    await prepareContactFields();
    if (contentEl.value) {
      contentEl.value!.scrollTop = 0;
    }
  },
);
</script>

<template>
  <div :class="$style.contact">
    <div :class="$style.header">
      <ui3n-button
        v-if="!nonEditableContacts.includes(contactId)"
        type="icon"
        color="transparent"
        icon="outline-delete"
        icon-size="18"
        icon-color="var(--warning-content-default)"
        :class="$style.headerBtn"
        @click="deleteContact"
      />
      <div
        :class="$style.avatar"
        :style="contactAvatarStyle"
      >
        {{ contactLetters }}
      </div>
      <div :class="$style.actions">
        <ui3n-button
          v-if="!isUserAddress"
          type="icon"
          icon="outline-chat"
          icon-size="16"
          icon-color="var(--white-0)"
          @click="openChat"
        />
<!--          <ui3n-icon-->
<!--            icon="outline-chat"-->
<!--            width="16"-->
<!--            height="16"-->
<!--            color="var(&#45;&#45;color-icon-button-primary-default)"-->
<!--          />-->
<!--        </ui3n-button>-->

        <!--
        <ui3n-button
          type=primary
          icon="outline-mail"
          icon-size="16"
          size="small"
          :disabled="true"
        />
        -->
      </div>
    </div>

    <div
      ref="contentEl"
      :class="$style.content"
    >
      <contact-body
        v-model:contact="data"
        v-model:valid="contactValid"
        :rules="rules"
        :disabled="nonEditableContacts.includes(contactId)"
        @input="debouncedOnInput"
      />
    </div>
  </div>
</template>

<style lang="scss" module>
.contact {
  --contact-width: calc(var(--column-size) * 4);
  --contact-header-height: calc(var(--spacing-m) * 11);
  --contact-avatar-size: calc(var(--spacing-l) * 4);
  --contact-padding: var(--spacing-m);

  position: relative;
  width: var(--contact-size);
  height: 100%;
  padding: var(--contact-padding) 0 var(--contact-padding) var(--contact-padding);
}

.header {
  position: relative;
  width: 100%;
  height: var(--contact-header-height);
  padding-right: var(--contact-padding);
}

.headerBtn {
  position: absolute;
  top: 0;
  right: var(--spacing-s);
}

.actions {
  display: flex;
  justify-content: center;
  align-items: center;
  column-gap: var(--spacing-s);

  button {
    border-radius: var(--spacing-xs) !important;
  }
}

.avatar {
  position: relative;
  width: var(--contact-avatar-size);
  height: var(--contact-avatar-size);
  border-radius: 50%;
  user-select: none;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto var(--spacing-m) auto;
  color: var(--color-text-avatar-primary-default);
  -webkit-font-smoothing: antialiased;
  font-size: 50px;
  font-weight: 500;
}

.content {
  position: relative;
  width: 100%;
  height: calc(100% - var(--contact-header-height) - var(--spacing-s));
  padding-right: var(--contact-padding);
  overflow-x: hidden;
  overflow-y: auto;
  margin-top: var(--spacing-s);
}

.contentField {
  margin-bottom: calc(var(--spacing-s) * 1.5);
}
</style>
