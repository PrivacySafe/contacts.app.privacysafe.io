<script lang="ts" setup>
  import { debounce, omit } from 'lodash'
  import { computed, defineAsyncComponent, inject, onBeforeMount, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import {
    mailReg,
    getElementColor,
    I18N_KEY,
    I18nPlugin,
    NOTIFICATIONS_KEY,
    NotificationsPlugin,
    DIALOGS_KEY,
    DialogsPlugin,
    Ui3nButton,
  } from '@v1nt1248/3nclient-lib'
  import { nonEditableContacts } from '@/constants/contacts'
  import { useContactsStore } from '@/store/contacts.store'
  import ContactContent from './contact-content.vue'

  const { $tr } = inject<I18nPlugin>(I18N_KEY)!
  const notification = inject<NotificationsPlugin>(NOTIFICATIONS_KEY)!
  const dialog = inject<DialogsPlugin>(DIALOGS_KEY)

  const route = useRoute()
  const router = useRouter()
  const contactsStore = useContactsStore()

  const contactId = computed<string>(() => route.params.id as string)
  const contactDisplayName = computed<string>(() => data.value.name || data.value.mail || ' ')
  const contactLetters = computed<string>(() => (contactDisplayName.value.length > 1
    ? `${contactDisplayName.value[0].toLocaleUpperCase()}${contactDisplayName.value[1].toLocaleLowerCase()}`
    : contactDisplayName.value[0].toLocaleUpperCase()
  ))
  const contactAvatarStyle = computed<Record<string, string>>(() => ({
    backgroundColor: getElementColor(contactLetters.value)
  }))

  const contentEl = ref<HTMLDivElement|null>(null)
  const data = ref<ContactContent>({
    name: '',
    mail: '',
    notice: '',
    phone: '',
  })
  const contactValid = ref(true)

  const prepareContactFields = async () => {
    if (contactId.value === 'new') {
      data.value = {
        name: '',
        mail: '',
        notice: '',
        phone: '',
      }
    } else if (contactId.value) {
      const contact = await contactsStore.getContact(contactId.value)
      if (contact) {
        data.value = {
          name: '',
          notice: '',
          phone: '',
          ...(omit(contact, ['id', 'avatar', 'avatarMini', 'activities'])),
        }
      }
    }
  }

  onBeforeMount(async () => {
    await prepareContactFields()
  })

  watch(
    () => contactId.value,
    async () => {
      await prepareContactFields()
      if (contentEl.value) {
        contentEl.value!.scrollTop = 0
      }
    },
  )

  const checkRequired = (mail?: string): boolean|string => !!mail || $tr('This field is required')
  const checkEmail = (mail?: string): boolean|string => mailReg.test(mail!) || $tr('validation.text.mail')
  const rules = { mail: [checkRequired, checkEmail] }

  const cancel = () => router.push('/contacts')

  const deleteContact = async () => {
    const confirmationDialogComponent = defineAsyncComponent(() => import('./confirmation-dialog.vue'))
    dialog?.$openDialog({
      component: confirmationDialogComponent,
      componentProps: {
        dialogText: $tr('confirmation.delete.text', { name: `<b>${contactDisplayName.value}</b>` })
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
              })
            })
            .catch(() => {
              notification.$createNotice({
                type: 'error',
                content: $tr('contact.delete.error.text'),
              })
            })
            .finally(() => {
              cancel()
            })
        },
        onCancel: () => cancel(),
      },
    })
  }

  const onInput = (value: ContactContent) => {
    if (contactValid.value) {
      const savedData = {
        id: contactId.value,
        ...value,
      }
      contactsStore.upsertContact(savedData)
        .then(() => {
          notification.$createNotice({
            type: 'success',
            content: $tr('contact.upsert.success.text')
          })
        })
        .catch(() => {
          notification.$createNotice({
            type: 'error',
            content: $tr('contact.upsert.error.text')
          })
        })
    }
  }
  const debouncedOnInput = debounce(onInput, 500)
</script>

<template>
  <div class="contact">
    <div class="contact__header">
      <ui3n-button
        v-if="!nonEditableContacts.includes(contactId)"
        round
        color="var(--system-white, #fff)"
        icon="delete"
        icon-size="18"
        icon-color="var(--pear-100, #f75d53)"
        class="contact__header-btn"
        @click="deleteContact"
      />
      <div
        class="contact__avatar"
        :style="contactAvatarStyle"
      >
        {{ contactLetters }}
      </div>
      <div class="contact__header-actions">
        <ui3n-button
          color="var(--blue-main, #0090ec)"
          icon="chat"
          icon-size="16"
          :disabled="true"
          class="contact__header-actions-btn--offset"
        />

        <ui3n-button
          color="var(--blue-main, #0090ec)"
          icon="mail"
          icon-size="16"
          :disabled="true"
          class="contact__header-actions-btn--offset"
        />
      </div>
    </div>

    <div
      ref="contentEl"
      class="contact__content"
    >
      <contact-content
        v-model:contact="data"
        v-model:valid="contactValid"
        :rules="rules"
        :disabled="nonEditableContacts.includes(contactId)"
        @input="debouncedOnInput"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .contact {
    --contact-width: calc(var(--column-size) * 4);
    --contact-header-height: calc(var(--base-size) * 22);
    --contact-avatar-size: calc(var(--base-size) * 16);
    --contact-padding: calc(var(--base-size) * 2);

    position: relative;
    width: var(--contact-size);
    height: 100%;
    padding: var(--contact-padding) 0 var(--contact-padding) var(--contact-padding);

    &__header {
      position: relative;
      width: 100%;
      height: var(--contact-header-height);
      padding-right: var(--contact-padding);

      &-btn {
        position: absolute;
        top: 0;
        right: var(--base-size, 8px);
      }

      &-actions {
        display: flex;
        justify-content: center;
        align-items: center;

        .ui3n-button {
          margin: 0 var(--half-size, 4px);
        }
      }
    }

    &__avatar {
      position: relative;
      width: var(--contact-avatar-size);
      height: var(--contact-avatar-size);
      border-radius: 50%;
      user-select: none;
      display: flex;
      justify-content: center;
      align-items: center;
      padding-right: var(--contact-padding);
      margin: 0 auto calc(var(--base-size) * 2) auto;
      color: var(--system-white, #fff);
      -webkit-font-smoothing: antialiased;
      font-size: 50px;
      font-weight: 500;
      text-shadow: 0 2px 5px var(--gray-90, #444);
    }

    &__content {
      position: relative;
      width: 100%;
      height: calc(100% - var(--contact-header-height) - var(--base-size, 8px));
      padding-right: var(--contact-padding);
      overflow-x: hidden;
      overflow-y: auto;
      margin-top: var(--base-size);

      &-field {
        margin-bottom: calc(var(--base-size) * 1.5);
      }
    }
  }
</style>
