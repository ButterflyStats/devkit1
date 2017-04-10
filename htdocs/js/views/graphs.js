define([
    'backbone',
    'jquery',
    'underscore',
    'devkit',
    'chartjs',

    'text!templates/graphs.html',
], function(backbone, $, _, devkit, chart, tpl) {
    function ftime(fl) {
        var afl = Math.abs(fl);
        var min = Math.floor(afl/60.0);
        var secs = Math.floor(afl%60);

        if (min < 10) min = "0"+Math.abs(min);
        if (secs < 10) secs = "0"+Math.abs(secs)

        if (fl > 0) return min+":"+secs;
        return "-"+min+":"+secs;
    }

    var sub_id = 0;

    var chart_total = null;
    var chart_config_total = {};

    var chart_net = null;
    var chart_config_net = {};

    var chart_xp = null;
    var chart_config_xp = {};

    return backbone.View.extend({
        el: '#content',
        chart: null,

        events: {
            'click #graphs .chart_tab': 'on_tab'
        },

        initialize: function() {
            devkit.on('entities', this.handle_all);
            devkit.on('entity', this.handle_single);

            devkit.emit('entities', {});
            this.render();
        },

        close: function() {
            devkit.off('entities', this.handle_all);
            devkit.off('entity', this.handle_single);

            devkit.emit('unsubscribe', {type: devkit.subscribe_entity});
            devkit.emit('unsubscribe', {type: devkit.subscribe_entity, id: sub_id});
        },

        render: function () {
            this.cTpl = _.template(tpl);
            this.$el.html( this.cTpl({}) );

            // Initial chart config
            chart_config_total = {
                type: "line",
                data: {
                    labels: [],
                    datasets: []
                }, options: {
                    legend: {
                        display: false
                    }, animation: {
                        duration: 0
                    }
                }
            };

            chart_config_net = {
                type: "line",
                data: {
                    labels: [],
                    datasets: []
                }, options: {
                    legend: {
                        display: false
                    }, animation: {
                        duration: 0
                    }
                }
            };

            chart_config_xp = {
                type: "line",
                data: {
                    labels: [],
                    datasets: []
                }, options: {
                    legend: {
                        display: false
                    }, animation: {
                        duration: 0
                    }
                }
            };

            // render chart
            chart_total = new Chart($("#chart_total"), chart_config_total);
            chart_net = new Chart($("#chart_net"), chart_config_net);
            chart_xp = new Chart($("#chart_xp"), chart_config_xp);

            // hide tabs
            $("#chart_total").css("display", "none");
            $("#chart_xp").css("display", "none");
        },

        on_tab: function(ele) {
            var target = $(ele.currentTarget).data('target');

            $( "#graphs .chart_tab" ).removeClass("active");
            $(ele.currentTarget).addClass("active");

            $(".gchart").css("display", "none");
            $("#"+target).css("display", "block");
        },

        // refresh all
        handle_all: function(data) {
            if (sub_id != 0) {
                devkit.emit('entity', {id: sub_id});
                return;
            }

            _.each(data.data, function (ent) {
                if (ent.class == "CDOTASpectatorGraphManagerProxy") {
                    console.log("CDOTASpectatorGraphManagerProxy has entity ID "+ent.id);
                    sub_id = ent.id;

                    devkit.emit('entity', {id: ent.id});
                    devkit.emit('subscribe', {type: devkit.subscribe_entity, id: ent.id});
                }
            });
        },

        handle_single: function(data) {
            var data = data.data;

            // data
            var t_start = parseFloat(data.properties["m_pGraphManager.m_flTotalEarnedGoldStartTime"].value);
            var t_end = parseFloat(data.properties["m_pGraphManager.m_flTotalEarnedGoldEndTime"].value);
            var t_points = 64.0

            // m_pGraphManager.m_rgDireTotalEarnedGold.0
            // m_pGraphManager.m_rgDireNetWorth.0
            // m_pGraphManager.m_rgDireTotalEarnedXP.0

            // labels
            var step = (t_end - t_start) / t_points;
            var labels = [];
            var graph_total = [];
            var graph_net = [];
            var graph_xp = [];

            for (var i = 0; i < 64; ++i) {
                var t = Math.floor(t_start + (step*i));
                if (labels[i-1] == t) {
                    labels.push(null);
                } else {
                    labels.push(ftime(t));

                    graph_total.push(
                        parseInt(data.properties["m_pGraphManager.m_rgRadiantTotalEarnedGold."+i].value) - parseInt(data.properties["m_pGraphManager.m_rgDireTotalEarnedGold."+i].value)
                    );

                    graph_net.push(
                        parseInt(data.properties["m_pGraphManager.m_rgRadiantNetWorth."+i].value) - parseInt(data.properties["m_pGraphManager.m_rgDireNetWorth."+i].value)
                    );

                    graph_xp.push(
                        parseInt(data.properties["m_pGraphManager.m_rgRadiantTotalEarnedXP."+i].value) - parseInt(data.properties["m_pGraphManager.m_rgDireTotalEarnedXP."+i].value)
                    );
                }
            }

            chart_config_total.data = {
                labels: labels,
                datasets: [{
                    label: "Total Gold Earned Radiant",
                    data: graph_total,
                    fill: true,
                }]
            };

            chart_total.update();

            chart_config_net.data = {
                labels: labels,
                datasets: [{
                    label: "Networth Radiant",
                    data: graph_net,
                    fill: true,
                }]
            };

            chart_net.update();

            chart_config_xp.data = {
                labels: labels,
                datasets: [{
                    label: "Experience Radiant",
                    data: graph_xp,
                    fill: true,
                }]
            };

            chart_xp.update();
        }
    });
});
