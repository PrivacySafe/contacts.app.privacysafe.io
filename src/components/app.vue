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
  import { computed, onBeforeMount, onBeforeUnmount, ref } from 'vue'
  import { makeServiceCaller } from '@/libs/ipc/ipc-service-caller'
  import { AppVersion } from '@/constants'
  import prLogo from '@/assets/images/privacysafe-logo.png'
  import { useAppStore } from '@/store/app.store'
  import { useContactsStore } from '@/store/contacts.store'
  import { getAppConfig } from '@/helpers/forRpc'
  import { Ui3nMenu } from '@v1nt1248/3nclient-lib'
  import ContactIcon from '@/components/contact-icon.vue'

  const appStore = useAppStore()
  const contactsStore = useContactsStore()
  const user = computed<string>(() => appStore.user)
  const connectivityStatus = computed(() => appStore.connectivityStatus === 'online'
    ? 'app.status.connected.online'
    : 'app.status.connected.offline'
  )
  const connectivityTimerId = ref<NodeJS.Timer>()

  const appExit = async () => await w3n.closeSelf!()

  const getConnectivityStatus = async () => {
    const status = await w3n.connectivity?.isOnline()
    if (status) {
      appStore.setConnectivityStatus(status)
    }
  }

  onBeforeMount(async () => {
    const user = await w3n.mailerid?.getUserId()
    appStore.setUser(user!)

    await contactsStore.getContactList()

    await getAppConfig()

    await getConnectivityStatus()
    connectivityTimerId.value = setInterval(getConnectivityStatus, 60000)

    const configSrvConnection = await w3n.rpc!.otherAppsRPC!('launcher.app.privacysafe.io', 'AppConfigs')
    const configSrv = makeServiceCaller<AppConfigs>(configSrvConnection, [], ['watchConfig']) as AppConfigs
    configSrv.watchConfig({
      next: ({ lang, currentTheme, colors }) => {
        appStore.setLang(lang)
        appStore.setColorTheme({ theme: currentTheme, colors })
      },
      error: e => console.error(e),
      complete: () => configSrvConnection.close(),
    })

    const contactsSrvConnection = await w3n.rpc!.thisApp!('AppContactsInternal')
    const contactsSrv = makeServiceCaller(contactsSrvConnection, [], ['watchContactList']) as AppContactsService
    contactsSrv.watchContactList({
      next: () => contactsStore.getContactList(),
      error: e => console.error(e),
      complete: () => contactsSrvConnection.close(),
    })
  })

  onBeforeUnmount(() => {
    clearInterval(connectivityTimerId.value)
  })
</script>

<template>
  <div class="app">
    <div class="app__toolbar">
      <div class="app__toolbar-title">
        <img
          :src="prLogo"
          alt="logo"
          class="app__toolbar-logo"
        >
        <div class="app__toolbar-delimiter">
          /
        </div>
        <div class="app__toolbar-app">
          {{ $tr('app.title') }}
          <div class="app__toolbar-app-version">
            v {{ AppVersion }}
          </div>
        </div>
      </div>

      <div class="app__toolbar-user">
        <div class="app__toolbar-user-info">
          <span class="app__toolbar-user-mail">
            {{ user }}
          </span>
          <span
            class="app__toolbar-user-connection"
          >
            {{ $tr('app.status') }}:
            <span :class="{'app__toolbar-user-connectivity': connectivityStatus === 'app.status.connected.online'}">
              {{ $tr(connectivityStatus) }}
            </span>
          </span>
        </div>

        <ui3n-menu
          :offset-x="-40"
          :offset-y="4"
        >
          <div class="app__toolbar-icon">
            <contact-icon
              :name="user"
              :size="36"
              :readonly="true"
            />
          </div>

          <template #menu>
            <div class="app__toolbar-menu">
              <div
                class="app__toolbar-menu-item"
                @click="appExit"
              >
                {{ $tr('app.exit') }}
              </div>
            </div>
          </template>
        </ui3n-menu>
      </div>
    </div>
    <div class="app__content">
      <router-view v-slot="{ Component }">
        <transition>
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .app {
    --main-toolbar-height: calc(var(--base-size) * 9);

    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;

    &__toolbar {
      position: relative;
      width: 100%;
      height: var(--main-toolbar-height);
      padding: 0 calc(var(--base-size) * 2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--gray-50, #f2f2f2);

      &-title {
        display: flex;
        justify-content: flex-start;
        align-items: center;
      }

      &-logo {
        position: relative;
        top: -2px;
        margin-right: calc(var(--base-size) * 2);
      }

      &-delimiter {
        font-size: 20px;
        font-weight: 500;
        color: var(--blue-main, #0090ec);
        margin-right: calc(var(--base-size) * 2);
      }

      &-app {
        position: relative;
        font-size: var(--font-18);
        font-weight: 500;
        color: var(--black-90, #212121);

        &-version {
          position: absolute;
          font-size: var(--font-11);
          font-weight: 600;
          color: var(--black-30);
          line-height: var(--font-16);
          left: 0;
          width: 100%;
          bottom: -10px;
          text-align: center;
        }
      }

      &-user {
        display: flex;
        justify-content: flex-end;
        align-items: center;

        &-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-end;
          margin-right: calc(var(--base-size) * 2);

          span:not(.app__toolbar-user-connectivity) {
            color: var(--black-90, #212121);
            line-height: 1.4;
          }
        }

        &-mail {
          font-size: var(--font-14);
          font-weight: 600;
        }

        &-connection {
          font-size: var(--font-12);
          font-weight: 500;
        }

        &-connectivity {
          color: var(--green-grass-100, #33c653);
        }
      }

      &-icon {
        position: relative;
        cursor: pointer;
      }

      &-menu {
        position: relative;
        background-color: var(--system-white, #fff);
        width: 80px;

        &-item {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          position: relative;
          width: 100%;
          height: calc(var(--base-size) * 3);
          cursor: pointer;
          font-size: var(--font-12);
          font-weight: 400;
          padding: 0 var(--base-size);

          &:hover {
            background-color: var(--gray-50, #f2f2f2);
          }
        }
      }
    }

    &__content {
      position: fixed;
      left: 0;
      right: 0;
      top: calc(var(--main-toolbar-height) + 1px);
      bottom: 0;
    }
  }
</style>
