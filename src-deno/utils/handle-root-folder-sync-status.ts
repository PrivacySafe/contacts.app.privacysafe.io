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
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ContactEvent } from '../../src/types/index.ts';
import { SQLiteOn3NStorage } from '../../shared-libs/sqlite-on-3nstorage';
import { syncUpload } from '../utils/sync-upload.ts';
import { syncAdopt } from '../utils/sync-adopt.ts';
import { ContactDB } from '../dataset/contacts-db.ts';

export async function handleRootFolderSyncStatus(
  fs: web3n.files.WritableFS,
  sqlite: SQLiteOn3NStorage,
  emitStorageEvent: (event: ContactEvent) => void,
  contactDbSrv: ContactDB,
) {
  const folderSyncStatus = await fs.v?.sync?.status('');
  // console.log('🔔 handleRootFolderSyncStatus => ', folderSyncStatus ? JSON.stringify(folderSyncStatus) : '👎');
  if (folderSyncStatus) {
    // eslint-disable-next-line default-case
    switch (folderSyncStatus.state) {
      case 'unsynced': {
        await syncUpload({
          fs,
          path: '',
          emitStorageEvent,
          immediately: true,
        });
        break;
      }

      case 'behind': {
        await syncAdopt({
          fs,
          path: '',
          opts: { remoteVersion: folderSyncStatus.remote!.latest },
          emitStorageEvent,
        });
        break;
      }

      case 'conflicting': {
        const diff = await fs.v?.sync?.diffCurrentAndRemoteFolderVersions('', folderSyncStatus.remote!.latest!)
        console.log('🔔 ROOT FOLDER CONFLICT. ', JSON.stringify(diff, null, 2));
        break;
      }
    }
  }
}
