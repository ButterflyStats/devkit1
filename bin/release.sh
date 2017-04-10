#!/usr/bin/env bash

BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/.."

# make directory
echo " --- Create Directories"
mkdir -p $BASEDIR/release
mkdir -p $BASEDIR/release/css
mkdir -p $BASEDIR/release/js
mkdir -p $BASEDIR/release/node_modules

# create css
echo " --- Generate CSS"
sass $BASEDIR/htdocs/sass/app.scss:$BASEDIR/release/css/app.css

# build javascript
echo " --- Build JS"
$BASEDIR/htdocs/node_modules/requirejs/bin/r.js -o $BASEDIR/htdocs/js/main_release.js

echo " --- Copying JS"
cp $BASEDIR/htdocs/js/main-built.js $BASEDIR/release/js
cp -R $BASEDIR/htdocs/js/butterfly $BASEDIR/release/js

cp -R $BASEDIR/htdocs/node_modules/requirejs $BASEDIR/release/node_modules
cp -R $BASEDIR/htdocs/node_modules/bootstrap $BASEDIR/release/node_modules
cp -R $BASEDIR/htdocs/node_modules/font-awesome $BASEDIR/release/node_modules

echo " --- Copying Assets"
cp -R $BASEDIR/htdocs/assets $BASEDIR/release
cp -R $BASEDIR/htdocs/img $BASEDIR/release

echo " --- Copying HTML"
cp $BASEDIR/htdocs/index_release.html $BASEDIR/release/index.html

echo " --- DONE"
