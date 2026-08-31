<!--
 Copyright (C) 2026 3NSoft Inc.
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

<script lang="ts" setup>
  import { onMounted, ref, inject } from 'vue';
  import { Ui3nDialog, Ui3nButton, Ui3nTooltip, type Ui3nDialogComponentProps } from '@v1nt1248/3nclient-lib';
  import { NOTIFICATIONS_KEY, NotificationsPlugin } from '@v1nt1248/3nclient-lib/plugins';
  import { useContact } from '@main/common/composables/useContact';
  import { buildAddContactUrl } from '@main/common/utils/contact-presentation';
  import type { Person } from '@main/types';
  import { useI18n } from 'vue-i18n';
  import QRCode from 'qrcode';

  const { user } = useContact();
  const { t } = useI18n();
  const notification = inject<NotificationsPlugin>(NOTIFICATIONS_KEY)!;

  const props = defineProps<{
    dialogProps?: Ui3nDialogComponentProps<boolean>;
    contactData: Person | null | undefined;
  }>();

  const qrCodeImageUrl = ref<string>();
  const contactURL = ref<string>();

  async function generateQRcode() {
    contactURL.value = buildAddContactUrl({
      mail: props.contactData?.mail,
      name: props.contactData?.name,
      isOwnAddress: props.contactData?.mail === user.value,
    });
    qrCodeImageUrl.value = await QRCode.toDataURL(contactURL.value);
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(contactURL.value!);

      notification.$createNotice({
        type: 'success',
        content: t('qrcode.copy-link-text'),
      });
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  async function downloadQRcode() {
    const [prefix, base64Data] = qrCodeImageUrl.value!.split(',');
    // @ts-ignore
    const qrImageU8array = Uint8Array.fromBase64(base64Data);

    const mimeMatch = prefix.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : null;

    if (mimeType !== 'image/png') {
      notification.$createNotice({
        type: 'error',
        content: t('qrcode.save-invalid'),
      });
      return null;
    }

    // @ts-ignore
    const targetFile = await w3n.shell?.fileDialogs?.saveFileDialog(
      t('qrcode.save-dialog-title'),
      t('qrcode.save-dialog-button'),
      `QR-Code-${props.contactData?.mail}.png`,
    );

    if (targetFile) {
      await targetFile!.writeBytes(qrImageU8array);
      notification.$createNotice({
        type: 'success',
        content: t('qrcode.save-success'),
      });
      return true;
    } else {
      return null;
    }
  }

  onMounted(() => {
    generateQRcode();
  });
</script>

<template>
  <ui3n-dialog v-bind="dialogProps">
    <template #body>
      <div :class="$style.overallContent">
        <img
          :src="qrCodeImageUrl"
          alt="qr code"
        />

        <div :class="$style.contactMail">
          {{ contactData?.mail }}
        </div>

        <div :class="$style.saveQrbutton">
          <ui3n-tooltip
            :content="`${t('qrcode.save-qr-tooltip')}`"
            position-strategy="fixed"
            placement="top"
          >
            <ui3n-button
              type="icon"
              icon="outline-download-for-offline"
              icon-size="25"
              color="var(--color-bg-button-secondary-default)"
              @click="downloadQRcode"
            />
          </ui3n-tooltip>
        </div>

        <div :class="$style.contactLink">
          <div>
            <ui3n-tooltip
              :content="`${t('qrcode.copy-link-tooltip')}`"
              position-strategy="fixed"
              placement="top"
            >
              <ui3n-button
                type="icon"
                icon="round-content-copy"
                icon-size="16"
                color="var(--color-bg-button-secondary-default)"
                @click="copyLink"
              />
            </ui3n-tooltip>
          </div>
          <div :class="$style.contactLinkText">
            {{ contactURL }}
          </div>
        </div>
      </div>
    </template>
  </ui3n-dialog>
</template>

<style lang="scss" module>
  .overallContent {
    position: relative;
    padding: var(--spacing-m);
    color: var(--color-text-control-primary-default);
    text-align: center;
  }

  .contactLink {
    display: flex;
    flex-direction: row;
    justify-content: center;
    text-align: left;
    align-items: center;
    border-radius: 8px;
    border: 1px solid #fff;
    margin-top: var(--spacing-m);
    padding: var(--spacing-s);
    font-size: var(--font-12);

    .contactLinkText {
      margin-left: var(--spacing-s);
    }

    .copyStatus {
      font-weight: bold;
      text-align: center;
    }
  }

  .contactMail {
    text-align: center;
  }

  .saveQrbutton {
    display: flex;
    justify-content: center;
  }
</style>
