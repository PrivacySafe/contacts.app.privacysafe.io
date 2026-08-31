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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The module under test reaches the sqlite bundle only to read the remote
// db file; mocking it keeps the ~1MB precompiled runtime out of the test.
const makeReadonly = vi.fn();
vi.mock('@shared/sqlite-on-3nstorage/index.js', () => ({
  SQLiteOn3NStorage: { makeReadonly },
}));

const { handleDbFileSyncStatus } = await import('@deno/utils/handle-db-file-sync-status.ts');
const { CONTACTS_DB_FILE } = await import('@deno/constants');
const { makeEventCollector, makeFakeFs, connectException } =
  await import('../../helpers/fake-fs.ts');

const contactColumns = [
  'id', 'mail', 'name', 'avatarId', 'timestamp', 'notice', 'phone', 'activities', 'settings',
];

interface Row { id: string; mail: string; name?: string | null; timestamp?: number }

function queryResult(rows: Row[]) {
  return [{
    columns: contactColumns,
    values: rows.map(r => [
      r.id, r.mail, r.name ?? null, null, r.timestamp ?? 1, null, null, null, null,
    ]),
  }];
}

/** Local sqlite handle: only db.exec and reloadDb are reached. */
function fakeSqlite(localRows: Row[]) {
  return {
    db: { exec: vi.fn(() => queryResult(localRows)) },
    reloadDb: vi.fn(async () => undefined),
  };
}

function fakeContactDbSrv() {
  return { updateContactsTable: vi.fn(async () => true) };
}

/** Points the mocked sqlite reader at the given remote rows. */
function scriptRemoteRows(rows: Row[]) {
  makeReadonly.mockResolvedValue({ db: { exec: vi.fn(() => queryResult(rows)) } });
}

function conflictingStatus(latest = 5) {
  return { state: 'conflicting', remote: { latest } };
}

beforeEach(() => {
  makeReadonly.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('handleDbFileSyncStatus', () => {

  it('does nothing when the platform reports no status', async () => {
    const { fs, sync } = makeFakeFs();
    const collector = makeEventCollector();
    sync.status.mockResolvedValue(undefined);

    await handleDbFileSyncStatus({
      fs,
      sqlite: fakeSqlite([]) as never,
      contactDbSrv: fakeContactDbSrv() as never,
      emitStorageEvent: collector.emitStorageEvent,
    });

    expect(sync.startUpload).not.toHaveBeenCalled();
    expect(sync.adoptRemote).not.toHaveBeenCalled();
    expect(collector.events).toEqual([]);
  });

  describe('unsynced', () => {

    it('uploads the local version', async () => {
      const { fs, sync } = makeFakeFs();
      sync.status.mockResolvedValue({ state: 'unsynced' });

      await handleDbFileSyncStatus({
        fs,
        sqlite: fakeSqlite([]) as never,
        contactDbSrv: fakeContactDbSrv() as never,
        emitStorageEvent: () => undefined,
      });

      expect(sync.startUpload).toHaveBeenCalledWith(CONTACTS_DB_FILE, undefined);
      expect(sync.adoptRemote).not.toHaveBeenCalled();
    });

    it('tolerates being offline', async () => {
      const { fs, sync } = makeFakeFs();
      sync.status.mockResolvedValue({ state: 'unsynced' });
      sync.startUpload.mockImplementation(() => {
        throw connectException();
      });

      await expect(handleDbFileSyncStatus({
        fs,
        sqlite: fakeSqlite([]) as never,
        contactDbSrv: fakeContactDbSrv() as never,
        emitStorageEvent: () => undefined,
      })).resolves.toBeUndefined();
    });

  });

  describe('behind', () => {

    it('adopts the remote version, reloads the db and announces the new list', async () => {
      const { fs, sync } = makeFakeFs();
      const sqlite = fakeSqlite([]);
      const collector = makeEventCollector();
      sync.status.mockResolvedValue({ state: 'behind', remote: { latest: 8 } });
      sync.isRemoteVersionOnDisk.mockResolvedValue('complete');

      await handleDbFileSyncStatus({
        fs,
        sqlite: sqlite as never,
        contactDbSrv: fakeContactDbSrv() as never,
        emitStorageEvent: collector.emitStorageEvent,
      });

      expect(sync.adoptRemote).toHaveBeenCalledWith(CONTACTS_DB_FILE, { remoteVersion: 8 });
      expect(sync.startDownload).not.toHaveBeenCalled();
      expect(sqlite.reloadDb).toHaveBeenCalled();
      expect(collector.names()).toContain('update:contact-list');
    });

    // reloadDb reads the file off disk, so the bytes have to be there first.
    it('downloads the remote version when its bytes are not on disk', async () => {
      const { fs, sync } = makeFakeFs();
      sync.status.mockResolvedValue({ state: 'behind', remote: { latest: 8 } });
      sync.isRemoteVersionOnDisk.mockResolvedValue('none');

      await handleDbFileSyncStatus({
        fs,
        sqlite: fakeSqlite([]) as never,
        contactDbSrv: fakeContactDbSrv() as never,
        emitStorageEvent: () => undefined,
      });

      expect(sync.startDownload).toHaveBeenCalledWith(CONTACTS_DB_FILE, 8);
    });

  });

  describe('conflicting', () => {

    it('adopts remote and reloads when the merge found nothing new', async () => {
      const { fs, sync } = makeFakeFs();
      const sqlite = fakeSqlite([{ id: 'c1', mail: 'ann@3nweb.com', name: 'Ann', timestamp: 5 }]);
      const contactDbSrv = fakeContactDbSrv();
      sync.status.mockResolvedValue(conflictingStatus(5));
      scriptRemoteRows([{ id: 'c1', mail: 'ann@3nweb.com', name: 'Ann', timestamp: 5 }]);

      await handleDbFileSyncStatus({
        fs,
        sqlite: sqlite as never,
        contactDbSrv: contactDbSrv as never,
        emitStorageEvent: () => undefined,
      });

      expect(contactDbSrv.updateContactsTable).not.toHaveBeenCalled();
      expect(sync.adoptRemote).toHaveBeenCalledWith(CONTACTS_DB_FILE, { remoteVersion: 5 });
      expect(sqlite.reloadDb).toHaveBeenCalled();
    });

    it('rewrites the table and uploads past the remote version when the merge found changes', async () => {
      const { fs, sync } = makeFakeFs();
      const sqlite = fakeSqlite([{ id: 'c1', mail: 'ann@3nweb.com', name: 'Ann', timestamp: 5 }]);
      const contactDbSrv = fakeContactDbSrv();
      sync.status.mockResolvedValue(conflictingStatus(5));
      scriptRemoteRows([
        { id: 'c1', mail: 'ann@3nweb.com', name: 'Ann', timestamp: 5 },
        { id: 'c2', mail: 'bob@3nweb.com', name: 'Bob', timestamp: 6 },
      ]);

      await handleDbFileSyncStatus({
        fs,
        sqlite: sqlite as never,
        contactDbSrv: contactDbSrv as never,
        emitStorageEvent: () => undefined,
      });

      expect(contactDbSrv.updateContactsTable).toHaveBeenCalled();
      // Writing at latest+1 is what makes the merged result win over the
      // remote version that caused the conflict.
      expect(sync.startUpload).toHaveBeenCalledWith(CONTACTS_DB_FILE, { uploadVersion: 6 });
      expect(sync.adoptRemote).not.toHaveBeenCalled();
    });

    // Regression guard for the row normalisation feeding the merge: with a
    // `for...in` over Object.keys() every field came through as undefined, so
    // updateContactsTable was handed rows with numeric keys and the whole
    // conflict path silently rebuilt the table from garbage.
    it('hands updateContactsTable rows with real contact fields', async () => {
      const { fs, sync } = makeFakeFs();
      const sqlite = fakeSqlite([{ id: 'c1', mail: 'ann@3nweb.com', name: 'Ann', timestamp: 5 }]);
      const contactDbSrv = fakeContactDbSrv();
      sync.status.mockResolvedValue(conflictingStatus(5));
      scriptRemoteRows([
        { id: 'c1', mail: 'ann@3nweb.com', name: 'Ann', timestamp: 5 },
        { id: 'c2', mail: 'bob@3nweb.com', name: 'Bob', timestamp: 6 },
      ]);

      await handleDbFileSyncStatus({
        fs,
        sqlite: sqlite as never,
        contactDbSrv: contactDbSrv as never,
        emitStorageEvent: () => undefined,
      });

      const [resolvedList] = contactDbSrv.updateContactsTable.mock.calls[0] as unknown as [
        { id: string; mail: string; name?: string }[],
      ];
      expect(resolvedList.map(c => c.mail).sort())
      .toEqual(['ann@3nweb.com', 'bob@3nweb.com']);
      expect(resolvedList.every(c => Object.keys(c).every(k => !/^\d+$/.test(k)))).toBe(true);
      expect(resolvedList.find(c => c.mail === 'bob@3nweb.com')!.name).toBe('Bob');
    });

    it('reads the remote db bytes at the conflicting remote version', async () => {
      const { fs, sync, v } = makeFakeFs();
      sync.status.mockResolvedValue(conflictingStatus(11));
      scriptRemoteRows([]);

      await handleDbFileSyncStatus({
        fs,
        sqlite: fakeSqlite([]) as never,
        contactDbSrv: fakeContactDbSrv() as never,
        emitStorageEvent: () => undefined,
      });

      expect(v.readBytes).toHaveBeenCalledWith(
        CONTACTS_DB_FILE, undefined, undefined, { remoteVersion: 11 },
      );
    });

    it('announces the new list either way', async () => {
      const { fs, sync } = makeFakeFs();
      const collector = makeEventCollector();
      sync.status.mockResolvedValue(conflictingStatus(5));
      scriptRemoteRows([]);

      await handleDbFileSyncStatus({
        fs,
        sqlite: fakeSqlite([]) as never,
        contactDbSrv: fakeContactDbSrv() as never,
        emitStorageEvent: collector.emitStorageEvent,
      });

      expect(collector.names()).toContain('update:contact-list');
    });

  });

  it('leaves a synced file alone', async () => {
    const { fs, sync } = makeFakeFs();
    const sqlite = fakeSqlite([]);
    const collector = makeEventCollector();
    sync.status.mockResolvedValue({ state: 'synced', synced: { latest: 3 } });

    await handleDbFileSyncStatus({
      fs,
      sqlite: sqlite as never,
      contactDbSrv: fakeContactDbSrv() as never,
      emitStorageEvent: collector.emitStorageEvent,
    });

    expect(sync.startUpload).not.toHaveBeenCalled();
    expect(sync.adoptRemote).not.toHaveBeenCalled();
    expect(sqlite.reloadDb).not.toHaveBeenCalled();
    expect(collector.events).toEqual([]);
  });

});
