define([
    'backbone',
    'underscore'
], function(Backbone, _) {
    var model = Backbone.Model.extend({
        // defaults
        defaults: {
            time_cur: 0.0,      // current time
            time_pre: 0.0,      // picking done
            time_start: 0.0,    // horn
            time_max: 0.0,      // EOF
            time_all: 0.0       // playback length
        }
    });

    return new model();
});
