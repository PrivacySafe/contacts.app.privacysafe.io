<!--
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
-->
<script setup lang="ts">
import { inject, onBeforeMount, onBeforeUnmount, watch, type WatchHandle } from 'vue';
import { VUEBUS_KEY, type VueBusPlugin } from '@v1nt1248/3nclient-lib/plugins';
import { Ui3nProgressCircular, Ui3nButton, Ui3nTooltip } from '@v1nt1248/3nclient-lib';
import { useContact } from '@main/common/composables/useContact';
import type { AppGlobalEvents } from '@main/common/types';
import ContactBody from '@main/common/components/contact-content.vue';

const { $emitter } = inject<VueBusPlugin<AppGlobalEvents>>(VUEBUS_KEY)!;

const {
  contentEl,
  isLoading,
  contactId,
  contact,
  isUserAddress,
  whetherContactChanged,
  contactAvatarStyle,
  contactLetters,
  imageProcessing,
  contactValid,
  rules,
  getContactData,
  delContact,
  uploadImage,
  deleteImage,
  openChat,
  openInbox,
  showOwnKeysInfo,
  showContactKeysInfo,
  onFieldUpdate,
  saveContact,
  cancel,
} = useContact();

const routeWatching: WatchHandle = watch(
  contactId,
  async () => {
    await getContactData();
    if (contentEl.value) {
      contentEl.value.scrollTop = 0;
    }
  }, {
    immediate: true,
  }
);

onBeforeMount(() => {
  $emitter.on('contact-list:updated', getContactData);
});

onBeforeUnmount(() => {
  routeWatching && routeWatching.stop();
  $emitter.off('contact-list:updated', getContactData);
});
</script>

<template>
  <div :class="$style.contact">
    <div :class="$style.header">
      <ui3n-button
        v-if="!isUserAddress"
        type="icon"
        color="transparent"
        icon="outline-delete"
        icon-size="18"
        icon-color="var(--warning-content-default)"
        :class="$style.delBtn"
        @click="delContact"
      />

      <div
        :class="$style.avatar"
        :style="contactAvatarStyle"
      >
        <span v-if="!contact?.avatarId">{{ contactLetters }}</span>

        <ui3n-tooltip
          v-if="!imageProcessing"
          :content="contact?.avatarId ? $tr('contact.avatar.delete') : $tr('contact.avatar.upload')"
          position-strategy="fixed"
          placement="top"
        >
          <ui3n-button
            type="icon"
            :icon="contact?.avatarId ? 'outline-delete' : 'outline-file-upload'"
            icon-size="24"
            :class="$style.avatarBtn"
            :disabled="imageProcessing"
            v-on="contact?.avatarId ? { click: deleteImage } : { click: uploadImage }"
          />
        </ui3n-tooltip>

        <div
          v-else
          :class="$style.progress"
        >
          <ui3n-progress-circular
            indeterminate
            size="32"
          />
        </div>
      </div>

      <div :class="$style.headerActions">
        <ui3n-tooltip
          v-if="!isUserAddress"
          :content="$tr('action.open.chat.tooltip')"
          position-strategy="fixed"
          placement="top"
        >
          <ui3n-button
            type="icon"
            icon="outline-chat"
            icon-size="16"
            icon-color="var(--color-icon-button-primary-default)"
            @click="openChat"
          />
        </ui3n-tooltip>

        <ui3n-tooltip
          v-if="!isUserAddress"
          :content="$tr('action.open.mail.tooltip')"
          position-strategy="fixed"
          placement="top"
        >
          <ui3n-button
            type="icon"
            icon="outline-mail"
            icon-size="16"
            icon-color="var(--color-icon-button-primary-default)"
            @click="openInbox"
          />
        </ui3n-tooltip>

        <ui3n-tooltip
          v-if="isUserAddress"
          :content="$tr('action.show.own.keys')"
          position-strategy="fixed"
          placement="top"
        >
          <ui3n-button
            type="icon"
            icon="round-key"
            icon-size="16"
            icon-color="var(--color-icon-button-primary-default)"
            @click="showOwnKeysInfo"
          />
        </ui3n-tooltip>

        <ui3n-tooltip
          v-if="!isUserAddress"
          :content="$tr('action.show.contact.keys')"
          position-strategy="fixed"
          placement="top"
        >
          <ui3n-button
            type="icon"
            icon="round-key"
            icon-size="16"
            icon-color="var(--color-icon-button-primary-default)"
            @click="showContactKeysInfo"
          />
        </ui3n-tooltip>
      </div>
    </div>

    <div
      ref="contentEl"
      :class="$style.content"
    >
      <contact-body
        v-if="contact"
        :contact="contact"
        :valid="contactValid"
        :rules="rules"
        :disabled="isUserAddress"
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
        :disabled="!contactValid || !whetherContactChanged"
        @click="saveContact(contact)"
      >
        {{ $tr('app.btn.save') }}
      </ui3n-button>
    </div>

    <div
      v-if="isLoading"
      :class="$style.loader"
    >
      <ui3n-progress-circular
        indeterminate
        size="80"
      />
    </div>
  </div>
</template>

<style lang="scss" module>
.contact {
  --contact-header-height: 184px;
  --contact-avatar-size: 128px;
  --contact-actions-height: 64px;

  position: relative;
  width: 100%;
  height: 100%;
  padding-top: var(--spacing-m);
}

.header {
  position: relative;
  width: 100%;
  height: var(--contact-header-height);
}

.delBtn {
  position: absolute;
  top: 0;
  right: var(--spacing-s);
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
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  margin: 0 auto var(--spacing-m) auto;
  color: var(--color-text-avatar-primary-default);
  -webkit-font-smoothing: antialiased;
  font-size: 50px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    .avatarBtn {
      display: flex;
    }
  }
}

.avatarBtn {
  display: none;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.progress {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
}

.headerActions {
  display: flex;
  justify-content: center;
  align-items: center;
  column-gap: var(--spacing-s);
  padding-bottom: var(--spacing-s);

  button {
    border-radius: var(--spacing-xs) !important;
  }
}

.content {
  position: relative;
  width: 100%;
  height: calc(100% - var(--contact-header-height) - var(--contact-actions-height));
  padding: 0 var(--spacing-s) 0 var(--spacing-m);
}

.actions {
  display: flex;
  height: var(--contact-actions-height);
  justify-content: flex-end;
  align-items: center;
  padding-right: var(--spacing-m);
  column-gap: var(--spacing-s);
}

.loader {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
