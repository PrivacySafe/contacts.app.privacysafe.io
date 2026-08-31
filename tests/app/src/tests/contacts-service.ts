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
// Exercises the deno service over its real IPC surface: GUI -> RPC -> deno ->
// sqlite on 3N storage. appContactsSrvProxy is the same proxy the app uses; it
// is already connected by the test setup.
import { itCond, skipSpecIfUnresponsive } from '../libs-for-tests/jasmine-utils.js';
import { appContactsSrvProxy } from '@main/common/services/services-provider.js';
import { NEW_EMPTY_CONTACT_ID } from '@main/common/constants/index.js';
import { TestSetupContainer } from '@tests/setups.js';
import { sleep } from '../lib-common/processes/sleep.js';
import type { Person } from '@main/types/index.js';

declare const w3n: web3n.testing.CommonW3N;

const OP_TIMEOUT = 20000;
const SPEC_TIMEOUT = 40000;
const CLEANUP_TIMEOUT = 120000;

/** Base64 of a 1x1 transparent gif, small enough to keep the specs quick. */
const IMG_BASE64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const OTHER_IMG_BASE64 = 'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

function isPerson(res: Person | { errorType: string }): res is Person {
  return !('errorType' in res);
}

/**
 * Deletion of an image is EVENTUAL, not immediate: a file whose upload is in
 * flight is left alone, because removing it makes the core reject its own
 * background removeCurrentVersion as unhandled. Such a file becomes an orphan
 * and is collected by a later sweep, so the spec retries instead of assuming the
 * first call finished the job.
 */
async function deleteImageEventually(id: string): Promise<boolean> {
  // Both files have to go: deleteImage removes `id` and `${id}-mini`, and the
  // deferral is per file, so the thumbnail can outlive the full size.
  const gone = async () => (
    ((await appContactsSrvProxy.getImage(id)) === '[error]')
    && ((await appContactsSrvProxy.getImage(`${id}-mini`)) === '[error]')
  );

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await appContactsSrvProxy.deleteImage(id);
    if (await gone()) {
      return true;
    }
    await sleep(1000);
  }
  return false;
}

describe(`Contacts deno service`, () => {

  let ownAddr: string;
  const contactIdsToClean = new Set<string>();
  const imageIdsToClean = new Set<string>();

  beforeAll(() => {
    ({ fstUserAddr: ownAddr } = (window as any as TestSetupContainer).testSetup);
  });

  // Cleanup removes every contact and image the suite made, and each removal
  // saves the db. That runs well past jasmine's 5s default for a hook, and a
  // hook timing out fails the whole SUITE rather than a spec.
  afterAll(async () => {
    for (const id of contactIdsToClean) {
      await appContactsSrvProxy.deleteContact(id).catch(() => undefined);
    }
    for (const id of imageIdsToClean) {
      await appContactsSrvProxy.deleteImage(id).catch(() => undefined);
    }
  }, CLEANUP_TIMEOUT);

  /** Adds a contact with a unique address and registers it for cleanup. */
  async function addContact(name?: string): Promise<Person> {
    const mail = `spec-${Date.now()}-${Math.floor(Math.random() * 1e6)}@3nweb.com`;
    const res = await skipSpecIfUnresponsive(
      `adding contact ${mail}`, OP_TIMEOUT,
      () => appContactsSrvProxy.upsertContact({ id: NEW_EMPTY_CONTACT_ID, mail, name }),
    );
    if (!isPerson(res)) {
      throw new Error(`Failed to add a contact: ${res.errorMessage}`);
    }
    contactIdsToClean.add(res.id);
    return res;
  }

  describe(`contacts`, () => {

    itCond(`generates an id for a new contact`, async () => {
      const contact = await addContact('Spec Contact');

      expect(contact.id).withContext(`generated id`).not.toBe(NEW_EMPTY_CONTACT_ID);
      expect(contact.id.length).withContext(`generated id length`).toBe(8);
      expect(typeof contact.timestamp).withContext(`stamped on creation`).toBe('number');
    }, SPEC_TIMEOUT);

    itCond(`stores and returns every editable field`, async () => {
      const created = await addContact();
      await appContactsSrvProxy.upsertContact({
        ...created,
        name: 'Spec Name',
        phone: '+1 555 0100',
        notice: 'met at a conference',
      });

      const read = await appContactsSrvProxy.getContact(created.id);

      expect(read).withContext(`contact is readable back`).toBeDefined();
      expect(read!.name).toBe('Spec Name');
      expect(read!.phone).toBe('+1 555 0100');
      expect(read!.notice).toBe('met at a conference');
    }, SPEC_TIMEOUT);

    itCond(`moves the timestamp forward on update`, async () => {
      const created = await addContact();
      const before = (await appContactsSrvProxy.getContact(created.id))!.timestamp;

      await appContactsSrvProxy.upsertContact({ ...created, name: 'Renamed' });
      const after = (await appContactsSrvProxy.getContact(created.id))!.timestamp;

      expect(after).withContext(`timestamp after update`).toBeGreaterThanOrEqual(before);
    }, SPEC_TIMEOUT);

    itCond(`refuses a duplicated address without creating a second contact`, async () => {
      const created = await addContact();

      const res = await appContactsSrvProxy.upsertContact({
        id: NEW_EMPTY_CONTACT_ID, mail: created.mail,
      });

      expect(isPerson(res)).withContext(`duplicate is refused`).toBeFalse();
      if (!isPerson(res)) {
        expect(res.errorType).toBe('exists');
      }
      const withSameMail = (await appContactsSrvProxy.getContactList())
      .filter(c => (c.mail === created.mail));
      expect(withSameMail.length).withContext(`contacts with that address`).toBe(1);
    }, SPEC_TIMEOUT);

    // The db is scanned canonically rather than matched by SQL equality, because
    // sqlite compares TEXT byte by byte. Without that, the same account written
    // in a different case slipped past the duplicate check and one person became
    // two contacts.
    itCond(`refuses a duplicate written in a different case`, async () => {
      const created = await addContact();
      const shouted = created.mail.toUpperCase();

      const res = await appContactsSrvProxy.upsertContact({
        id: NEW_EMPTY_CONTACT_ID, mail: shouted,
      });

      if (isPerson(res)) {
        // Register it, so a regression does not leave the account behind.
        contactIdsToClean.add(res.id);
      }
      expect(isPerson(res))
      .withContext(`duplicate in another case is refused`).toBeFalse();
      const sameAccount = (await appContactsSrvProxy.getContactList())
      .filter(c => (c.mail.toLowerCase() === created.mail.toLowerCase()));
      expect(sameAccount.length)
      .withContext(`contacts for that one account`).toBe(1);
    }, SPEC_TIMEOUT);

    // Reporting success for an id that is not in the table told the caller
    // "saved" for something never stored — which is what a save of a contact
    // removed on another device used to do.
    itCond(`refuses to update an unknown id`, async () => {
      let thrown: web3n.RuntimeException|undefined;
      await appContactsSrvProxy.upsertContact({
        id: 'no-such-id', mail: 'ghost@3nweb.com',
      }).catch((err: web3n.RuntimeException) => {
        thrown = err;
      });

      expect(thrown).withContext(`update of a missing contact is refused`).toBeDefined();
      expect((thrown as { contactNotFound?: true } | undefined)?.contactNotFound)
      .withContext(`reason given`).toBeTrue();
      expect(await appContactsSrvProxy.getContact('no-such-id'))
      .withContext(`nothing was stored`).toBeUndefined();
    }, SPEC_TIMEOUT);

    itCond(`removes a contact from the list`, async () => {
      const created = await addContact();

      await appContactsSrvProxy.deleteContact(created.id);
      contactIdsToClean.delete(created.id);

      expect(await appContactsSrvProxy.getContact(created.id)).toBeUndefined();
      expect((await appContactsSrvProxy.getContactList()).find(c => (c.id === created.id)))
      .withContext(`gone from the list`).toBeUndefined();
    }, SPEC_TIMEOUT);

    itCond(`keeps the own address in the list`, async () => {
      const list = await appContactsSrvProxy.getContactList();

      expect(list.find(c => (c.mail === ownAddr)))
      .withContext(`own contact`).toBeDefined();
    }, SPEC_TIMEOUT);

    // The whole reason the db upload is debounced: leaving the file unsynced
    // between saves opened a window in which sync choreography reset the file
    // version below still-registered local versions, after which EVERY next
    // save failed with "Version N already exists". Reported as: fresh user,
    // contact #1 saves fine, contact #2 always fails.
    itCond(`saves five contacts in a row`, async () => {
      const created: string[] = [];
      for (let i = 0; i < 5; i += 1) {
        const contact = await addContact(`Spec Series ${i}`);
        created.push(contact.id);
      }

      expect(created.length).withContext(`all five saved`).toBe(5);
      expect(new Set(created).size).withContext(`all ids distinct`).toBe(5);
      for (const id of created) {
        expect(await appContactsSrvProxy.getContact(id))
        .withContext(`contact ${id} is on disk`).toBeDefined();
      }
    }, SPEC_TIMEOUT * 2);

  });

  describe(`address reachability`, () => {

    // The check runs in the deno component, because only it is granted
    // `mail: { preflightsTo }` — the GUI windows are not, so this IPC method is
    // the only way for them to ask at all.
    itCond(`finds the other test user, who really exists`, async () => {
      const { sndUserAddr } = (window as any as TestSetupContainer).testSetup;

      const result = await skipSpecIfUnresponsive(
        `ASMail check of ${sndUserAddr}`, OP_TIMEOUT,
        () => appContactsSrvProxy.checkAddressReachability(sndUserAddr),
      );

      expect(result).withContext(`existing account on a 3NWeb domain`).toBe('found');
    }, SPEC_TIMEOUT);

    itCond(`finds our own address`, async () => {
      const result = await skipSpecIfUnresponsive(
        `ASMail check of ${ownAddr}`, OP_TIMEOUT,
        () => appContactsSrvProxy.checkAddressReachability(ownAddr),
      );

      expect(result).withContext(`own account`).toBe('found');
    }, SPEC_TIMEOUT);

    itCond(`reports an unknown account at a 3NWeb domain`, async () => {
      const absent = `no-such-account-${Date.now()}@3nweb.com`;

      const result = await skipSpecIfUnresponsive(
        `ASMail check of ${absent}`, OP_TIMEOUT,
        () => appContactsSrvProxy.checkAddressReachability(absent),
      );

      expect(result).withContext(`absent account`).toBe('not-present-at-domain');
    }, SPEC_TIMEOUT);

    itCond(`reports a domain that runs no 3NWeb messaging service`, async () => {
      const result = await skipSpecIfUnresponsive(
        `ASMail check of a non-3NWeb domain`, OP_TIMEOUT,
        () => appContactsSrvProxy.checkAddressReachability('someone@example.com'),
      );

      expect(result).withContext(`domain without the service`).toBe('no-service-for-domain');
    }, SPEC_TIMEOUT);

    // A malformed address does not blow the check up: toCanonicalAddress turns
    // 'not-an-address' into '@not-an-address', and looking for a messaging
    // service at that domain simply finds none. Which is the right answer — such
    // an address cannot receive — so the verdict stops the handover and says so.
    itCond(`reports a malformed address as having no service`, async () => {
      const result = await skipSpecIfUnresponsive(
        `ASMail check of a malformed address`, OP_TIMEOUT,
        () => appContactsSrvProxy.checkAddressReachability('not-an-address'),
      );

      expect(result).withContext(`unusable address`).toBe('no-service-for-domain');
    }, SPEC_TIMEOUT);

  });

  describe(`avatars`, () => {

    itCond(`round-trips an image through the store`, async () => {
      const id = await appContactsSrvProxy.addImage({ base64: IMG_BASE64 });
      imageIdsToClean.add(id);

      expect(typeof id).withContext(`generated image id`).toBe('string');
      expect(await appContactsSrvProxy.getImage(id))
      .withContext(`image content`).toBe(IMG_BASE64);
    }, SPEC_TIMEOUT);

    itCond(`stores the thumbnail under the -mini companion id`, async () => {
      const id = await appContactsSrvProxy.addImage({ base64: IMG_BASE64 });
      imageIdsToClean.add(id);
      await appContactsSrvProxy.addImage({
        base64: OTHER_IMG_BASE64, id: `${id}-mini`, withUploadParentFolder: true,
      });

      expect(await appContactsSrvProxy.getImage(`${id}-mini`))
      .withContext(`thumbnail content`).toBe(OTHER_IMG_BASE64);
      expect(await appContactsSrvProxy.getImage(id))
      .withContext(`full size is untouched`).toBe(IMG_BASE64);
    }, SPEC_TIMEOUT);

    // A missing file comes back as '[error]', NOT as an empty string: getFile
    // answers '' for a not-found file, and getImage reads that empty answer as a
    // failure. This is the value the contact list item retries on, treating it
    // as "not downloaded yet".
    itCond(`answers [error] for an image that is not there`, async () => {
      expect(await appContactsSrvProxy.getImage('no-such-image-id'))
      .withContext(`missing image`).toBe('[error]');
    }, SPEC_TIMEOUT);

    itCond(`deletes both the image and its thumbnail`, async () => {
      const id = await appContactsSrvProxy.addImage({ base64: IMG_BASE64 });
      await appContactsSrvProxy.addImage({ base64: IMG_BASE64, id: `${id}-mini` });

      expect(await deleteImageEventually(id))
      .withContext(`both the image and its thumbnail removed within the budget`).toBeTrue();
    }, SPEC_TIMEOUT * 2);

    itCond(`serves the thumbnail through the contact list`, async () => {
      const contact = await addContact('With Avatar');
      const avatarId = await appContactsSrvProxy.addImage({ base64: IMG_BASE64 });
      imageIdsToClean.add(avatarId);
      await appContactsSrvProxy.addImage({ base64: OTHER_IMG_BASE64, id: `${avatarId}-mini` });
      await appContactsSrvProxy.upsertContact({ ...contact, avatarId });

      const listed = (await appContactsSrvProxy.getContactList(true))
      .find(c => (c.id === contact.id));

      expect(listed).withContext(`contact in list`).toBeDefined();
      expect(listed!.avatarImage)
      .withContext(`list carries the thumbnail, not the full size`).toBe(OTHER_IMG_BASE64);
    }, SPEC_TIMEOUT);

    itCond(`collects an orphaned image and keeps the one in use`, async () => {
      const contact = await addContact('Keeps Avatar');
      const usedId = await appContactsSrvProxy.addImage({ base64: IMG_BASE64 });
      await appContactsSrvProxy.addImage({ base64: IMG_BASE64, id: `${usedId}-mini` });
      await appContactsSrvProxy.upsertContact({ ...contact, avatarId: usedId });
      imageIdsToClean.add(usedId);
      const orphanId = await appContactsSrvProxy.addImage({ base64: OTHER_IMG_BASE64 });

      // Sweeping is retried for the same reason deletion is eventual: an orphan
      // whose upload is in flight is left for the next sweep.
      let orphanGone = false;
      for (let attempt = 0; attempt < 8 && !orphanGone; attempt += 1) {
        await appContactsSrvProxy.removeUnnecessaryImageFiles();
        orphanGone = ((await appContactsSrvProxy.getImage(orphanId)) === '[error]');
        if (!orphanGone) {
          await sleep(1000);
        }
      }

      expect(orphanGone).withContext(`orphan is collected`).toBeTrue();
      expect(await appContactsSrvProxy.getImage(usedId))
      .withContext(`referenced image is kept`).toBe(IMG_BASE64);
      expect(await appContactsSrvProxy.getImage(`${usedId}-mini`))
      .withContext(`its thumbnail is kept too`).toBe(IMG_BASE64);
    }, SPEC_TIMEOUT);

  });

});
