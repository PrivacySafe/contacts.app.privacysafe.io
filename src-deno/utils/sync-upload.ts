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
import type { ContactEvent } from '../../src/types/index.ts';

export async function syncUpload({ fs, path, opts, emitStorageEvent, immediately }: {
  fs: web3n.files.WritableFS;
  path: string;
  opts?: web3n.files.OptionsToUploadLocal;
  emitStorageEvent: (event: ContactEvent) => void;
  immediately?: boolean;
}): Promise<{ uploadVersion: number; uploadTaskId: number } | number | undefined> {
  try {
    emitStorageEvent({
      event: 'sync:start',
      payload: { path: path || 'root' },
    });

    if (immediately) {
      const res = await fs.v?.sync?.upload(path, opts);
      emitStorageEvent({
        event: 'sync:end',
        payload: { path: path || 'root' },
      });
      return res;
    }

    return fs.v?.sync?.startUpload(path, opts);
  } catch (err) {
    if ((err as web3n.ConnectException).type === 'connect') {
      return undefined;
    }

    if ((err as web3n.files.FSSyncException).type === 'fs-sync' && (err as web3n.files.FSSyncException).childNeverUploaded) {
      setTimeout(() => {
        syncUpload({ fs, path, opts, emitStorageEvent, immediately });
      }, 10000);
      return undefined;
    }

    emitStorageEvent({
      event: 'sync:end',
      payload: {
        path: path || 'root',
        ...(!!err && { error: (err as web3n.files.FSSyncException).message || JSON.stringify(err) }),
      },
    });

    throw err;
  }
}
