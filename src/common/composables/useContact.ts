/*
Copyright (C) 2025 3NSoft Inc.

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
*/
import { computed, inject, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import cloneDeep from 'lodash/cloneDeep';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import {
  DIALOGS_KEY,
  DialogsPlugin,
  NOTIFICATIONS_KEY,
  NotificationsPlugin,
} from '@v1nt1248/3nclient-lib/plugins';
import {
  getElementColor,
  getFileExtension,
  mailReg,
  resizeImage,
  schedulerYield,
  sleep,
  transformWeb3nFileToFile,
} from '@v1nt1248/3nclient-lib/utils';
import type { Nullable } from '@v1nt1248/3nclient-lib';
import { appContactsSrvProxy } from '@main/common/services/services-provider';
import { useAppStore } from '@main/common/store/app.store';
import { useContactsStore } from '@main/common/store/contacts.store';
import { chatApp, EMPTY_CONTACT, inboxApp } from '@main/common/constants';
import type { ContactContent, OpenChatCmdArg, OpenInboxCmdArg, Person } from '@main/types';
import ConfirmationDialog from '@main/common/components/dialogs/confirmation-dialog.vue';
import OwnKeysInfoDialog from '@main/common/components/dialogs/own-keys-info-dialog.vue';
import ContactKeysInfoDialog from '@main/common/components/dialogs/contact-keys-info-dialog.vue';

export function useContact() {
  const route = useRoute();
  const router = useRouter();

  const { t } = useI18n();
  const notification = inject<NotificationsPlugin>(NOTIFICATIONS_KEY)!;
  const dialog = inject<DialogsPlugin>(DIALOGS_KEY)!;

  const { user } = storeToRefs(useAppStore());
  const contactsStore = useContactsStore();
  const {
    isMailAddressInUse,
    getContact,
    fetchContacts,
    deleteContact,
    upsertContact,
    upsertContactListItem,
  } = contactsStore;

  const contentEl = ref<HTMLDivElement | null>(null);
  const isLoading = ref(false);
  const contact = ref<Nullable<Person> | undefined>(null);
  const initialContact = ref<Nullable<Person> | undefined>(null);
  const contactValid = ref(contact.value?.id !== 'new');
  const imageProcessing = ref(false);

  const contactId = computed(() => route.params.id as string);
  const isUserAddress = computed(() => contact.value?.id === user.value || contact.value?.mail === user.value);
  const contactDisplayName = computed(() => isUserAddress.value ? 'Me' : contact.value?.name || contact.value?.mail || ' ');
  const contactLetters = computed(() => (
    contactDisplayName.value.length > 1 ?
      `${contactDisplayName.value[0].toLocaleUpperCase()}${contactDisplayName.value[1].toLocaleLowerCase()}` :
      contactDisplayName.value[0].toLocaleUpperCase()
  ));

  const contactAvatarStyle = computed<Record<string, string>>(() => ({
    ...(contact.value?.avatarId && contact.value?.avatarImage && {
      backgroundImage: `url(${contact.value!.avatarImage})`,
    }),
    ...((!contact.value?.avatarId || !contact.value.avatarImage) && {
      backgroundColor: getElementColor(contactLetters.value),
    }),
  }));

  const whetherContactChanged = computed(() => {
    if (!contact.value || !initialContact.value) {
      return false;
    }

    return Object.keys(pick(contact.value, ['mail', 'name', 'avatarId', 'phone', 'notice']))
      .some(field => {
        const oldFieldValue = initialContact.value![field as keyof Omit<Person, 'timestamp'>];
        const fieldValue = contact.value![field as keyof Omit<Person, 'timestamp'>];
        return fieldValue !== oldFieldValue;
      });
  });

  function checkRequired(mail?: unknown): boolean | string {
    return !!mail || t('validation.text.required');
  }

  function checkEmail(mail?: unknown): boolean | string {
    return mailReg.test(mail! as string) || t('validation.text.mail');
  }

  function checkUsage(mail?: unknown): boolean | string {
    return isMailAddressInUse(mail as string, initialContact.value?.mail ? [initialContact.value.mail] : [])
      ? t('validation.text.usage')
      : true;
  }

  const rules = { mail: [checkRequired, checkEmail, checkUsage] };

  async function getContactData(): Promise<void> {
    if (!contactId?.value) {
      return;
    }

    if (contactId?.value === 'new') {
      contact.value = cloneDeep(EMPTY_CONTACT);
      initialContact.value = cloneDeep(EMPTY_CONTACT);
      return;
    }

    try {
      isLoading.value = true;

      const data = await getContact(contactId.value);
      if (data) {
        contact.value = {
          ...cloneDeep(EMPTY_CONTACT),
          ...data,
        };
        if (isUserAddress.value) {
          contact.value.name = 'Me';
        }

        if (contact.value.avatarId) {
          appContactsSrvProxy.getImage(contact.value.avatarId)
            .then(image => {
              contact.value!.avatarImage = image;
              initialContact.value!.avatarImage = image;
            });
        }

        initialContact.value = cloneDeep(contact.value);
      }
    } finally {
      isLoading.value = false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  async function delContact(doAfterDelete?: Function) {
    const res = await dialog.$openDialog(ConfirmationDialog, {
      dialogText: t('confirmation.delete.one', { name: `<b>${contactDisplayName.value}</b>` }),
      dialogProps: {
        title: t('contact.delete.title', 1),
        width: 300,
        confirmButtonText: t('contact.delete.confirmBtn'),
        cancelButtonText: t('contact.delete.cancelBtn'),
      },
    });

    const { event } = res;
    if (event === 'confirm') {
      try {
        isLoading.value = true;
        await deleteContact(contact.value!.id);
        notification.$createNotice({
          type: 'success',
          content: t('contact.delete.success', 1),
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        notification.$createNotice({
          type: 'error',
          content: t('contact.delete.error', 1),
        });
      } finally {
        isLoading.value = false;
        doAfterDelete && (typeof doAfterDelete === 'function') && doAfterDelete();
        await cancel();
      }
    }
  }

  async function saveContact({ excludeAvatarImageField, doAfterSave }: {
    excludeAvatarImageField?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    doAfterSave?: Function;
  }): Promise<void> {
    if (!contact.value || !contactValid.value) {
      return;
    }

    const isContactNew = contact.value.id === 'new';
    const savingData = omit(contact.value, ['timestamp']);
    if (excludeAvatarImageField) {
      savingData.avatarImage = '';
    }

    try {
      isLoading.value = true;

      const res = await upsertContact(savingData);

      if ('errorType' in res) {
        notification.$createNotice({
          type: 'error',
          content: res.errorMessage,
          duration: 5000,
        });

        return;
      }

      notification.$createNotice({
        type: 'success',
        content: t('contact.upsert.success'),
      });

      if (isContactNew) {
        contact.value.id = res.id;
      }

      initialContact.value = cloneDeep(contact.value);
      doAfterSave && (typeof doAfterSave === 'function') && doAfterSave();
      // isContactNew && await cancel();
      await cancel();
    } catch (e) {
      console.error('#SE => ', e);

      notification.$createNotice({
        type: 'error',
        content: t('contact.upsert.error'),
      });
    } finally {
      isLoading.value = false;
    }
  }

  async function cancel() {
    if (
      (!contact.value?.avatarId && !initialContact.value?.avatarId) ||
      (contact.value?.avatarId === initialContact.value?.avatarId)
    ) {
      await router.push({ name: 'contacts' });
    } else {
      appContactsSrvProxy.removeUnnecessaryImageFiles();
    }
  }

  async function openChat() {
    await w3n.shell!.startAppWithParams!(
      chatApp.domain, chatApp.openCmd,
      {
        peerAddress: contact.value!.mail,
      } as OpenChatCmdArg,
    );
  }

  async function openInbox() {
    await w3n.shell!.startAppWithParams!(
      inboxApp.domain, inboxApp.openCmd,
      {
        peerAddress: contact.value!.mail,
      } as OpenInboxCmdArg,
    );
  }

  async function showOwnKeysInfo() {
    await dialog.$openDialog(OwnKeysInfoDialog, {
      dialogProps: {
        title: t('contact.dialog.title.own-keys'),
        confirmButton: false,
        cancelButton: false,
        closeOnClickOverlay: true,
      },
    });
  }

  async function showContactKeysInfo() {
    await dialog.$openDialog(ContactKeysInfoDialog, {
      contactAddr: contact.value!.mail,
      dialogProps: {
        title: t('contact.dialog.title.contact-keys', {
          contact: contact.value!.name ?? contact.value!.mail,
        }),
        confirmButton: false,
        cancelButton: false,
        closeOnClickOverlay: true,
      },
    });
  }

  async function onFieldUpdate(
    { field, val }: {
      field: keyof (ContactContent | Omit<Person, 'timestamp'>);
      val: string;
    }) {
    contact.value![field] = val;
  }

  async function uploadImage() {
    const imagesExtensions = ['jpeg', 'jpg', 'png', 'gif'];

    const files = await w3n.shell!.fileDialogs!.openFileDialog!(
      'Open',
      '',
      false,
      [{
        name: 'Images', extensions: imagesExtensions,
      }],
    );

    if (!files) {
      return;
    }

    const ext = getFileExtension(files[0].name);
    if (!imagesExtensions.includes(ext)) {
      return;
    }

    try {
      imageProcessing.value = true;
      const file = await transformWeb3nFileToFile(files[0]);
      await schedulerYield();
      const imageMain = await resizeImage(file!, 104);
      await schedulerYield();
      const imageMini = await resizeImage(file!, 40);
      await schedulerYield();
      const imageMainFileId = await appContactsSrvProxy.addImage({ base64: imageMain });
      await sleep(10);
      await appContactsSrvProxy.addImage({
        base64: imageMini,
        id: `${imageMainFileId}-mini`,
        withUploadParentFolder: true,
      });
      contact.value!.avatarImage = imageMini;
      contact.value!.avatarId = imageMainFileId;

      if (contact.value?.id !== 'new') {
        await saveContact({ excludeAvatarImageField: true });
        upsertContactListItem(contact.value!.id, {
          avatarId: imageMainFileId,
          avatarImage: imageMini,
        });
      }
    } finally {
      imageProcessing.value = false;
    }
  }

  async function deleteImage() {
    const imageFileId = contact.value!.avatarId;
    contact.value!.avatarId = undefined;
    contact.value!.avatarImage = undefined;

    if (contact.value?.id !== 'new') {
      await saveContact({});
    }

    await appContactsSrvProxy.deleteImage(imageFileId!);
  }

  return {
    route,
    router,
    notification,
    rules,
    user,
    contentEl,
    isLoading,
    contactId,
    contact,
    initialContact,
    isUserAddress,
    whetherContactChanged,
    contactValid,
    contactDisplayName,
    contactLetters,
    contactAvatarStyle,
    imageProcessing,
    getContactData,
    fetchContacts,
    delContact,
    saveContact,
    cancel,
    upsertContact,
    upsertContactListItem,
    openChat,
    openInbox,
    showContactKeysInfo,
    showOwnKeysInfo,
    onFieldUpdate,
    uploadImage,
    deleteImage,
  };
}
