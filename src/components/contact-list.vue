<script lang="ts" setup>
  import { get as lGet } from 'lodash'
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useContactsStore } from '@/store/contacts.store'
  import ContactIcon from '@/components/contact-icon.vue'

  const route = useRoute()
  const router = useRouter()
  const contactsStore = useContactsStore()

  const props = defineProps<{
    searchText?: string;
  }>()
  const selectedContactId = computed<string>(() => route.params.id as string)
  const text = computed<string>(() => (props.searchText || '').toLocaleLowerCase())

  const contactList = computed((): Array<PersonView & { displayName: string }> => {
    return Object.values(contactsStore.contactList)
      .map(p => ({
        ...p,
        displayName: lGet(p, 'name') || lGet(p, 'mail') || ' '
      }))
      .filter(c => c.displayName.toLocaleLowerCase().includes(text.value))
      .sort((a, b) => (a.displayName > b.displayName ? 1 : -1))
  })
  const contactListByLetters = computed(() => contactList.value
    .reduce((res, item) => {
      const letter = item.displayName[0].toLowerCase() as string
      if (!res[letter])
        res[letter] = []

      res[letter].push(item)
      return res
    }, {} as Record<string, Array<PersonView & { displayName: string }>>))

  const selectContact = (id: string) => {
    router.push(`/contacts/${id}`)
  }
</script>

<template>
  <var-index-bar
    class="contact-list"
    duration="200"
    hide-list
    css-mode
  >
    <div
      v-for="(letter, index) in Object.keys(contactListByLetters)"
      :key="letter"
      class="contact-list__sublist"
      :class="{'contact-list__sublist--last': index === Object.keys(contactListByLetters).length - 1}"
    >
      <var-index-anchor :index="letter">
        {{ letter }}
      </var-index-anchor>
      <div
        v-for="contact in contactListByLetters[letter]"
        :key="contact.id"
        :class="[
          'contact-list__item',
          { 'contact-list__item--selected': contact.id === selectedContactId }
        ]"
        @click="selectContact(contact.id)"
      >
        <contact-icon
          :name="contact.displayName"
          :size="32"
          :readonly="true"
        />
        <span class="contact-list__item-name">
          {{ contact.displayName }}
        </span>
      </div>
    </div>
  </var-index-bar>
</template>

<style lang="scss" scoped>
  .contact-list {
    &__sublist {
      padding: calc(var(--base-size) / 2) 0;
    }

    :deep(.var-sticky) {
      padding-left: 2px;
      width: calc(var(--base-size) * 5);
      text-align: center;
      margin-bottom: calc(var(--base-size) / 2);
    }

    :deep(.var-index-anchor) {
      font-size: 14px;
      font-weight: 600;
      color: var(--blue-main, #0090ec);
      text-transform: uppercase;
      line-height: 1;
    }

    &__item {
      position: relative;
      height: calc(var(--base-size) * 5.5);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 calc(var(--base-size) * 2) 0 calc(var(--base-size) * 4);
      font-size: var(--font-14);
      font-weight: 500;
      color: var(--black-90, #212121);
      cursor: pointer;

      &-name {
        display: inline-block;
        margin-left: var(--base-size);
        width: calc(100% - calc(var(--base-size) * 5));
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      &--selected,
      &:hover {
        background-color: var(--blue-main-30, #b0dafc);
      }
    }
  }
</style>
