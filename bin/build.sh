#!/usr/bin/env bash

source /Users/rob/code/emscripten/emsdk_portable/emsdk_env.sh

BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/.."
SRCDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../../parser"

CXX="em++"
CPPFLAGS="-std=c++14 -O2 -I${SRCDIR}/include -I${SRCDIR}/vendor/protobuf/src -I${SRCDIR}/vendor/boolinq/include  -I${SRCDIR}/snappy -I${BASEDIR}/native/silk/interface"

DEPS="${SRCDIR}/vendor/protobuf-emscripten/2.6.1/src/.libs/libprotobuf.bc ${SRCDIR}/vendor/snappy/.libs/libsnappy.bc ${SRCDIR}/build/libsilk.bc ${SRCDIR}/build/libbutterfly.bc ${SRCDIR}/build/libtrie.bc"

${CXX} ${CPPFLAGS} ${BASEDIR}/native/app.cpp $DEPS --pre-js ${BASEDIR}/native/devkit.pre.js --post-js ${BASEDIR}/native/devkit.post.js \
    -s EXPORTED_FUNCTIONS="['_devkit_open','_devkit_parse','_devkit_seek','_devkit_status','_devkit_classes','_devkit_baselines', \
    '_devkit_entities','_devkit_entity','_devkit_stringtable','_devkit_stringtables','_devkit_scoreboard','_devkit_close', \
    '_devkit_subscribe', '_devkit_unsubscribe']" -Wno-c++11-narrowing\
    -s RESERVED_FUNCTION_POINTERS=5 -s ALLOW_MEMORY_GROWTH=1 -s SAFE_HEAP=1  \
    -o ${BASEDIR}/htdocs/js/butterfly/devkit.js
