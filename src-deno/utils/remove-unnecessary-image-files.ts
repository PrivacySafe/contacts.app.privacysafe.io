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
import { IMAGES_FOLDER } from '../constants.ts';
import type { ContactEvent } from '../../src/types/index.ts';
import { syncUpload } from '../utils/sync-upload.ts';

export async function removeUnnecessaryImageFiles(
  fs: web3n.files.WritableFS,
  getIdsOfAllFilesInUse: () => string[],
  emitStorageEvent: (event: ContactEvent) => void,
): Promise<void> {
  const res = getIdsOfAllFilesInUse();
  const imageFilesInUse = res.reduce((res, fId) => {
    res.push(fId);
    res.push(`${fId}-mini`);
    return res;
  }, [] as string[]);

  const imagesFolderList = await fs.listFolder(IMAGES_FOLDER);
  const imagesOnFs = (imagesFolderList || []).reduce((res, entry) => {
    const { isFile, name } = entry;
    if (isFile) {
      res.push(name);
    }
    return res;
  }, [] as string[]);

  const unnecessaryImageFiles = imagesOnFs.filter(fId => !imageFilesInUse.includes(fId));
  console.log('🔵 REMOVE UNNECESSARY IMAGE FILES => ', JSON.stringify(unnecessaryImageFiles, null, 2));
  if (Array.isArray(unnecessaryImageFiles) && unnecessaryImageFiles.length > 0 ) {
    const promises = [] as Promise<void>[];
    for (const imageId of unnecessaryImageFiles) {
      promises.push(fs.deleteFile(`${IMAGES_FOLDER}/${imageId}`));
    }
    await Promise.allSettled(promises);

    await syncUpload({
      fs,
      path: IMAGES_FOLDER,
      emitStorageEvent,
      immediately: true,
    });
  }
}
