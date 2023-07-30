<script lang="ts" setup>
  import { debounce, omit } from 'lodash'
  import { computed, inject, onBeforeMount, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { Snackbar } from '@varlet/ui'
  import { mailReg, nonEditableContacts } from '@/constants/contacts'
  import { useAppStore } from '@/store/app.store'
  import { useContactsStore } from '@/store/contacts.store'
  import { getElementColor } from '@/data/helpers/forUi'
  import { Icon } from '@iconify/vue'
  import ConfirmationDialog from './confirmation-dialog.vue'
  import ContactContent from './contact-content.vue'

  const { $tr } = inject<I18nPlugin>('i18n')!

  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()
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

  const isDialogOpen = ref(false)
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
    Snackbar.allowMultiple(true)
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

  const delContact = async () => {
    isDialogOpen.value = false
    contactsStore.deleteContact(contactId.value)
      .then(() => {
        appStore.snackbarOptions.content = 'The Contact was deleted.'
        appStore.snackbarOptions.type = 'success'
        appStore.snackbarOptions.show = true
      })
      .catch(() => {
        appStore.snackbarOptions.content = 'Delete contact error. Contact Support.'
        appStore.snackbarOptions.type = 'error'
        appStore.snackbarOptions.show = true
      })
      .finally(() => {
        cancel()
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
          appStore.snackbarOptions.content = 'The contact was saved.'
          appStore.snackbarOptions.type = 'success'
          appStore.snackbarOptions.show = true
        })
        .catch(() => {
          appStore.snackbarOptions.content = 'Save contact error. Contact Support.'
          appStore.snackbarOptions.type = 'error'
          appStore.snackbarOptions.show = true
        })
    }
  }
  const debouncedOnInput = debounce(onInput, 500)
</script>

<template>
  <div class="contact">
    <div class="contact__header">
      <var-button
        v-if="!nonEditableContacts.includes(contactId)"
        text
        round
        class="contact__header-btn"
        @click="isDialogOpen = true"
      >
        <icon
          icon="outline-delete"
          :width="18"
          :height="18"
          color="var(--pear-100, #f75d53)"
        />
      </var-button>
      <div
        class="contact__avatar"
        :style="contactAvatarStyle"
      >
        {{ contactLetters }}
      </div>
      <div class="contact__header-actions">
        <var-button
          class="contact__header-actions-btn--offset"
          type="primary"
          :disabled="true"
        >
          <icon
            icon="outline-chat"
            :width="16"
            :height="16"
          />
        </var-button>

        <var-button
          type="primary"
          :disabled="true"
        >
          <icon
            icon="outline-mail"
            :width="16"
            :height="16"
          />
        </var-button>
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

    <confirmation-dialog
      :show="isDialogOpen"
      :text="`<span>${$tr('confirmation.delete.text', { name: `<b>${contactDisplayName}</b>` })}</span>`"
      confirm-button-text="Delete"
      @cancel="isDialogOpen = false"
      @confirm="delContact"
    />
  </div>
</template>

<style lang="scss" scoped>
  .contact {
    --contact-width: calc(var(--column-size) * 4);
    --contact-header-height: calc(var(--base-size) * 22);
    --contact-avatar-size: calc(var(--base-size) * 16);
    --contact-content-padding: calc(var(--base-size) * 2);

    position: relative;
    width: var(--contact-size);
    height: 100%;
    padding: calc(var(--base-size) * 2);

    &__header {
      position: relative;
      width: 100%;
      height: var(--contact-header-height);

      &-btn {
        position: absolute;
        top: 0;
        right: 0;
      }

      &-actions {
        --button-normal-height: calc(var(--base-size) * 4);
        --button-primary-color: var(--blue-main, #0090ec);

        display: flex;
        justify-content: center;
        align-items: center;

        .var-button {
          width: calc(var(--base-size) * 6);
          margin: 0 calc(var(--base-size) / 2);
        }

        &-btn--offset {
          :deep(.var-button__content) {
            padding-top: 2px;
          }
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
      height: calc(100% - var(--contact-header-height));
      overflow-x: hidden;
      overflow-y: auto;
      margin-top: var(--base-size);

      &-field {
        margin-bottom: calc(var(--base-size) * 1.5);
      }
    }
  }
</style>
