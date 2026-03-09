<!--
 Copyright (C) 2026 3NSoft Inc.

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
<script setup lang="ts">
import { computed, onBeforeMount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Ui3nIcon } from '@v1nt1248/3nclient-lib';
import { useAppStore } from '@main/common/store/app.store.ts';
import type { ContactListItem } from '@main/types';
import { appContactsSrvProxy } from '@main/common/services/services-provider';
import ContactIcon from '@main/common/components/contact-icon.vue';

const props = withDefaults(defineProps<{
  item: ContactListItem;
  selectedContactIds?: string[];
  isMobileFormFactor?: boolean;
}>(), {
  selectedContactIds: () => [],
});
const emits = defineEmits<{
  (event: 'select'): void;
}>();

const router = useRouter();
const { user } = storeToRefs(useAppStore());

const isLoading = ref(false);
const img = ref('');
const imgGettingAttemptsNumber = ref(0);
let imgTOut: ReturnType<typeof setTimeout> | null = null;

const iconStyle = computed(() => {
  if (!img.value) {
    return {};
  }

  return { backgroundImage: `url(${img.value})` };
});

async function getAvatar() {
  if (imgGettingAttemptsNumber.value >= 3) {
    if (imgTOut) {
      clearTimeout(imgTOut);
      imgTOut = null;
      imgGettingAttemptsNumber.value = 0;
    }
    return;
  }

  try {
    isLoading.value = true;
    imgGettingAttemptsNumber.value += 1;
    const imgData = await appContactsSrvProxy.getImage(`${props.item.avatarId}-mini`);
    if (imgData === '[error]') {
      imgTOut = setTimeout(() => {
        getAvatar();
      }, 30000);
    } else {
      img.value = imgData;
    }
  } finally {
    isLoading.value = false;
  }
}

async function openContact() {
  await router.push({ name: 'contact', params: { id: props.item.id } });
}

function selectContact(ev: MouseEvent) {
  ev.stopPropagation();
  ev.preventDefault();
  emits('select');
}

onBeforeMount(async () => {
  if (props.item.avatarId) {
    await getAvatar();
  }
});

watch(
  () => props.item.avatarId,
  async (val, oVal) => {
    if (val && val !== oVal) {
      await getAvatar();
    }

    if (!val && val !== oVal) {
      img.value = '';
    }
  },
);
</script>

<template>
  <div
    :class="[
      $style.contactListItem,
      isMobileFormFactor && $style.contactListItemMobile,
      !isMobileFormFactor && selectedContactIds.includes(item.id) && $style.selected,
    ]"
    @click="openContact"
  >
    <div
      :class="[
        $style.icon,
        isMobileFormFactor && selectedContactIds.includes(item.id) && $style.iconSelected,
      ]"
      :style="iconStyle"
      v-on="isMobileFormFactor ? { click: selectContact } : {}"
    >
      <contact-icon
        v-if="!img"
        :name="item.displayName"
        :size="32"
        :selected="isMobileFormFactor && selectedContactIds.includes(item.id)"
        :readonly="isMobileFormFactor ? item.mail === user : true"
      />

      <div
        v-if="isMobileFormFactor && img && selectedContactIds.includes(item.id)"
        :class="$style.iconSelectedIcon"
      >
        <div :class="$style.contactIconIcon">
          <ui3n-icon
            icon="round-check"
            :width="32 / 3 - 2"
            :height="32 / 3 - 2"
            color="#fff"
          />
        </div>
      </div>

      <div
        v-if="isLoading"
        :class="$style.loader"
      >
        <ui3n-icon
          icon="spinner"
          size="24"
          color="var(--color-icon-control-accent-default)"
        />
      </div>
    </div>

    <div :class="$style.name">
      <span>{{ item.displayName }}</span>
      <i>{{ item.mail }}</i>
    </div>
  </div>
</template>

<style lang="scss" module>
@use '@main/common/assets/styles/_mixins' as mixins;

.contactListItem {
  --contact-list-item-height: 48px;
  --contact-list-item-icon-size: 32px;

  position: relative;
  width: 100%;
  height: var(--contact-list-item-height);
  display: flex;
  justify-content: flex-start;
  align-items: center;
  column-gap: var(--spacing-s);
  padding: 0 var(--spacing-m) 0 var(--spacing-l);
  font-size: var(--font-14);
  font-weight: 500;
  color: var(--color-text-control-primary-default);
  cursor: pointer;

  &.contactListItemMobile {
    padding-left: var(--spacing-m);
  }

  &:hover {
    background-color: var(--color-bg-control-primary-hover);
  }

  &.selected {
    background-color: var(--color-bg-control-primary-hover);
  }

  .icon {
    position: relative;
    width: var(--contact-list-item-icon-size);
    min-width: var(--contact-list-item-icon-size);
    height: var(--contact-list-item-icon-size);
    border-radius: 50%;
    border: 1px solid var(--color-border-block-primary-default);
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;

    &.iconSelected {
      &::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: transparent;
        box-sizing: border-box;
        border-radius: 50%;
        border: 4px solid var(--default-fill-default);
      }

      &::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: transparent;
        box-sizing: border-box;
        border-radius: 50%;
        border: 2px solid var(--color-border-control-accent-default);
      }
    }

    .iconSelectedIcon {
      position: absolute;
      width: var(--contact-list-item-icon-size);
      min-width: var(--contact-list-item-icon-size);
      height: var(--contact-list-item-icon-size);
      border-radius: 50%;
      border: 1px solid var(--color-border-block-primary-default);

      &::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: transparent;
        box-sizing: border-box;
        border-radius: 50%;
        border: 4px solid var(--default-fill-default);
      }

      &::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: transparent;
        box-sizing: border-box;
        border-radius: 50%;
        border: 2px solid var(--color-border-control-accent-default);
      }

      .contactIconIcon {
        position: absolute;
        width: calc(100% / 3);
        height: calc(100% / 3);
        border-radius: 50%;
        background-color: var(--color-border-control-accent-default);
        bottom: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1;
      }
    }

    .loader {
      position: absolute;
      inset: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: transparent;
    }
  }

  .name {
    display: inline-block;
    width: calc(100% - var(--spacing-xl));
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    span {
      display: block;
      line-height: 1;
      margin-bottom: var(--spacing-xs);
      @include mixins.text-overflow-ellipsis(calc(100% - var(--spacing-xl)));
    }

    i {
      display: block;
      font-size: var(--font-12);
      line-height: 1;
      color: var(--color-text-block-secondary-default);
    }
  }
}
</style>
