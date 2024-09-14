import type { Person } from '@/types';

export const nonEditableContacts = ['1'];

export async function getDefaultContacts(): Promise<Person[]> {
  const currentUser = await w3n.mailerid!.getUserId();
  return [
    {
      id: '1',
      name: 'Me',
      mail: currentUser!,
      avatarMini: undefined,
      avatar: undefined,
      notice: `It's me`,
      phone: '',
      activities: [],
    },
  ];
}
