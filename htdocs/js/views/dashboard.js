define([
    'backbone',
    'jquery',
    'underscore',
    'devkit',

    'text!templates/dashboard.html',
], function(backbone, $, _, devkit, tpl) {
    return backbone.View.extend({
        el: '#content',

        initialize: function() {
            this.render();
        },

        render: function() {
            var info = devkit.info();
            this.cTpl = _.template(tpl);

            var date = new Date(info.finished_at*1000);
            var minutes = "0" + date.getMinutes();
            var hours = "0" + date.getHours();
            var formatted = date.getDay()+"."+date.getMonth()+"."+date.getFullYear()+" - "+hours.substr(-2)+":"+minutes.substr(-2);


            this.$el.html(this.cTpl({
                id: info.matchid,
                mode: devkit.mode_str(info.mode),
                league: (info.leagueid == 0) ? "None" : info.leagueid,
                duration: Math.floor(info.playback_time / 60)+":"+(Math.floor(info.playback_time) % 60),
                date: formatted,

                // dire team
                dire: _.map(info.team_dire, function (ele) {
                    var tmp = _.clone(ele);
                    tmp.hero = tmp.hero.substr(14);
                    return tmp;
                }),

                // radiant team
                radiant: _.map(info.team_radiant, function (ele) {
                    var tmp = _.clone(ele);
                    tmp.hero = tmp.hero.substr(14);
                    return tmp;
                })
            }));
        }
    });
});
