<!--
 Copyright (C) 2020 - 2025 3NSoft Inc.

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
import { Ui3nButton, Ui3nTooltip } from '@v1nt1248/3nclient-lib';
import { useContactPage } from '@main/desktop/composables/useContactPage';
import ContactBody from '@main/common/components/contact-content.vue';

const {
  isUserAddress,
  contact,
  contactAvatarStyle,
  contactLetters,
  contactValid,
  rules,
  onFieldUpdateDebounced,
  delContact,
  openChat,
  openInbox,
  showContactKeysInfo,
  showOwnKeysInfo,
} = useContactPage();
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
        :class="$style.headerBtn"
        @click="delContact"
      />

      <div
        :class="$style.avatar"
        :style="contactAvatarStyle"
      >
        {{ contactLetters }}
      </div>

      <div :class="$style.actions">
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
        @update:field="onFieldUpdateDebounced"
        @update:valid="contactValid = $event"
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
