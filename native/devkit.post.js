// List of exported functions
var ptr_open = Module.cwrap('devkit_open', undefined, ['string', 'number']);
var ptr_parse = Module.cwrap('devkit_parse', 'number', ['number']);
var ptr_seek = Module.cwrap('devkit_seek', undefined, ['number']);
var ptr_status = Module.cwrap('devkit_status', undefined, []);
var ptr_classes = Module.cwrap('devkit_classes', undefined, []);
var ptr_baselines = Module.cwrap('devkit_baselines', undefined, []);
var ptr_entities = Module.cwrap('devkit_entities', undefined, []);
var ptr_entity = Module.cwrap('devkit_entity', undefined, ['number']);
var ptr_stringtables = Module.cwrap('devkit_stringtables', undefined, []);
var ptr_stringtable = Module.cwrap('devkit_stringtable', undefined, ['number']);
var ptr_scoreboard = Module.cwrap('devkit_scoreboard', undefined, []);
var ptr_close = Module.cwrap('devkit_close', undefined, []);
var ptr_subscribe = Module.cwrap('devkit_subscribe', undefined, ['number', 'number']);
var ptr_unsubscribe = Module.cwrap('devkit_unsubscribe', undefined, ['number', 'number']);

// Callback types
var cb_map = [
    'open', 'parse', 'seek', 'status', 'classes', 'baselines', 'entities', 'entity',
    'stringtables', 'stringtable', 'scoreboard', 'close', 'progress', 'subscribe',
    'unsubscribe', 'audio'
];

// onInit
Module['onRuntimeInitialized'] = function() {
    // tell the client we have initialized everything
    postMessage({'ev': 'init'});
}

// onCallback
function callback(type, data) {
    if (type != 12) {
        //console.log("[WebWorker] Emitting message: "+cb_map[type]);
    }

    var msg = JSON.parse(Module.Pointer_stringify(data));
    postMessage({'ev': cb_map[type], 'data': msg});

    if (type == 0) {
        tickrate = msg['tickrate'];
    }
}

// play / pause
var ptimeout = null;
var playing = false;
var pseek = false;

function play() {
    var sleep = ptr_parse(1) - 5;

    if (sleep < 0) {
        play();
    } else {
        ptimeout = setTimeout(play, sleep-5);
    }
}

function pause() {
    playing = false;
    clearTimeout(ptimeout);
    ptimeout = null;
}

// onMessage
onmessage = function (msg) {
    console.log("[WebWorker] Received message: ", msg.data.ev);

    switch (msg.data.ev) {
        // load the replay
        case 'load': {
            var fs = new FileReaderSync();
            FS.writeFile("/replay.dem", new Uint8Array(fs.readAsArrayBuffer(msg.data.file)), {encoding: 'binary'});
            ptr_open("/replay.dem", Module.Runtime.addFunction(callback));
            delete fs;
        } break;

        // parse messages
        case 'parse': {
            ptr_parse(msg.data.packets);
        } break;

        // seek to the given position
        case 'seek': {
            ptr_seek(msg.data.time);
        } break;

        // toggle the playback state
        case 'play_toggle': {
            if (!playing) {
                postMessage({'ev': 'playback_state', data: {state: 'play'}});
                playing = true;
                play();
            } else {
                postMessage({'ev': 'playback_state', data: {state: 'pause'}});
                playing = false;
                pause();
            }
        } break;

        // return list of entities
        case 'entities': {
            ptr_entities();
        } break;

        // return single entity
        case 'entity': {
            ptr_entity(msg.data.id);
        } break;

        // return list of stringtables
        case 'stringtables': {
            ptr_stringtables();
        } break;

        // return single stringtable
        case 'stringtable': {
            ptr_stringtable(msg.data.id);
        } break;

        // subscribe to changes
        case 'subscribe': {
            ptr_subscribe(msg.data.type, msg.data.id);
        } break;

        // unsubscribe from changes
        case 'unsubscribe': {
            ptr_unsubscribe(msg.data.type, msg.data.id);
        } break;

        default:
            console.log("[WebWorker] Unkown action "+msg.data.ev);
            break;
    }
}
