/**
 * Created by su9er on 16/8/4.
 */
var config = require('./config')
const fs = require('fs');
const shelljs = require('shelljs')
const path = require('path');
const gulp = require('gulp');
const sass = require('gulp-sass');
const buffer = require('vinyl-buffer');
const spritesmith = require('gulp.spritesmith');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const browserSync = require('browser-sync');
const copy = require('gulp-copy')
const postcss = require('gulp-postcss')
const autoprefixer = require('autoprefixer')
const rename = require('gulp-rename')
const eslint = require('gulp-eslint')
const gulpIf = require('gulp-if')
const colors = require('colors')
const uglify = require('gulp-uglify')
const rev = require('gulp-rev')
const revReplace = require('gulp-rev-replace')
const replace = require('gulp-replace')
const clean = require('gulp-clean')
const  runSequence = require('run-sequence')

const isProd = process.env.NODE_ENV == 'production';
config = isProd ? config.build : config.dev

function isFixed(file) {
    return file.eslint != null && file.eslint.fixed
}

const browserslist = ['ie >= 8', 'Firefox >= 20', 'Chrome >= 30', '> 5%']
const spritesArray = [];
let tasks = [];

/* collectSpritesTask */
;(function() {
    config.sites.forEach(s => {
        let site = /src\/(\w+)/.exec(s.src)[1]
        fs.readdirSync(`${s.src}/images/sprites`).forEach((name) => {
            const spritesDir = path.resolve(`${s.src}/images/sprites/${name}`);
            const state = fs.lstatSync(spritesDir);
            if (state.isDirectory() && fs.readdirSync(spritesDir).length) {
                const gulpTask = `sprites:${site}:${name}`;
                spritesArray.push(gulpTask);
                //合成的图片
                gulp.task(gulpTask, () => {
                    const spritesData = gulp.src(path.resolve(spritesDir, './*.png'))
                    .pipe(spritesmith({
                        imgName: `${name}_icon.png`,
                        imgPath: `/img/${name}/${name}_icon.png`,
                        cssName: `_${name}_icon.scss`,
                        padding: 2
                    }));
                    spritesData.css
                    .pipe(gulp.dest(path.resolve(__dirname, './src/scss/')));
                    spritesData.img
                    .pipe(gulpIf(isProd, buffer()))
                    .pipe(gulpIf(isProd, imagemin()))
                    .pipe(gulpIf(isProd, rev()))
                    .pipe(gulp.dest(`${s.des}/img/${name}`))
                    .pipe(gulpIf(isProd, rev.manifest({
                        path: './rev-manifest.json',
                        merge: true
                    })))
                    .pipe(gulpIf(isProd, gulp.dest('./')))
                });
            }
        })
    })
})();

gulp.task('sprites', spritesArray);

//编译不需要合并成雪碧图的图片
gulp.task('moveImg', () => {
    return gulp.src(['./src/order/images/sprites/*.{png,jpg,gif}'])
    .pipe(gulpIf(isProd, buffer()))
    .pipe(gulpIf(isProd, imagemin()))
    .pipe(gulpIf(isProd, rev()))
    .pipe(gulp.dest(`${config.sites[0].des}/img/`))
    .pipe(gulpIf(isProd, rev.manifest({
        path: './rev-manifest.json',
        merge: true
    })))
    .pipe(gulpIf(isProd, gulp.dest('./')))
})

// 公共scss编译
gulp.task('scss', () => {
    let manifest = gulp.src('./rev-manifest.json');
    let files = gulp.src('./src/scss/*.scss')
    .pipe(sass({
        outputStyle: config.production ? 'compressed' : 'expanded'
    }).on('error', sass.logError))
    .pipe(postcss([autoprefixer({browsers: browserslist})]))
    config.sites.forEach(s => {
        files
        .pipe(gulpIf(isProd, revReplace({manifest: manifest})))
        .pipe(gulpIf(isProd, rev()))
        .pipe(gulp.dest(`${s.des}/css`))
        .pipe(gulpIf(isProd, rev.manifest({
            path: './rev-manifest.json',
            merge: true
        })))
        .pipe(gulpIf(isProd, gulp.dest('./')))
    })
})
gulp.task('scss:watch', () => {
    gulp.watch('./src/scss/*.scss', ['scss'])
})

//移动handlebars模板help文件
gulp.task('helper', () => {
    let manifest = gulp.src('./rev-manifest.json');
    return gulp.src(`./index.js`)
    .pipe(gulpIf(isProd, revReplace({manifest: manifest})))
    .pipe(gulp.dest(path.resolve(config.sites[0].des, `../views/help/`)));
})
gulp.task('helper:watch', () => {
    gulp.watch('./index.js', ['helper'])
})

config.sites.forEach(s => {
    let name = /src\/(\w+)/.exec(s.src)[1]

    // 页面scss编译
    gulp.task(`${name}:scss`, () => {
        let manifest = gulp.src('./rev-manifest.json');
        return gulp.src(`./${s.src}/**/*.scss`, {base: `./${s.src}/**/`})
        .pipe(sass({
            outputStyle: config.production ? 'compressed' : 'expanded'
        }).on('error', sass.logError))
        .pipe(postcss([autoprefixer({browsers: browserslist})]))
        .pipe(rename((path) => {
            path.dirname = ''
        }))
        .pipe(gulpIf(isProd, revReplace({manifest: manifest})))
        .pipe(gulpIf(isProd, rev()))
        .pipe(gulp.dest(`${config.sites[0].des}/css`))
        .pipe(gulpIf(isProd, rev.manifest({
            path: './rev-manifest.json',
            merge: true
        })))
        .pipe(gulpIf(isProd, gulp.dest('./')))
    })
    gulp.task(`${name}:scss:watch`, () => {
        gulp.watch(`./${s.src}/**/*.scss`, [`${name}:scss`])
        console.log(colors.cyan(`watch ${name} scss`))
    })

    //移动scss文件夹下的其他文件
    gulp.task(`htc move`, () => {
        return gulp.src(['./src/scss/**/*', '!./src/scss/*.scss'])
        .pipe(gulp.dest(`${s.des}/css`))
    })

    // 移动view 视图文件
    gulp.task(`${name}:view`, () => {
        return gulp.src(`./${s.src}/**/*.hbs`)
        .pipe(copy(s.view, {prefix: 3}))
    })
    gulp.task(`${name}:view:watch`, () => {
        gulp.watch(`./${s.src}/**/*.hbs`, [`${name}:view`])
        console.log(colors.cyan(`watch ${name} view`));
    })

    // 移动页面js
    gulp.task(`${name}:js`, () => {
        let manifest = gulp.src('./rev-manifest.json');
        return  gulp.src(`./${s.src}/**/*.js`)
        .pipe(eslint({fix:true}))
        .pipe(eslint.format())
        .pipe(gulpIf(isFixed, gulp.dest((p) => p.base)))
        .pipe(eslint.failAfterError())
        .pipe(rename((path) => {
            path.dirname = ''
        }))
        .pipe(gulpIf(isProd, revReplace({manifest: manifest})))
        .pipe(gulpIf(isProd, rev()))
        .pipe(gulpIf(isProd, uglify({
            ie8: true
        })))
        .pipe(gulp.dest(`${s.des}/js`))
        .pipe(gulpIf(isProd, rev.manifest({
            path: './rev-manifest.json',
            merge: true
        })))
        .pipe(gulpIf(isProd, gulp.dest('./')))
    })
    gulp.task(`${name}:js:watch`, () => {
        gulp.watch(`./${s.src}/**/*.js`, [`${name}:js`])
        console.log(colors.cyan(`watch ${name} js`));
    })

    //开发打包
    gulp.task(`dev:${name}`, (done) => {
        return runSequence(
                'clean',
                'sprites',
                'moveImg',
                'helper',
                'helper:watch',
                [`${name}:scss`, `${name}:view`, `${name}:js`, 'scss', 'scss:watch','htc move', `${name}:scss:watch`, `${name}:view:watch`, `${name}:js:watch`, 'js move', 'js move:watch', 'partial:view', 'partial:view:watch'],
                done
        )
    })

    //生产打包
    gulp.task(`publish`, (done) => {
        return runSequence(
                'clean',
                'sprites',
                'moveImg',
                `${name}:js`,
                'js move',
                'helper',
                'scss',
                `${name}:scss`,
                'htc move',
                'modifyRSConfig',
                'confighash',
                'manifestPl',
                done
        )
    } ) //把修改推到版本文件夹里

    tasks.push(`dev:${name}`)
})

// 移动view 视图文件
gulp.task('partial:view', () => {
    let files = gulp.src('./src/partials/*.hbs')
    config.sites.forEach(s => {
        files.pipe(copy(s.view, {prefix: 3}))
    })
})
gulp.task('partial:view:watch', () => {
    gulp.watch('./src/partials/*.hbs', ['partial:view'])
})

// 移动js第三方库和组件
gulp.task('js move', () => {
    let manifest = gulp.src('./rev-manifest.json');
    let files = gulp.src(['./src/components/*.js'])
    let file = gulp.src(['./src/components/**/*', '!./src/components/*.js'])
    config.sites.forEach(s => {
        files
        .pipe(gulpIf(isProd, revReplace({manifest: manifest})))
        .pipe(gulpIf(isProd, rev()))
        .pipe(gulpIf(isProd, uglify({
            ie8: true
        })))
        .pipe(gulp.dest(config.sites[0].des + `/components/`))
        .pipe(gulpIf(isProd, rev.manifest({
            path: './rev-manifest.json',
            merge: true
        })))
        .pipe(gulpIf(isProd, gulp.dest('./')))
        file.pipe(gulp.dest(config.sites[0].des + `/components/`))
    })
    files = gulp.src(['./src/lib/*.js', '!./src/lib/topbar.last.js']);
    file = gulp.src(['./src/lib/**/*','!./src/lib/*.js']);
    config.sites.forEach(s => {
        files
        .pipe(gulpIf(isProd, uglify({
            ie8: true
        })))
        .pipe(gulp.dest(config.sites[0].des + `/lib/`))
        gulp.src(['./src/lib/topbar.last.js'])
        .pipe(gulp.dest(config.sites[0].des + `/lib/`))
        file.pipe(gulp.dest(config.sites[0].des + `/lib/`))
    })
})
gulp.task('js move:watch', () => {
    gulp.watch(['./src/components/**/*', './src/lib/**/*'], ['js move'])
})

gulp.task('clean', () => {  //清理版本号文件夹里的文件
    return gulp.src([config.sites[0].des + `/img/*`,
        config.sites[0].des + `/css/*.css`,
        config.sites[0].des + `/components/*.js`,
        config.sites[0].des + `/js/*.js`,
        '!' + config.sites[0].des + `/img/mx`], {read:false})
    .pipe(clean({force: true}));
})


//替换requirejs.config.js文件内容
gulp.task('modifyRSConfig', () => {
    let data = fs.readFileSync("./src/components/require.config.js", "utf-8");
    let revManifest = fs.readFileSync("./rev-manifest.json", "utf-8");
    revManifest = JSON.parse(revManifest)
    for (let i in revManifest) {             //替换requirejs文件里的hash名称
        if (i.indexOf('.js') !== -1) {
            var name = i.split('.')[0];
            var match = new RegExp("components/" + name, 'mg');
            if (match.test(data)) {
                data = data.replace(match, "components/" + revManifest[i].split('.js')[0]);
            }
        }
    }
    return fs.writeFileSync(config.sites[0].des + '/components/require.config.js', data);
});

//requirejs.config.js添加hash
gulp.task('confighash', () => {
    let manifest = gulp.src('./rev-manifest.json');
    return gulp.src([config.sites[0].des  + '/components/require.config.js'])
    .pipe(revReplace({manifest: manifest}))
    .pipe(rev())
    .pipe(uglify({
        ie8: true
    }))
    .pipe(gulp.dest(config.sites[0].des +`/components/`))
    .pipe(rev.manifest({
        path: './rev-manifest.json',
        merge: true
    }))
    .pipe(gulp.dest('./'))
});

//替换 页面hash名
gulp.task('manifestPl', () => {
    let manifest = gulp.src('./rev-manifest.json');
    let arr = ['./src/partials/*.hbs'];
    config.sites.forEach(e => arr.push(`./${e.src}/**/*.hbs`));
    let files = gulp.src(arr);
    return config.sites.forEach(s => {
        files.pipe(revReplace({manifest: manifest}))
        .pipe(rename(function (path) {
            path.dirname = '';
        }))
        .pipe(gulp.dest(s.view))
    })
})
