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
import { storeToRefs } from 'pinia';
import { DIALOGS_KEY, I18N_KEY, NOTIFICATIONS_KEY } from '@v1nt1248/3nclient-lib/plugins';
import { getElementColor, mailReg } from '@v1nt1248/3nclient-lib/utils';
import type { Nullable } from '@v1nt1248/3nclient-lib';
import { useAppStore } from '@main/common/store/app.store';
import { useContactsStore } from '@main/common/store/contacts.store';
import { chatApp, inboxApp } from '@main/common/constants';
import type { OpenChatCmdArg, OpenInboxCmdArg, Person } from '@main/common/types';
import ConfirmationDialog from '@main/common/dialogs/confirmation-dialog.vue';
import OwnKeysInfoDialog from '@main/common/dialogs/own-keys-info-dialog.vue';
import ContactKeysInfoDialog from '@main/common/dialogs/contact-keys-info-dialog.vue';

export function useContact() {
  const { $tr } = inject(I18N_KEY)!;
  const notification = inject(NOTIFICATIONS_KEY)!;
  const dialog = inject(DIALOGS_KEY)!;

  const { user } = storeToRefs(useAppStore());
  const contactsStore = useContactsStore();
  const { getContact, fetchContacts, deleteContact, upsertContact } = contactsStore;

  const contact = ref<Nullable<Person>>(null);
  const initialContact = ref<Nullable<Person>>(null);
  const contactValid = ref(contact.value?.id !== 'new');

  const contactDisplayName = computed(() => contact.value?.name || contact.value?.mail || ' ');

  const contactLetters = computed(() => (
    contactDisplayName.value.length > 1 ?
      `${contactDisplayName.value[0].toLocaleUpperCase()}${contactDisplayName.value[1].toLocaleLowerCase()}` :
      contactDisplayName.value[0].toLocaleUpperCase()
  ));

  const contactAvatarStyle = computed<Record<string, string>>(() => ({
    backgroundColor: getElementColor(contactLetters.value),
  }));

  function checkRequired(mail?: unknown): boolean | string {
    return !!mail || $tr('validation.text.required');
  }

  function checkEmail(mail?: unknown): boolean | string {
    return mailReg.test(mail! as string) || $tr('validation.text.mail');
  }

  const rules = { mail: [checkRequired, checkEmail] };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  function delContact(doAfterDelete?: Function) {
    dialog.$openDialog<typeof ConfirmationDialog>({
      component: ConfirmationDialog,
      componentProps: {
        dialogText: $tr('confirmation.delete.text', { name: `<b>${contactDisplayName.value}</b>` }),
      },
      dialogProps: {
        title: $tr('contact.delete.title'),
        width: 300,
        confirmButtonText: $tr('contact.delete.confirmBtn.text'),
        cancelButtonText: $tr('contact.delete.cancelBtn.text'),
        onConfirm: async () => {
          try {
            await deleteContact(contact.value!.id);
            notification.$createNotice({
              type: 'success',
              content: $tr('contact.delete.success.text'),
            });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (err) {
            notification.$createNotice({
              type: 'error',
              content: $tr('contact.delete.error.text'),
            });
          } finally {
            doAfterDelete && doAfterDelete();
          }
        },
      },
    });
  }

  function personDataFromContact(): Person {
    return {
      id: contact.value!.id,
      mail: contact.value!.mail,
      ...(contact.value?.name && { name: contact.value!.name }),
      ...(contact.value?.phone && { phone: contact.value!.phone }),
      ...(contact.value?.notice && { notice: contact.value!.notice }),
      ...(contact.value?.avatarMini && { avatarMini: contact.value!.avatarMini }),
      ...(contact.value?.avatar && { avatar: contact.value!.avatar }),
      ...(contact.value?.activities && { activities: contact.value!.activities }),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  async function saveContact(data: Person, doAfterSave?: Function) {
    try {
      await upsertContact(data);
      notification.$createNotice({
        type: 'success',
        content: $tr('contact.upsert.success.text'),
      });
      doAfterSave && doAfterSave();
    } catch {
      notification.$createNotice({
        type: 'error',
        content: $tr('contact.upsert.error.text'),
      });
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
    dialog.$openDialog<typeof OwnKeysInfoDialog>({
      component: OwnKeysInfoDialog,
      dialogProps: {
        title: $tr('contact.dialog.title.own-keys'),
        confirmButton: false,
        cancelButton: false,
        closeOnClickOverlay: true,
      },
    });
  }

  function showContactKeysInfo() {
    const title = $tr('contact.dialog.title.contact-keys', {
      contact: contact.value!.name ?? contact.value!.mail
    });
    dialog.$openDialog<typeof ContactKeysInfoDialog>({
      component: ContactKeysInfoDialog,
      dialogProps: {
        title,
        confirmButton: false,
        cancelButton: false,
        closeOnClickOverlay: true,
      },
      componentProps: {
        contactAddr: contact.value!.mail
      }
    });
  }

  return {
    $tr,
    notification,
    rules,
    user,
    contact,
    personDataFromContact,
    initialContact,
    contactValid,
    contactDisplayName,
    contactLetters,
    contactAvatarStyle,
    getContact,
    fetchContacts,
    delContact,
    saveContact,
    upsertContact,
    openChat,
    openInbox,
    showContactKeysInfo,
    showOwnKeysInfo,
  };
}
