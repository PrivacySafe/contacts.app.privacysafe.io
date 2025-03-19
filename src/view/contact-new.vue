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
import { computed, inject, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  I18N_KEY,
  I18nPlugin,
  NOTIFICATIONS_KEY,
  NotificationsPlugin,
} from '@v1nt1248/3nclient-lib/plugins';
import { mailReg, getElementColor } from '@v1nt1248/3nclient-lib/utils';
import { Ui3nButton, Ui3nIcon } from '@v1nt1248/3nclient-lib';
import { useContactsStore } from '@/store/contacts.store';
import type { ContactContent } from '@/types';
import ContactBody from '@/components/contact-content.vue';

const { $tr } = inject<I18nPlugin>(I18N_KEY)!;
const notification = inject<NotificationsPlugin>(NOTIFICATIONS_KEY)!;

const router = useRouter();
const contactsStore = useContactsStore();

const data = ref<ContactContent>({
  name: '',
  mail: '',
  notice: '',
  phone: '',
});
const valid = ref(false);

const contactLetters = computed<string>(() => {
  const contactDisplayName = data.value.name || data.value.mail || '';
  if (contactDisplayName) {
    return contactDisplayName.length === 1
      ? contactDisplayName.toLocaleUpperCase()
      : `${contactDisplayName[0].toLocaleUpperCase()}${contactDisplayName[1].toLocaleLowerCase()}`;
  }
  return '';
});
const contactLettersStyle = computed(() => {
  return {
    backgroundColor: contactLetters.value
      ? getElementColor(contactLetters.value)
      : 'var(--gray-50, #f2f2f2)',
  };
});

const checkRequired = (mail?: unknown): boolean | string => !!mail || $tr('validation.text.required');
const checkEmail = (mail?: unknown): boolean | string => mailReg.test(mail! as string) || $tr('validation.text.mail');
const rules = { mail: [checkRequired, checkEmail] };

const cancel = () => {
  router.push('/contacts');
};
const saveContact = () => {
  if (valid.value) {
    const savedData = {
      id: 'new',
      ...data.value,
    };

    contactsStore.upsertContact(savedData)
      .then(() => {
        notification.$createNotice({
          type: 'success',
          content: $tr('contact.upsert.success.text'),
        });
        cancel();
      })
      .catch(() => {
        notification.$createNotice({
          type: 'error',
          content: $tr('contact.upsert.error.text'),
        });
      });
  }
};
</script>

<template>
  <div :class="$style.contactNew">
    <ui3n-button
      type="icon"
      color="transparent"
      icon="outline-close"
      icon-size="18"
      icon-color="var(--color-icon-block-primary-default)"
      :class="$style.cancelBtn"
      @click="cancel"
    />

    <div :class="$style.avatar">
      <div
        :class="$style.avatarWrapper"
        :style="contactLettersStyle"
      >
        <span
          v-if="contactLetters"
          :class="$style.avatarText"
        >
          {{ contactLetters }}
        </span>

        <ui3n-icon
          v-else
          icon="round-person"
          :width="96"
          :height="96"
          color="var(--white-0)"
        />
      </div>
    </div>

    <div :class="$style.content">
      <contact-body
        v-model:contact="data"
        v-model:valid="valid"
        :rules="rules"
      />
    </div>

    <div :class="$style.actions">
      <ui3n-button
        type="secondary"
        @click="cancel"
      >
        {{ $tr('app.btn.cancel') }}
      </ui3n-button>

      <ui3n-button
        :disabled="!valid"
        @click="saveContact"
      >
        {{ $tr('app.btn.save') }}
      </ui3n-button>
    </div>
  </div>
</template>

<style lang="scss" module>
.contactNew {
  --contact-padding: var(--spacing-m);

  position: relative;
  width: 100%;
  height: 100%;
  padding: var(--contact-padding) 0 var(--contact-padding) var(--contact-padding);
}

.cancelBtn {
  position: absolute;
  top: var(--spacing-s);
  right: var(--spacing-s);
  z-index: 1;
}

.actions {
  position: absolute;
  left: var(--spacing-m);
  right: var(--spacing-m);
  bottom: var(--spacing-m);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-right: var(--contact-padding);
  column-gap: var(--spacing-s);
}

.avatar {
  position: relative;
  width: 100%;
  height: calc(var(--base-size) * 16);
  padding-right: var(--contact-padding);
  margin-bottom: calc(var(--base-size) * 2);
  display: flex;
  justify-content: center;
  align-items: center;
}

.avatarWrapper {
  position: relative;
  width: calc(var(--spacing-l) * 4);
  height: calc(var(--spacing-l) * 4);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--color-bg-control-secondary-default);
}

.avatarText {
  -webkit-font-smoothing: antialiased;
  font-size: 48px;
  font-weight: 500;
  line-height: 1;
  color: var(--color-text-avatar-primary-default);
  pointer-events: none;
  user-select: none;
}

.content {
  position: relative;
  width: 100%;
  height: calc(100% - var(--spacing-s) * 23);
  overflow-y: auto;
  padding-right: var(--contact-padding);
}
</style>
