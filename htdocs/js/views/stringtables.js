define([
    'backbone',
    'jquery',
    'underscore',
    'devkit',

    'text!templates/stringtables.html',
    'text!templates/stringtables_list.html',
    'text!templates/stringtables_tab.html',
], function(backbone, $, _, devkit, tpl, tpl_list, tpl_tab) {
    var lTpl = _.template(tpl_list);
    var tTpl = _.template(tpl_tab);

    // list of open tables
    var sopen = [];

    return backbone.View.extend({
        el: '#content',

        events: {
            'click #stringtables .stable': 'on_open',
            'click #stringtables .item-tab': 'on_tab',
            'click #stringtables .item-close': 'on_close',
        },

        initialize: function() {
            this.cTpl = _.template(tpl);

            devkit.on('stringtables', this.handle_all);
            devkit.on('stringtable', this.handle_single);
            devkit.emit('stringtables', {});

            this.render();
        },

        close: function() {
            devkit.off('stringtables', this.handle_all);
            devkit.off('stringtable', this.handle_single);

            sopen = [];
        },

        // open entity
        on_open: function(ele) {
            $( "#stringtables .tabs table" ).removeClass("active");
            devkit.emit('stringtable', {id: $(ele.currentTarget).data('sid')});
        },

        // set active tab
        on_tab: function(ele) {
            var id = $(ele.currentTarget).data('sid');
            $( "#stringtables .tabs table" ).removeClass("active");
            $( "#stringtable"+id ).addClass("active");
        },

        // close entity
        on_close: function(ele) {
            var id = $(ele.currentTarget).parent().data('sid');

            $(ele.currentTarget).parent().remove();
            $( "#stringtable"+id ).remove();
            sopen.splice(sopen.indexOf(id), 1);
        },

        render: function() {
            this.$el.html( this.cTpl({}) );
        },

        handle_all: function(data) {
            var tbls = data.data;

            if (tbls == null) {
                return;
            }

            tbls.sort(function(a, b){
                if (a.name.toUpperCase() < b.name.toUpperCase()) return -1;
                if (a.name.toUpperCase() > b.name.toUpperCase()) return 1;
                return 0;
            });

            // calc normal height and render
            $("#snormal").height("calc(100% - 35px)");
            $("#snormal").html( lTpl({items: tbls}) );
        },

        handle_single: function(data) {
            console.log(data);

            if (data.data == null) {
                return;
            }

            if (_.indexOf(sopen, data.data.id) == -1) {
                sopen.push(data.data.id);

                // remove active from existing tabs
                $( "#stringtables .item-tabs" ).removeClass("active");

                // add to nav
                $( "#stringtables .item-tabs" ).append(
                    "<div data-sid='"+data.data.id+"' class='item-tab active'>"+data.data.name+" <i class='fa fa-times item-close' aria-hidden='true'></i></div>"
                );

                // render to tab
                $( "#stringtables .tabs" ).append( tTpl(data.data) );
            }
        }
    });
});
