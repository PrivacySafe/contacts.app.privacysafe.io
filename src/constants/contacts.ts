export const nonEditableContacts = ['0', '1']

export const mailReg = /[^@]+@[^@]+\.[^@]+/ui

// export async function getDefaultContacts(mode: 'list'): Promise<Record<string, PersonView>>
// export async function getDefaultContacts(mode: 'contact'): Promise<Record<string, Person>>
// export async function getDefaultContacts(mode: 'list'|'contact'): Promise<Record<string, PersonView|Person>> {
//   const currentUser = await w3n.mailerid?.getUserId()
//
//   return {
//     '0': {
//       id: '0',
//       name: '3NSoft',
//       mail: 'support@3nweb.com',
//       ...(mode === 'contact' && {
//         notice: 'The 3NSoft support department.',
//         phone: '',
//         activities: [],
//       }),
//     },
//     '1': {
//       id: '1',
//       name: 'Me',
//       mail: currentUser!,
//       ...(mode === 'contact' && {
//         notice: 'It\'s me',
//         phone: '',
//         activities: [],
//       }),
//     }
//   }
// }
//
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
