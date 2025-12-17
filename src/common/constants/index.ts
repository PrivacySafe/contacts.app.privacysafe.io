import type { Person } from '@main/common/types';

export const chatApp = Object.freeze({
  domain: 'chat.app.privacysafe.io',
  openCmd: 'open-chat-with',
});

export const inboxApp = Object.freeze({
  domain: 'inbox.app.privacysafe.io',
  openCmd: 'open-inbox-with',
});

export const EMPTY_CONTACT: Person = {
  id: 'new',
  name: '',
  mail: '',
  avatarId: undefined,
  avatarImage: undefined,
  notice: '',
  phone: '',
  timestamp: 0,
};
