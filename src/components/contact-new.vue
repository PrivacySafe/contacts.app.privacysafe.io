<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAppStore } from '@/store/app.store'
  import { useContactsStore } from '@/store/contacts.store'
  import { mailReg } from '@/constants/contacts'
  import { getElementColor } from '@/data/helpers/forUi'
  import { Icon } from '@iconify/vue'
  import ContactContent from "@/components/contact-content.vue";

  const router = useRouter()
  const appStore = useAppStore()
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

  const checkRequired = (mail?: string): boolean|string => !!mail || 'This field is required'
  const checkEmail = (mail?: string): boolean|string => mailReg.test(mail!) || 'Not valid mail'
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
          appStore.snackbarOptions.content = 'The contact was saved.'
          appStore.snackbarOptions.type = 'success'
          appStore.snackbarOptions.show = true
          cancel()
        })
        .catch(() => {
          appStore.snackbarOptions.content = 'Save contact error. Contact Support.'
          appStore.snackbarOptions.type = 'error'
          appStore.snackbarOptions.show = true
        })
    }
  }
</script>

<template>
  <div class="contact-new">
    <var-button
      text
      round
      class="contact-new__cancel-btn"
      @click="cancel"
    >
      <icon
        icon="baseline-close"
        :width="18"
        :height="18"
        color="var(--grey-highest, rgba(0, 0, 0, 0.87))"
      />
    </var-button>

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

        <icon
          v-else
          icon="round-person"
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
      <var-button
        text
        type="primary"
        @click="cancel"
      >
        {{ $tr('app.btn.cancel') }}
      </var-button>

      <var-button
        type="primary"
        :disabled="!valid"
        @click="saveContact"
      >
        {{ $tr('app.btn.save') }}
      </var-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .contact-new {
    position: relative;
    width: 100%;
    height: 100%;
    padding: calc(var(--base-size) * 2);

    &__cancel-btn {
      position: absolute;
      top: var(--base-size);
      right: var(--base-size);
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

      button {
        width: calc(var(--base-size) * 10);
        margin-left: var(--base-size);
      }
    }

    &__avatar {
      position: relative;
      width: 100%;
      height: calc(var(--base-size) * 16);
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
    }
  }
</style>
