import { defineStore } from 'pinia'
import { keyBy } from 'lodash'
import { getRandomId } from '@v1nt1248/3nclient-lib'
import { appContactsSrvProxy } from '@/services/services-provider'

function handleError(e: unknown) {
  console.error(JSON.stringify(e))
  throw new Error(JSON.stringify(e))
}

export const useContactsStore = defineStore(
  'contacts',
  {
    state: () => {
      return {
        contactList: {} as Record<string, PersonView>,
      }
    },

    actions: {
      async upsertContact(contact: Person): Promise<void> {
        const updatedData = contact.id === 'new'
          ? {
            ...contact,
            id: getRandomId(6),
          }
          : contact

        await appContactsSrvProxy.upsertContact(updatedData)
          .catch(e => handleError(e))

        const contactList = await appContactsSrvProxy.getContactList()
          .catch(e => handleError(e))
        if (contactList) {
          this.contactList = keyBy(contactList, 'id')
        }
      },

      async getContact(contactId: string): Promise<Person> {
        return appContactsSrvProxy.getContact(contactId)
      },

      async getContactList(): Promise<void> {
        const contactList = await appContactsSrvProxy.getContactList()
          .catch(e => handleError(e))
        if (contactList) {
          this.contactList = keyBy(contactList, 'id')
        }
      },

      async deleteContact(contactId: string): Promise<void> {
        if (contactId) {
          await appContactsSrvProxy.deleteContact(contactId)
          delete this.contactList[contactId]
        }
      },
    },
  },
)
