import fsp from 'fs-promise';
import rawGlob from 'glob';
import Promise from 'bluebird';
import { OrderedMap, Set } from 'immutable';
import path from 'path';
import crypto from 'crypto';

const glob = Promise.promisify(rawGlob);
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');

const findFiles = async (folder, libraries) => {
  const {
    localDependencies = []
  } = JSON.parse(await fsp.readFile(path.join(folder, 'package.json')));

  return Set(
    await glob('**/!(package.json)*.*', {
      cwd: folder,
      ignore: '**/node_modules/**'
    })
    .map((file) => path.join(folder, file))
  )
  .concat(...(
    await Promise.all(
      localDependencies
        .map((lib) => libraries.get(lib))
        .map((lib) => findFiles(lib, libraries))
    )
  ));
};

export default async function getFunctionChecksum({ folder, libraries }) {
  const hashes =
  (
    await Promise.all(
      (
        await findFiles(folder, libraries)
      )
      .map((file) =>
        fsp.readFile(file)
            .then((content) => ({ file, content }))
      )
    )
    .reduce((map, data) =>
      map.set(data.file, hash(data.content))
    , OrderedMap())
  )
  .sortBy((hash, file) => file);
  return hash(JSON.stringify(hashes));
}
