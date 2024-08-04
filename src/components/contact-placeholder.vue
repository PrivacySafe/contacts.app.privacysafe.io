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

<script lang="ts" setup></script>

<template>
  <div class="contact-empty">
    <div class="contact-empty__image">
      <div class="circle circle-1" />
      <div class="circle circle-2" />
      <div class="circle circle-3" />
    </div>
    <div class="contact-empty__text">
      {{ $tr('contact.placeholder.text') }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .contact-empty {
    --circle-size-big: 132px;
    --circle-size-mid: 104px;
    --circle-size-small: 72px;

    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    &__image {
      position: relative;
      width: 220px;
      height: 220px;
      margin-bottom: calc(var(--base-size) * 3);
    }

    &__text {
      text-align: center;
      font-size: var(--font-14);
      font-weight: 300;
      font-style: italic;
      color: var(--black-90, #212121);
      user-select: none;
    }

    .circle {
      position: absolute;
      border-radius: 50%;

      &-1 {
        width: var(--circle-size-big);
        height: var(--circle-size-big);
        background-color: rgba(0, 144, 236, 0.16);
        left: 26%;
        top: 0;
      }

      &-2 {
        width: var(--circle-size-mid);
        height: var(--circle-size-mid);
        background-color: rgba(0, 144, 236, 0.54);
        left: 8%;
        bottom: 24px;
      }

      &-3 {
        width: var(--circle-size-small);
        height: var(--circle-size-small);
        background-color: rgba(0, 144, 236, 0.87);
        right: 25%;
        bottom: 0;
      }
    }
  }
</style>
