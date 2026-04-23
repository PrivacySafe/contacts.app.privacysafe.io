/*
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
*/
export const en = {
  app: {
    title: 'Contacts',
    sync: {
      status: 'Sync Status',
    },
    status: {
      label: 'Status',
      connected: {
        online: 'online',
        offline: 'offline',
      },
      synced: 'synced',
      unsynced: 'unsynced',
    },
    exit: 'Log out',
    btn: {
      cancel: 'Cancel',
      save: 'Save',
      add: 'Add New',
    },
    info: {
      status: {
        online: 'You are currently online. All previously made changes will be synchronized.',
        offline: 'You are currently offline. All changes will stay on this device till it gets connected.',
      },
    },
  },
  action: {
    select: {
      all: 'Select all',
    },
    deselect: {
      all: 'Deselect all',
    },
    open: {
      chat: {
        tooltip: 'Open a chat with the contact',
      },
      mail: {
        tooltip: 'Create a message to the the contact',
      },
    },
    show: {
      keys: {
        own: 'Show own keys info',
        contact: 'Show the contact keys info',
      },
    },
  },
  confirmation: {
    warning: 'Warning',
    delete: {
      one: 'You try to Delete {name} Contact. This operation will remove all Activities from the User.',
      multiple: 'You try to Delete {count} Contacts. This operation will remove all Activities from the User.',
    },
  },
  contacts: {
    search: {
      placeholder: 'Search in contact names and mail',
    },
  },
  contact: {
    delete: {
      title: 'Delete Contact | Delete Contacts',
      confirmBtn: 'Delete',
      cancelBtn: 'Cancel',
      success: 'The Contact was deleted. | The Contacts was deleted.',
      error: 'Delete contact error. Contact Support. | Delete contacts error. Contact Support.',
    },
    upsert: {
      success: 'The contact was saved.',
      error: 'Save contact error. Contact Support.',
    },
    placeholder: 'Select User to see Details',
    avatar: {
      upload: 'Upload image',
      delete: 'Delete image',
    },
    content: {
      identity: 'Identity',
      name: 'Name',
      phone: 'Phone',
      note: 'Note',
    },
    dialog: {
      title: {
        'own-keys': 'Own Keys',
        'contact-keys': '{contact} Keys',
      },
    },
  },
  validation: {
    text: {
      required: 'This field is required.',
      mail: 'Not valid address.',
      usage: 'This mail is already in use.',
    },
  },
  'keys-info': {
    'key-on-server': {
      'no-key': 'No introductory public key is present on the server. Without such key new people can\'t send you messages, while existing contacts with established communication key chains can continue sending you messages.',
      section: 'Introductory Public Key on ASMail Server',
      btn: {
        'make-new': 'Create New Key',
        update: 'Update Key',
        remove: 'Remove Key',
      },
    },
    'sending-key-pair': 'Key Pair for Sending',
    'receiving-key-pair-in-use': 'Key Pair in use for Receiving',
    'receiving-key-pair-suggested': 'Key Pair suggested next for Receiving',
    'receiving-key-pair-old': 'Previous Key Pair for Receiving',
    'no-contact-keys': 'No keys present for this contact.',
    'key-id': 'Key Id',
    'your-key-id': 'Your Key Id',
    'contact-key-id': `Contact's Key Id`,
    'contact-intro-key-id': `Contact's Introductory Key Id`,
    'expiry': 'Expiry',
    'alg': 'Algorithm',
    'mid-certifier': 'MailerId certifier',
    'timestamp': 'Timestamp',
    'last-msg-ts': 'Last used at',
    'num-of-sent-msgs': 'Number of sent messages',
    'received-msgs': 'Received messages',
    'random-pids': 'Randomized Pair Ids',
  },
};
