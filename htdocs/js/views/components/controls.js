/** Controls Component View */

define([
    'backbone',
    'underscore',
    'devkit',
    'models/control',

    'text!templates/components/controls_play.html',
    'text!templates/components/controls_slider.html'
], function(backbone, _, devkit, model, tpl_play, tpl_slider) {
    // format time
    function ftime(fl) {
        var afl = Math.abs(fl);
        var min = Math.floor(afl/60.0);
        var secs = Math.floor(afl%60);

        if (min < 10) min = "0"+Math.abs(min);
        if (secs < 10) secs = "0"+Math.abs(secs)

        if (fl > 0) return min+":"+secs;
        return "-"+min+":"+secs;
    }

    return backbone.View.extend({
        // attach events to the wrapper element
        el: '#wrapper',

        // renders bar and play button
        el1: $('#sidebar-controls'),
        el2: $('#controls'),

        seek_time: 0.0,     // active seek time

        events: {
            'click #sidebar-controls': 'on_playstate',
            'click .slider-progress-wrapper': 'on_seek',
            'mousemove .slider-progress-wrapper': 'on_hover',
            'mouseout .slider-progress-wrapper': 'on_hide'
        },

        // initialize replay controls
        initialize: function() {
            var self = this;
            this.tpl_play = _.template(tpl_play);
            this.tpl_slider = _.template(tpl_slider);

            // handle replay opening
            devkit.on('open', function(ev) {
                model.set({
                    time_pre: ev.data.time_pregame,
                    time_start: ev.data.time_game,
                    time_max: ev.data.playback_time - ev.data.time_game,
                    time_cur: -ev.data.time_game,
                    time_all: ev.data.playback_time
                });
            });

            // handle play / pause
            devkit.on('playback_state', function(ev) {
                if (ev.data.state == "play") {
                    $("#playbutton").attr("class", "img fa fa-pause");
                } else {
                    $("#playbutton").attr("class", "img fa fa-play");
                }
            });

            // handle time
            devkit.on('playback_time', function(ev) {
                model.set('time_cur', ev.data.time);
            });

            // update ui when active time changes
            model.on('change:time_cur', function(model) {
                var t = (model.get('time_cur')/model.get('time_all'))*100;
                var w = $(".slider-progress").width() / 100.0;

                $(".slider-progress-cur").width(Math.floor(t*w)+"px");
                $(".slider-time").html(ftime(model.get('time_cur')-model.get('time_start'))+" / "+ftime(model.get('time_max')));
            });
        },

        // render
        render: function() {
            this.el1.html( this.tpl_play({}) );
            this.el2.html( this.tpl_slider({
                cur: ftime(model.get('time_cur')),
                max: ftime(model.get('time_max'))
            }));
        },

        // play state
        on_playstate: function(ele) {
            devkit.emit('play_toggle');
        },

        // on hover
        on_hover: function(ele) {
            var t = $(ele.currentTarget);
            var offset_parent = $(t).parent().offset();
            var relX = ele.pageX - offset_parent.left - 110;

            if (relX > t.width()) {
                relX = t.width();
            }

            var tooltip = $(".slider .stooltip");

            // set time
            var per = (relX / t.width()) * 100;
            seek_time = ((model.get('time_all') / 100.0) * per);
            per = seek_time - model.get('time_start');

            // display
            tooltip.html(ftime(per));
            tooltip.css("left", ele.pageX - (tooltip.width()/2));
            tooltip.css("top", offset_parent.top - 34);
            tooltip.css("display", "block");
        },

        // on seek
        on_seek: function(els) {
            devkit.emit('seek', {time: seek_time});
        },

        // hide tooltip
        on_hide: function() {
            $(".slider .stooltip").css("display", "none");
        }
    });
});
