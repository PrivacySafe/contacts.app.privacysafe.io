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
import { computed, ref, watch } from 'vue';
import { get, cloneDeep } from 'lodash';
import type { ContactContent } from '@/types';
import { Ui3nInput, Ui3nText } from '@v1nt1248/3nclient-lib';

const emit = defineEmits(['input', 'update:contact', 'update:valid']);
const props = defineProps<{
  contact: ContactContent;
  rules?: Record<string, ((value: unknown) => boolean | string)[]>;
  valid: boolean;
  disabled?: boolean;
}>();

const innerContactValue = ref<ContactContent>({
  name: '',
  mail: '',
  phone: '',
  notice: '',
});
const isValid = ref({
  name: true,
  mail: true,
  phone: true,
  notice: true,
});
const innerValidValue = computed(() => {
  return Object.entries(isValid.value).every(([, isFieldValid]) => isFieldValid);
});

const onInput = (ev: string, field: 'name' | 'mail' | 'phone' | 'notice') => {
  innerContactValue.value[field] = ev;
  emit('input', innerContactValue.value);
  emit('update:contact', innerContactValue.value);
};

watch(
  () => props.contact,
  (val: ContactContent) => {
    innerContactValue.value = cloneDeep(val);
  },
  { deep: true, immediate: true },
);

watch(
  () => innerValidValue.value,
  val => emit('update:valid', val),
  { immediate: true },
);

const getRules = (field: string): ((value: unknown) => string | boolean)[] | [] => {
  return get(props.rules, field, []);
};
</script>

<template>
  <div :class="$style.contactContent">
    <ui3n-input
      :model-value="contact.mail"
      :autofocus="true"
      :label="`${$tr('contact.content.mail')}*`"
      :rules="getRules('mail')"
      :disabled="disabled"
      :class="$style.field"
      @update:valid="(value: boolean) => isValid.mail = value"
      @input="onInput($event, 'mail')"
    />

    <ui3n-input
      :model-value="contact.name!"
      :label="$tr('contact.content.name')"
      :rules="getRules('name')"
      :disabled="disabled"
      :class="$style.field"
      @update:valid="(value: boolean) => isValid.name = value"
      @input="onInput($event, 'name')"
    />

    <ui3n-input
      :model-value="contact.phone!"
      :label="$tr('contact.content.phone')"
      :rules="getRules('phone')"
      :disabled="disabled"
      :class="$style.field"
      @update:valid="(value: boolean) => isValid.phone = value"
      @input="onInput($event, 'phone')"
    />

    <ui3n-text
      :text="contact.notice!"
      :label="$tr('contact.content.notice')"
      :rows="6"
      :max-rows="6"
      :rules="getRules('notice')"
      :disabled="disabled"
      @update:valid="(value: boolean) => isValid.notice = value"
      @input="onInput($event, 'notice')"
    />
  </div>
</template>

<style lang="scss" module>
.contactContent {
  position: relative;
  width: 100%;
}

.field {
  margin-bottom: calc(var(--spacing-s) * 1.5);
}
</style>
