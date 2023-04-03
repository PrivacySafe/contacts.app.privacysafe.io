<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import { get, cloneDeep } from 'lodash'
  import PField from './p-field.vue'

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
    <p-field
      v-model:valid="isValid.mail"
      :autofocus="true"
      :text="contact.mail"
      :label="`${$tr('contact.content.mail')}*`"
      :rules="getRules('mail')"
      :disabled="props.disabled"
      class="contact-content__field"
      @input="onInput($event, 'mail')"
    />

    <p-field
      v-model:valid="isValid.name"
      :text="contact.name"
      :label="$tr('contact.content.name')"
      :rules="getRules('name')"
      :disabled="props.disabled"
      class="contact-content__field"
      @input="onInput($event, 'name')"
    />

    <p-field
      v-model:valid="isValid.phone"
      :text="contact.phone"
      :label="$tr('contact.content.phone')"
      :rules="getRules('phone')"
      :disabled="props.disabled"
      class="contact-content__field"
      @input="onInput($event, 'phone')"
    />

    <p-field
      v-model:valid="isValid.notice"
      :text="contact.notice"
      type="textarea"
      :label="$tr('contact.content.notice')"
      :rules="getRules('notice')"
      :disabled="props.disabled"
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
