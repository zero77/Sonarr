const gulp = require('gulp');
const print = require('gulp-print').default;
const paths = require('./helpers/paths.js');

gulp.task('imageMin', () => {
  const imagemin = require('gulp-imagemin');
  return gulp.src(paths.src.images)
    .pipe(imagemin({
      progressive: false,
      optimizationLevel: 4,
      svgoPlugins: [{ removeViewBox: false }]
    }))
    .pipe(print())
    .pipe(gulp.dest(`${paths.src.content}Images/`));
});
