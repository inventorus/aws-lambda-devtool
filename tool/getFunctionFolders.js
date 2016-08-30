import rawGlob from 'glob';
import Promise from 'bluebird';
import path from 'path';

const glob = Promise.promisify(rawGlob);

export default async function getFunctionFolders(args) {
  const { rootFolder, folderPattern = '**/package.json' } = args;
  return (
    await glob(folderPattern, {
      cwd: rootFolder,
      ignore: ['**/node_modules/**']
    })
  )
  .map((file) => path.dirname(file))
  .map((folder) => path.join(rootFolder, folder));
}
