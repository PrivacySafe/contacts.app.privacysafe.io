<script lang="ts" setup>
import { Ui3nButton } from '@v1nt1248/3nclient-lib';
import ContactIcon from '@main/common/components/contact-icon.vue';

defineProps<{
  user: string;
  connectivityStatusText: string;
}>();

async function appExit() {
  w3n.closeSelf!();
}
</script>

<template>
  <div :class="$style.appMenu">
    <div :class="$style.appMenuHeader">
      <contact-icon
        :size="32"
        :name="user"
        readonly
      />

      <div :class="$style.info">
        <div :class="$style.user">
          {{ user }}
        </div>

        <div :class="$style.status">
          {{ $tr('app.status') }}: {{ $tr(connectivityStatusText) }}
        </div>
      </div>
    </div>

    <div :class="$style.appMenuBody">
      <ui3n-button
        :class="$style.logout"
        @click="appExit"
      >
        {{ $tr('app.exit') }}
      </ui3n-button>
    </div>
  </div>
</template>

<style lang="scss" module>
@use '@main/common/assets/styles/_mixins' as mixins;

.appMenu {
  --app-menu-header-heigh: 48px;

  position: relative;
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-block-primary-default);
}

.appMenuHeader {
  display: flex;
  width: 100%;
  height: var(--app-menu-header-heigh);
  padding-left: var(--spacing-s);
  justify-content: flex-start;
  align-items: center;
  column-gap: var(--spacing-s);
}

.info {
  position: relative;
  width: calc(100% - 44px);
  color: var(--color-text-control-primary-default);
}

.user {
  font-size: var(--font-14);
  font-weight: 700;
  line-height: var(--font-16);
  @include mixins.text-overflow-ellipsis();
}

.status {
  font-size: var(--font-12);
  font-weight: 600;
  line-height: var(--font-14);
}

.appMenuBody {
  position: relative;
  width: 100%;
  height: calc(100% - var(--app-menu-header-heigh));
  overflow: hidden;
  padding: var(--spacing-m) 0 64px;
}

.logout {
  position: absolute;
  left: var(--spacing-m);
  width: calc(100% - var(--spacing-l));
  bottom: var(--spacing-m);
}
</style>
