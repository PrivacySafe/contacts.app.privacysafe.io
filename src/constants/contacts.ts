export const nonEditableContacts = ['0', '1']

export async function getDefaultContacts(): Promise<Person[]> {
  const currentUser = await w3n.mailerid!.getUserId()
  return [
    {
      id: '0',
      name: '3NSoft',
      mail: 'support@3nweb.com',
      avatarMini: undefined,
      avatar: undefined,
      notice: 'The 3NSoft support department.',
      phone: '',
      activities: [],
    },
    {
      id: '1',
      name: 'Me',
      mail: currentUser!,
      avatarMini: undefined,
      avatar: undefined,
      notice: 'It\'s me',
      phone: '',
      activities: [],
    },
  ]
}
