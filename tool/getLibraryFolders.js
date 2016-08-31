import rawGlob from 'glob';
import Promise from 'bluebird';
import path from 'path';
import fsp from 'fs-promise';
import { Map } from 'immutable';

const glob = Promise.promisify(rawGlob);

export default async function getLibraryFolders(args) {
  const { rootFolder, folderPattern = '*/package.json' } = args;
  return Promise.all(
    (
      await glob(folderPattern, {
        cwd: rootFolder
      })
    )
    .map((file) => path.join(rootFolder, file))
    .map((file) =>
      fsp.readFile(file)
          .then((data) => JSON.parse(data))
          .then(({ name }) => ({
            name,
            folder: path.dirname(file)
          }))
    )
  )
  .reduce((map, obj) =>
    map.set(obj.name, obj.folder)
  , Map());
}
