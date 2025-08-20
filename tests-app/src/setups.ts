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

import { setupMainApp } from "@main/desktop/app-setup.ts";
import { initializeServices } from "@main/common/services/services-provider";
import { ContactsStore, useContactsStore } from "@main/common/store/contacts.store";
import { AppViewInstance, useAppView } from "@main/desktop/composables/useAppView";

declare const w3n: web3n.testing.CommonW3N;

export interface TestSetupContainer extends Window {
  testSetup: {
    fstUserAddr: string;
    sndUserAddr: string;
    appView: AppViewInstance;
    contactsStore: ContactsStore;
  } & ReturnType<typeof setupMainApp>;
}

export async function setupBeforeAllTests(): Promise<void> {
	await initializeServices();
  const { app, router } = setupMainApp();
  const appView = useAppView();

  await appView.doBeforeMount();

  const fstUserAddr = await w3n.testStand.idOfTestUser(1);
  const sndUserAddr = await w3n.testStand.idOfTestUser(2);

  const contactsStore = useContactsStore();

  (window as any as TestSetupContainer).testSetup = {
    app, router, appView, fstUserAddr, sndUserAddr, contactsStore
  };
}
