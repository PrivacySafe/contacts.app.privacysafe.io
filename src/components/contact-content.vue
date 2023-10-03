<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import { get, cloneDeep } from 'lodash'
  import { Ui3nInput, Ui3nText } from '@v1nt1248/3nclient-lib'

  const emit = defineEmits(['input', 'update:contact', 'update:valid'])
  const props = defineProps<{
    contact: ContactContent;
    rules?: Record<string, ((value: string) => boolean|string)[]>;
    valid: boolean;
    disabled?: boolean;
  }>()
  const contact = ref<ContactContent>({
    name: '',
    mail: '',
    phone: '',
    notice: '',
  })
  const isValid = ref({
    name: true,
    mail: true,
    phone: true,
    notice: true,
  })
  const valid = computed(() => {
    return Object.entries(isValid.value).every(([, isFieldValid]) => isFieldValid)
  })

  const onInput = (ev: string, field: 'name'|'mail'|'phone'|'notice') => {
    contact.value[field] = ev
    emit('input', contact.value)
    emit('update:contact', contact.value)
  }

  watch(
    () => props.contact,
    (val: ContactContent) => {
      contact.value = cloneDeep(val)
    },
    { deep: true, immediate: true },
  )

  watch(
    () => valid.value,
    val => emit('update:valid', val),
    { immediate: true },
  )

  const getRules = (field: string): ((value: string) => boolean|string)[] | [] => {
    return get(props.rules, field, [])
  }
</script>

<template>
  <div
    :class="[
      'contact-content',
      { 'contact-content__disabled': props.disabled },
    ]"
  >
    <ui3n-input
      :value="contact.mail"
      :autofocus="true"
      :label="`${$tr('contact.content.mail')}*`"
      :rules="getRules('mail')"
      :disabled="props.disabled"
      class="contact-content__field"
      @update:valid="value => isValid.mail = value"
      @input="onInput($event, 'mail')"
    />

    <ui3n-input
      :value="contact.name!"
      :label="$tr('contact.content.name')"
      :rules="getRules('name')"
      :disabled="props.disabled"
      class="contact-content__field"
      @update:valid="value => isValid.name = value"
      @input="onInput($event, 'name')"
    />

    <ui3n-input
      :value="contact.phone!"
      :label="$tr('contact.content.phone')"
      :rules="getRules('phone')"
      :disabled="props.disabled"
      class="contact-content__field"
      @update:valid="value => isValid.phone = value"
      @input="onInput($event, 'phone')"
    />

    <ui3n-text
      :text="contact.notice!"
      :label="$tr('contact.content.notice')"
      :rows="6"
      :max-rows="6"
      :rules="getRules('notice')"
      :disabled="props.disabled"
      @update:valid="value => isValid.notice = value"
      @input="onInput($event, 'notice')"
    />
  </div>
</template>

<style lang="scss" scoped>
  .contact-content {
    position: relative;
    width: 100%;

    &__field {
      margin-bottom: calc(var(--base-size) * 1.5);
    }
  }
</style>
