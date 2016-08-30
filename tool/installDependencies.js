import { spawn } from 'child-process-promise';
import path from 'path';
import Promise from 'bluebird';
import gutil, { colors } from 'gulp-util';
import fsp from 'fs-promise';
import { Map } from 'immutable';
import uuid from 'node-uuid';

const logError = (folder, err) => {
  const location = colors.bold(colors.bgRed(colors.white(folder)));
  const type = colors.bold(colors.bgRed(colors.white('ERROR')));
  gutil.log('\n\n\n', type, location, colors.bgRed(colors.white(err)), '\n\n');
};

export default async function installDependencies(args) {
  const { cwd, folders, libraries, logging = true, runParallel = true } = args;

  const libs = libraries.reduce((libs, lib) => libs.set(path.basename(lib), lib), Map()).toJS();

  const log = (folder, eventType, promise) => {
    if (logging) {
      const location = colors.bold(colors.bgBlack(colors.white(folder)));
      const type = colors.bold(colors.bgBlack(colors.green(eventType)));
      promise.childProcess.stdout.on('data', (data) =>
        gutil.log(type, location, data.toString().trim())
      );
      promise.childProcess.stderr.on('data', (data) =>
        gutil.log(type, location, colors.bgBlack(colors.red(data.toString().trim())))
      );
    }

    return promise.catch((err) => {
      logError(folder, err.message);
      return err;
    });
  };

  const run = async (folder) => {
    const {
      libraryDependencies = []
    } = JSON.parse(await fsp.readFile(path.join(folder, 'package.json')));

    await Promise.all(
      libraryDependencies
      .map((lib) => {
        logError(folder, `${lib} requested in ${folder}`);
        return lib;
      })
      .map((lib) =>
        log(`${lib}__${folder}`, 'LIB',
          spawn('npm', [
            'link',
            path.relative(path.join(cwd, folder), path.join(cwd, libs[lib]))
          ], {
            cwd: path.join(cwd, folder)
          })
        )
      )
    );

    const npmPromise = spawn('npm', ['i']);
    await log(folder, 'NPM', npmPromise);

    const dockerPromise = spawn('docker', [
      'run',
      '-v', `${path.join(cwd, folder)}:/var/task`,
      '--rm',
      '--name',
      `aws-lambda-rebuild__${folder.split('/').join('-')}__${uuid.v4()}`,
      'lambci/lambda:build'
    ]);

    await log(folder, 'DOCKER', dockerPromise);
  };

  if (runParallel) {
    return Promise.all(
      folders.map(run)
    );
  }
  for (const folder of folders) {
    await run(folder);
  }
}
