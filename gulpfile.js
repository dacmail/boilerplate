var gulp = require("gulp"),
  rename = require("gulp-rename"),
  argv = require("yargs").argv,
  gulpif = require("gulp-if"),
  log = require("fancy-log"),
  cached = require("gulp-cached"),
  stripDebug = require("gulp-strip-debug"),
  chalk = require("chalk"),
  sourcemaps = require("gulp-sourcemaps"),
  php2html = require("gulp-php2html"),
  htmlmin = require("gulp-htmlmin"),
  browserSync = require("browser-sync"),
  del = require("del"),
  sass = require("gulp-sass"),
  cleanCSS = require("gulp-clean-css"),
  autoprefixer = require("gulp-autoprefixer"),
  sassInheritance = require("gulp-sass-multi-inheritance"),
  uglify = require("gulp-uglify"),
  include = require("gulp-include"),
  babel = require("gulp-babel"),
  imagemin = require("gulp-imagemin");


var folderScripts = "src/assets/scripts",
  folderStyles = "src/assets/styles",
  folderImages = "src/assets/images",
  folderFonts = "src/assets/fonts",
  folderVendor = "src/assets/vendor",
  srcScss = [folderStyles + "/**/*.scss", "!" + folderStyles + "/**/_*.scss"],
  srcJs = [
    folderScripts + "/**/*.js",
    "!" + folderScripts + "/**/_*.js",
    "!" + folderScripts + "/**/*.min.js"
  ];

function logEnv() {
  var chWarn = chalk.bold.red,
    chGood = chalk.bold.green,
    envv = argv.production ? chGood("production") : chWarn("development");

  console.log("Environment: " + envv);
}

function scripts(cb) {
  gulp
    .src(srcJs)
    .pipe(gulpif(!argv.production, sourcemaps.init()))
    .pipe(include())
    .pipe(babel({ presets: ["env"], compact: false }))
    .pipe(gulpif(argv.production, stripDebug()))
    .pipe(gulpif(argv.production, uglify().on("error", log)))
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulpif(global.isWatching, cached("cachedPlace")))
    .pipe(gulpif(!argv.production, sourcemaps.write()))
    .pipe(gulp.dest("dist/scripts/"))
    .pipe(browserSync.stream());
  cb();
}

function scss(cb) {
  gulp
    .src(srcScss)
    .pipe(gulpif(!argv.production, sourcemaps.init()))
    .pipe(sass
        .sync({ outputStyle: "expanded", precision: 10, includePaths: ["."] })
        .on("error", sass.logError))
    .pipe(gulpif(argv.production, autoprefixer({ browsers: ['> 1%', 'last 2 versions', 'Firefox ESR'] })))
    .pipe(gulpif(argv.production, cleanCSS({ compatibility: "ie9" })))
    .pipe(gulpif(!argv.production, cleanCSS({ compatibility: "ie9", advanced: false })))
    .pipe(gulpif(global.isWatching, cached("cachedPlace")))
    .pipe(gulpif(!argv.production, sourcemaps.write()))
    .pipe(gulp.dest("dist/styles/"))
    .pipe(browserSync.stream());
  cb();
}

function scssPartials(cb) {
  return gulp
    .src("src/**/*.scss")
    .pipe(gulpif(global.isWatching, cached(srcScss)))
    .pipe(sassInheritance({ dir: "src" }).on("error", log));
  cb();
}

function genHTML(cb) {
  gulp
    .src(["src/**/*.php", "!src/**/_*.php"])
    .pipe(php2html())
    .pipe(gulpif(argv.production, htmlmin({ collapseWhitespace: true })))
    .on("error", console.error)
    .pipe(gulp.dest("dist/"));
  cb();
}

function images(cb) {
  return gulp
    .src(folderImages + "/**/*")
    .pipe(imagemin())
    .pipe(gulp.dest("dist/images"));
  cb();
}

function fonts(cb) {
  return gulp
    .src(folderFonts + "/**/*.{ttf,woff,eot,svg}")
    .pipe(gulp.dest("dist/fonts"));
  cb();
}

function vendor(cb) {
  return gulp
    .src(folderVendor + "/**/*")
    .pipe(gulp.dest("dist/vendor"));
  cb();
}

function bSync(cb) {
  browserSync({
    server: {
      baseDir: "./dist/"
    },
    notify: false,
    open: false,
    ghostMode: false
  });

  gulp.watch(folderScripts + "/**/*.js", gulp.parallel(scripts));
  gulp.watch(folderStyles + "/**/*.scss", gulp.parallel(scss));
  gulp.watch(folderImages + "/**/*", gulp.parallel(images));
  gulp.watch(folderFonts + "/**/**.{ttf,woff,eot,svg}", gulp.parallel(fonts));
  gulp.watch(folderVendor + "/**/*", gulp.parallel(vendor));

  gulp.watch(["src/**/*.php"], gulp.parallel(genHTML));

  gulp
    .watch([
      "dist/index.html"
    ])
    .on("change", browserSync.reload);
  cb();
}

function setWatch(cb) {
  global.isWatching = true;
  cb();
};

function clean(cb) {
  del(['dist']);
  cb();
}

function runProd(cb) {
  argv.production = true;
  cb();
}

gulp.task(
  "start",
  gulp.series(clean, setWatch, scripts, scss, images, fonts, vendor, scssPartials, genHTML, bSync)
);

gulp.task(
  "build",
  gulp.series(clean, runProd, scripts, scss, images, fonts, vendor, genHTML)
);


