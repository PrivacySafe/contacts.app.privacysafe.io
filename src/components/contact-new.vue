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
  import { computed, inject, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import {
    getElementColor,
    mailReg,
    I18N_KEY,
    I18nPlugin,
    NOTIFICATIONS_KEY,
    NotificationsPlugin,
    Ui3nButton,
    Ui3nIcon,
  } from '@v1nt1248/3nclient-lib'
  import { useContactsStore } from '@/store/contacts.store'
  import ContactContent from '@/components/contact-content.vue'

  const { $tr } = inject<I18nPlugin>(I18N_KEY)!
  const notification = inject<NotificationsPlugin>(NOTIFICATIONS_KEY)!

  const router = useRouter()
  const contactsStore = useContactsStore()

  const data = ref<ContactContent>({
    name: '',
    mail: '',
    notice: '',
    phone: '',
  })
  const valid = ref(false)

  const contactLetters = computed<string>(() => {
    const contactDisplayName = data.value.name || data.value.mail || ''
    if (contactDisplayName) {
      return contactDisplayName.length === 1
        ? contactDisplayName.toLocaleUpperCase()
        : `${contactDisplayName[0].toLocaleUpperCase()}${contactDisplayName[1].toLocaleLowerCase()}`
    }
    return ''
  })
  const contactLettersStyle = computed(() => {
    return {
      backgroundColor: contactLetters.value
        ? getElementColor(contactLetters.value)
        : 'var(--gray-50, #f2f2f2)'
    }
  })

  const checkRequired = (mail?: string): boolean|string => !!mail || $tr('validation.text.required')
  const checkEmail = (mail?: string): boolean|string => mailReg.test(mail!) || $tr('validation.text.mail')
  const rules = { mail: [checkRequired, checkEmail] }

  const cancel = () => {
    router.push('/contacts')
  }
  const saveContact = () => {
    if (valid.value) {
      const savedData = {
        id: 'new',
        ...data.value,
      }

      contactsStore.upsertContact(savedData)
        .then(() => {
          notification.$createNotice({
            type: 'success',
            content: $tr('contact.upsert.success.text'),
          })
          cancel()
        })
        .catch(() => {
          notification.$createNotice({
            type: 'error',
            content: $tr('contact.upsert.error.text'),
          })
        })
    }
  }
</script>

<template>
  <div class="contact-new">
    <ui3n-button
      round
      color="var(--system-white, #fff)"
      icon="close"
      icon-size="18"
      icon-color="var(--gray-90, #444)"
      class="contact-new__cancel-btn"
      @click="cancel"
    />

    <div class="contact-new__avatar">
      <div
        class="contact-new__avatar-wrapper"
        :style="contactLettersStyle"
      >
        <span
          v-if="contactLetters"
          class="contact-new__avatar-text"
        >
          {{ contactLetters }}
        </span>

        <ui3n-icon
          v-else
          icon="person"
          :width="96"
          :height="96"
          color="var(--system-white, #fff)"
        />
      </div>
    </div>

    <div class="contact-new__content">
      <contact-content
        v-model:contact="data"
        v-model:valid="valid"
        :rules="rules"
      />
    </div>

    <div class="contact-new__actions">
      <ui3n-button
        color="var(--system-white, #fff)"
        text-color="var(--blue-main, #0090ec)"
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

<style lang="scss" scoped>
  .contact-new {
    --contact-padding: calc(var(--base-size) * 2);

    position: relative;
    width: 100%;
    height: 100%;
    padding: var(--contact-padding) 0 var(--contact-padding) var(--contact-padding);

    &__cancel-btn {
      position: absolute;
      top: var(--base-size, 8px);
      right: var(--base-size, 8px);
      z-index: 1;
    }

    &__actions {
      --button-normal-height: calc(var(--base-size) * 4);
      --button-primary-color: var(--blue-main, #0090ec);
      --font-size-md: var(--font-12);

      position: absolute;
      left: calc(var(--base-size) * 2);
      right: calc(var(--base-size) * 2);
      bottom: calc(var(--base-size) * 2);
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding-right: var(--contact-padding);

      button {
        width: calc(var(--base-size) * 10);
        margin-left: var(--base-size);
      }
    }

    &__avatar {
      position: relative;
      width: 100%;
      height: calc(var(--base-size) * 16);
      padding-right: var(--contact-padding);
      margin-bottom: calc(var(--base-size) * 2);
      display: flex;
      justify-content: center;
      align-items: center;

      &-wrapper {
        position: relative;
        width: calc(var(--base-size) * 16);
        height: calc(var(--base-size) * 16);
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      &-text {
        -webkit-font-smoothing: antialiased;
        font-size: 48px;
        font-weight: 500;
        line-height: 1;
        color: var(--system-white, #fff);
        pointer-events: none;
        user-select: none;
        text-shadow: 2px 2px 5px var(--gray-90, #444);
      }
    }

    &__content {
      position: relative;
      width: 100%;
      height: calc(100% - var(--base-size) * 23);
      overflow-y: auto;
      padding-right: var(--contact-padding);
    }
  }
</style>
