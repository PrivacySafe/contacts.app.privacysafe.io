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
import { computed } from 'vue';
import { getElementColor } from '@v1nt1248/3nclient-lib/utils';
import { Ui3nButton, Ui3nIcon } from '@v1nt1248/3nclient-lib';
import { useContact } from '@main/common/composables/useContact';
import type { ContactContent, Person } from '@main/common/types';
import ContactBody from '@main/common/components/contact-content.vue';
import { useRouting } from '../composables/useRouting';

const { goToContacts } = useRouting();

const {
  $tr,
  notification,
  rules,
  contact,
  contactValid,
  contactLetters,
  upsertContact,
} = useContact();

contact.value = {
  id: 'new',
  name: '',
  mail: '',
  notice: '',
  phone: '',
};

const contactLettersStyle = computed(() => ({
  backgroundColor: contactLetters.value
    ? getElementColor(contactLetters.value)
    : 'var(--color-bg-button-secondary-default)',
}));

function onFieldUpdate({ field, val }: { field: keyof (ContactContent | Person), val: string }) {
  contact.value![field] = val;
}

function cancel() {
  goToContacts();
}

async function saveContact() {
  if (contactValid.value) {
    try {
      const res = await upsertContact(contact.value!);

      if (res?.errorType) {
        notification.$createNotice({
          type: 'error',
          content: res.errorMessage,
          duration: 5000,
        });
      } else {
        notification.$createNotice({
          type: 'success',
          content: $tr('contact.upsert.success.text'),
        });
        cancel();
      }
    } catch {
      notification.$createNotice({
        type: 'error',
        content: $tr('contact.upsert.error.text'),
      });
    }
  }
}
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
        :contact="contact!"
        :valid="contactValid"
        :rules="rules"
        @update:field="onFieldUpdate"
        @update:valid="contactValid = $event"
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
        :disabled="!contactValid"
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
