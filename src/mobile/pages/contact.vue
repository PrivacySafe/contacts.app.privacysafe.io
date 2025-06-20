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
<script lang="ts" setup>
import { Ui3nButton } from '@v1nt1248/3nclient-lib';
import { useContactPage } from '@main/mobile/composables/useContactPage';
import ContactBody from '@main/common/components/contact-content.vue';
import OwnKeysInfoDialog from '@main/common/dialogs/own-keys-info-dialog.vue';
import ContactKeysInfoDialog from '@main/common/dialogs/contact-keys-info-dialog.vue';

const {
  contact,
  contactDisplayName,
  isUserAddress,
  isEditMode,
  contactValid,
  contactLetters,
  contactAvatarStyle,
  rules,
  isOwnKeysInfoOpen,
  isContactKeysInfoOpen,
  goBack,
  openEditMode,
  openChat,
  openInbox,
  saveContact,
  onFieldUpdate,
  closeEditMode,
  delContact,
  closeKeysInfo,
} = useContactPage();
</script>

<template>
  <div :class="$style.contact">
    <div :class="$style.toolbar">
      <div :class="[$style.toolbarBlock, $style.offset]">
        <ui3n-button
          type="icon"
          color="var(--color-bg-block-primary-default)"
          icon="round-arrow-back"
          icon-color="var(--color-icon-block-primary-default)"
          icon-size="20"
          @click="goBack"
        />

        <ui3n-button
          v-if="!isUserAddress && !isEditMode"
          type="icon"
          color="var(--color-bg-block-primary-default)"
          icon="round-edit"
          icon-color="var(--color-icon-block-primary-default)"
          icon-size="20"
          @click="openEditMode"
        />

        <ui3n-button
          v-if="!isEditMode"
          type="icon"
          color="var(--color-bg-block-primary-default)"
          icon="outline-chat"
          icon-color="var(--color-icon-button-secondary-default)"
          icon-size="20"
          @click="openChat"
        />

        <ui3n-button
          v-if="!isEditMode"
          type="icon"
          color="var(--color-bg-block-primary-default)"
          icon="outline-mail"
          icon-color="var(--color-icon-button-secondary-default)"
          icon-size="20"
          @click="openInbox"
        />

        <ui3n-button
          v-if="isUserAddress"
          type="icon"
          color="var(--color-bg-block-primary-default)"
          icon="round-key"
          icon-size="20"
          icon-color="var(--color-icon-button-secondary-default)"
          @click="isOwnKeysInfoOpen = true"
        />

        <ui3n-button
          v-if="!isUserAddress"
          type="icon"
          color="var(--color-bg-block-primary-default)"
          icon="round-key"
          icon-size="20"
          icon-color="var(--color-icon-button-secondary-default)"
          @click="isContactKeysInfoOpen = true"
        />
      </div>

      <div :class="$style.toolbarBlock">
        <template v-if="isEditMode">
          <ui3n-button
            type="icon"
            color="var(--color-bg-block-primary-default)"
            icon="round-done"
            icon-color="var(--success-content-default)"
            :disabled="!contactValid"
            @click="saveContact"
          />

          <ui3n-button
            type="icon"
            color="var(--color-bg-block-primary-default)"
            icon="round-close"
            icon-color="var(--color-icon-block-primary-default)"
            @click="closeEditMode"
          />
        </template>

        <template v-else>
          <ui3n-button
            v-if="!isUserAddress"
            type="icon"
            color="var(--color-bg-block-primary-default)"
            icon="trash-can"
            icon-color="var(--warning-content-default)"
            @click="delContact"
          />
        </template>
      </div>
    </div>

    <div
      :class="$style.avatar"
      :style="contactAvatarStyle"
    >
      {{ contactLetters }}
    </div>

    <contact-body
      v-if="contact"
      :contact="contact"
      :valid="contactValid"
      :rules="rules"
      :class="!isEditMode && $style.readonly"
      @update:field="onFieldUpdate"
      @update:valid="contactValid = $event"
    />

    <div
      v-if="isOwnKeysInfoOpen || isContactKeysInfoOpen"
      :class="$style.keysInfo"
    >
      <div :class="$style.keysInfoToolbar">
        <ui3n-button
          :class="$style.closeBtn"
          type="icon"
          color="var(--color-bg-block-primary-default)"
          icon="round-arrow-back"
          icon-color="var(--color-icon-block-primary-default)"
          @click="closeKeysInfo"
        />

        <span v-if="isOwnKeysInfoOpen">{{ $tr('contact.dialog.title.own-keys') }}</span>
        <span v-if="isContactKeysInfoOpen">{{ $tr('contact.dialog.title.contact-keys', { contact: contactDisplayName })
        }}</span>
      </div>

      <div :class="$style.keysInfoBody">
        <own-keys-info-dialog v-if="isOwnKeysInfoOpen" />

        <contact-keys-info-dialog
          v-if="isContactKeysInfoOpen"
          :contact-addr="contact!.mail"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" module>
.contact {
  --contact-avatar-size: 160px;

  position: relative;
  width: 100%;
  height: 100%;
  padding: var(--spacing-m);
  overflow-x: hidden;
  overflow-y: auto;
  background-color: var(--color-bg-block-primary-default);
}

.toolbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--spacing-xxl);
  background-color: var(--color-bg-block-primary-default);
  border-bottom: 1px solid var(--color-border-block-primary-default);
  z-index: 5;
  padding: 0 var(--spacing-s);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbarBlock {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.offset {
  column-gap: var(--spacing-xs);
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

.readonly {
  pointer-events: none;
  cursor: default;
}

.keysInfo {
  position: fixed;
  inset: 0;
  z-index: 20;
  background-color: var(--color-bg-block-primary-default);
}

.keysInfoToolbar {
  display: flex;
  width: 100%;
  height: var(--spacing-xxl);
  padding: 0 var(--spacing-s) 0 var(--spacing-xxl);
  justify-content: flex-start;
  align-items: center;
  font-size: var(--font-14);
  font-weight: 600;
  border-bottom: 1px solid var(--color-border-block-primary-default);
}

.closeBtn {
  position: absolute !important;
  top: var(--spacing-s);
  left: var(--spacing-s);
}

.keysInfoBody {
  position: relative;
  width: 100%;
  height: calc(100% - var(--spacing-xxl) - var(--spacing-m));
  overflow-y: auto;

  & > div {
    max-height: 100% !important;
  }
}
</style>
