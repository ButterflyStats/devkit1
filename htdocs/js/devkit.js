define([
    'backbone', 'underscore', 'models/devkit'
], function(Backbone, _, model) {
    var butterfly = null;
    var devkit = _.extend({}, Backbone.Events);

    // enums
    devkit.subscribe_entity = 0;
    devkit.subscribe_entitytype = 1;
    devkit.subscribe_stringtable = 2;
    devkit.subscribe_edelta = 3;
    devkit.subscribe_audio = 4;

    devkit.ent_default = 0;
    devkit.ent_ability = 1;
    devkit.ent_npc = 2;
    devkit.ent_hero = 3;
    devkit.ent_item = 4;
    devkit.ent_unit = 5;

    // initialize devkit
    devkit.init = function() {
        var self = this;

        butterfly = new Worker("js/butterfly/devkit.js");
        butterfly.onmessage = function(event) {
            self.trigger(event.data.ev, event.data);
        };

        this.once('open', function (data) {
            model.set('info', data.data);
            model.set('initialized', true);
            console.log("[Devkit] Marking as initialized");
        });

        this.on('seek', function(data) {
            this.trigger('playback_time', {data: {time: data.data.pos}});
        });

        this.on('parse', function(data) {
            this.trigger('playback_time', {data: {time: data.data.pos}});
        });

        this.on('playback_state', function(data) {
            if (data.state == 'play') {
                model.set('state', 'play');
            } else {
                model.set('state', 'pause');
            }
        });
    };

    // emit message to the webworker
    devkit.emit = function(event, data) {
        //console.log("[Devkit] Received: "+event, data);

        if (!data) data = {};

        data.ev = event;
        butterfly.postMessage(data);
    };

    // is the devkit ready?
    devkit.ready = function() {
        return model.get('initialized');
    };

    // Return game info
    devkit.info = function () {
        return model.get('info');
    };

    // Return active channel
    devkit.get_channel = function () {
        return model.get('active_channel');
    };

    // Set active channel
    devkit.set_channel = function (channel) {
        model.set('active_channel', channel);

        if (channel == -1) channel = 999; // special NULL channel
        devkit.emit('subscribe', {type: devkit.subscribe_audio, id: channel});
    };

    // Convert gamemode to string
    devkit.mode_str = function(mode) {
        switch (parseInt(mode)) {
        case 1: return "All Pick";
        case 2: return "Captains Mode";
        case 3: return "Random Draft";
        case 4: return "Single Draft";
        case 5: return "All Random";
        case 6: return "Intro (DEMO)";
        case 7: return "Diretide";
        case 8: return "Reverse Captains Mode";
        case 9: return "Greeviling";
        case 10: return "Tutorial";
        case 11: return "Mid Only";
        case 12: return "Least Played";
        case 13: return "Limited Pool";
        case 14: return "Compendium Pool";
        case 15: return "Custom Game";
        case 16: return "Captains Draft";
        case 17: return "Balanced Draft ";
        case 18: return "Ability Draft";
        case 19: return "Event";
        case 20: return "All Random Deathmatch";
        case 21: return "1v1 Mid";
        case 22: return "All Draft";
        default: return "Unkown ("+mode+")";
        }
    };

    // Demo implementation
    var devkit_demo = Object.create(devkit);

    devkit_demo.init = function() {
        this.trigger('open', {data: model.get('info')});

        this.once('open', function (data) {
            model.set('info', data.data);
            model.set('initialized', true);
            console.log("[Devkit] Marking as initialized");
        });
    };

    devkit_demo.emit = function(event, data) {
        console.log("Devkit received: "+event);

        switch (event) {
        case 'play_toggle': {
            var state = model.get('state');
            if (state == "pause") {
                model.set('state', 'play');
                this.trigger('playback_state', {data: {state: 'play'}});
            } else {
                model.set('state', 'pause');
                this.trigger('playback_state', {data: {state: 'pause'}});
            }
        } break;
        case 'seek':
            this.trigger('playback_time', {data: {time: data.time}});
            break;
        default:
            break;
        }
    };

    devkit_demo.ready = function() {
        return true;
    }

    if (window.demo) {
        return devkit_demo;
    } else {
        return devkit;
    }
});
