const fs = require('fs')
const path = require('path')
const gulp = require('gulp')
const sass = require('gulp-sass')
const buffer = require('vinyl-buffer')
const spritesmith = require('gulp.spritesmith')
const pngquant = require('imagemin-pngquant')
const browserSync = require('browser-sync')
const gulpIf = require('gulp-if')
const imagemin = require('gulp-imagemin')


const spritesPath = path.resolve(__dirname, './src/assets/sprites');

const spritesArray = [];


/**
 * 收集spritesTask
 */
(function(dir) {
  fs.readdirSync(dir).forEach(name => {
    const spritesDir = path.resolve(spritesPath, `./${name}`);
    const state =  fs.lstatSync(spritesDir);
    
    if(state.isDirectory() && fs.readdirSync(spritesDir).length) {
      const gulpTask = `sprites:${name}`;
      
      spritesArray.push(gulpTask);
      
      gulp.task(gulpTask, () => {
        const spritesData = gulp.src(path.resolve(spritesDir, './*.png'))
                .pipe(spritesmith({
                  imgName: `${name}_icon.png`,
                  imgPath: `/img/${name}/${name}_icon.png`,
                  cssName: `_${name}_icon.scss`
                }));
        
        spritesData
          .css
          .pipe(gulp.dest(path.resolve(__dirname, './src/assets/css/')));
        
        spritesData
          .img
          .pipe(buffer())
          .pipe(imagemin())
          .pipe(gulp.dest(path.resolve(__dirname, `./static/img/${name}`)))
          .pipe(gulp.dest(path.resolve(__dirname, `../be/dist/static/img/${name}`)));
      });
    }
    
  })
})(spritesPath);

console.log(spritesArray)

gulp.task('sprites', spritesArray);

/**
 * 图片压缩
 */

 const imagesPath = path.resolve(__dirname, './src/assets/img');

 const imagesArray = [];

/**
 * 收集imagesTask
 */
(function (dir) { 
  fs.readdirSync(dir).forEach(name => {
    const imagesDir = path.resolve(imagesPath, `./${name}`);
    const state =  fs.lstatSync(imagesDir);

    if(state.isDirectory() && fs.readdirSync(imagesDir).length) {
      const gulpTask = `imagemin:${name}`;

      imagesArray.push(gulpTask);

      gulp.task(gulpTask, () => {
        gulp.src(path.resolve(imagesDir, './*'))
          .pipe(buffer())
          .pipe(imagemin([pngquant()]))
          .pipe(gulp.dest(path.resolve(__dirname, `./static/img/${name}`)))
          .pipe(gulp.dest(path.resolve(__dirname, `../be/dist/static/img/${name}`)));
      });
    }
  })
})(imagesPath);

console.log(imagesArray)


gulp.task('imagemin', imagesArray);

/**
 * scss:single  不依赖图片合并
 */

gulp.task('scss:single', () => {
  gulp
    .src(path.resolve(spritesPath, '../css/*.scss'))
    .pipe(sass({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(gulp.dest(path.resolve(__dirname, './static/css/')))
    .pipe(gulp.dest(path.resolve(__dirname, '../be/dist/static/css/')));

 })

gulp.task('scss', ['sprites'], () => {
  gulp
    .src(path.resolve(spritesPath, '../css/*.scss'))
    .pipe(sass({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(gulp.dest(path.resolve(__dirname, './static/css/')))
    .pipe(gulp.dest(path.resolve(__dirname, '../be/dist/static/css/')));
})

gulp.task('default', ['sprires', 'imagemin', 'sass']);