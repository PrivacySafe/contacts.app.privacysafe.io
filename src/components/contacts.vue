<script lang="ts" setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAppStore } from '@/store/app.store'
  import ContactsToolbar from './contacts-toolbar.vue'
  import ContactList from './contact-list.vue'

  const router = useRouter()
  const appStore = useAppStore()

  const searchText = ref<string>('')

  const addNewContact = () => {
    router.push('/contacts/new')
  }
  const onInput = (text: string) => {
    searchText.value = text
  }
</script>

<template>
  <div class="contacts">
    <div class="contacts__aside">
      <contacts-toolbar
        @add="addNewContact"
        @input="onInput"
      />
      <div class="contacts__aside-content">
        <contact-list
          :search-text="searchText"
        />
      </div>
    </div>

    <var-snackbar
      v-model:show="appStore.snackbarOptions.show"
      :type="appStore.snackbarOptions.type"
      :content="appStore.snackbarOptions.content"
      teleport="body"
      :duration="1500"
    />

    <div class="contacts__content">
      <router-view v-slot="{ Component }">
        <transition>
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .contacts {
    --contacts-aside-width: calc(var(--column-size) * 4);

    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: space-between;
    align-items: stretch;

    &__aside {
      position: relative;
      width: var(--contacts-aside-width);
      border-right: 1px solid var(--gray-50, #f2f2f2);

      &-content {
        position: relative;
        width: 100%;
        height: calc(100% - 112px);
        padding: calc(var(--base-size) / 2) 0;
        overflow-x: hidden;
        overflow-y: auto;
      }
    }

    &__content {
      position: relative;
      width: calc(100% - var(--contacts-aside-width));
      height: 100%;
    }
  }
</style>
