import gulp from 'gulp';
import gutil from 'gulp-util';
import config from './config';

gulp.task('default', () => {
  gutil.log(config);
});
