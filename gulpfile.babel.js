import gulp from 'gulp';
import gutil from 'gulp-util';
import config from './config';

import installDependencies from './tool/installDependencies';
import getFunctionFolders from './tool/getFunctionFolders';
import getLibraryFolders from './tool/getLibraryFolders';

gulp.task('default', () => {
  gutil.log(config);
});


gulp.task('ild', async () => { // install library dependencies
  const libraries = await getLibraryFolders({
    rootFolder: 'lib'
  });
  await installDependencies({
    cwd: process.cwd(),
    folders: libraries,
    libraries
  });
});


gulp.task('ifd', async () => { // install function dependencies
  const folders = await getFunctionFolders({
    rootFolder: 'src'
  });
  const libraries = await getLibraryFolders({
    rootFolder: 'lib'
  });
  await installDependencies({
    cwd: process.cwd(),
    folders,
    libraries
  });
});
