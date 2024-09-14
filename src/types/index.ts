export type AvailableLanguage = 'en';

export type AvailableColorTheme = 'default' | 'dark';

export type AppConfig = {
  lang: AvailableLanguage;
  colorTheme: AvailableColorTheme;
};

export type ConnectivityStatus = 'offline' | 'online';

export interface AppContactsService {
  getContactList(): Promise<PersonView[]>;
  getContact(id: string): Promise<Person>;
  upsertContact(contact: Person): Promise<void>;
  deleteContact(id: string): Promise<void>;
  watchContactList(obs: web3n.Observer<PersonView[]>): () => void;
}

export interface PersonView {
  id: string;
  name?: string;
  mail: string;
  avatarMini?: string;
}

export interface PersonActivity {
  id: string;
  type: 'chat' | 'mail';
  description: string;
  timestamp: number;
}

export interface Person extends PersonView {
  avatar?: string;
  notice?: string;
  phone?: string;
  activities?: string[];
}

export type ContactContent = Omit<Person, 'id'|'avatar'|'avatarMini'|'activities'>

export interface ContactGroup {
  id: string;
  title: string;
  contacts: Array<PersonView & { displayName: string }>;
}

export interface OpenChatCmdArg {
  peerAddress: string;
}
