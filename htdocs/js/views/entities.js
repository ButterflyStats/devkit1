define([
    'backbone',
    'jquery',
    'underscore',
    'devkit',

    'text!templates/entities.html',
    'text!templates/entities_list.html',
    'text!templates/entities_tab.html',
], function(backbone, $, _, devkit, tpl, tpl_list, tpl_tab) {
    var lTpl = _.template(tpl_list);
    var tTpl = _.template(tpl_tab);

    var pinned = [];
    var filter = "";
    var eopen = [];

    function filter_all() {
        var re = new RegExp('.*'+filter+'.*', 'i');

        $( "#enormal li" ).each(function (e) {
            if ($(this).data('ename').match(re) != null) {
                $(this).css("display", "block");
            } else {
                $(this).css("display", "none");
            }
        });
    }

    function id_to_type(id) {
        switch (id) {
        case 0: return "bool";
        case 1: return "int32";
        case 2: return "int64";
        case 3: return "uint32";
        case 4: return "uint64";
        case 5: return "float";
        case 6: return "string";
        case 7: return "vector";
        case 8: return "array";
        default: return "unkown ("+id+")";
        }
    }

    return backbone.View.extend({
        el: '#content',

        events: {
            'keyup #entities #efilter': 'on_filter',
            'click #entities .ent': 'on_open',
            'click #entities .item-tab': 'on_tab',
            'click #entities .item-close': 'on_close',
            'click #entities #erefresh': 'on_refresh'
        },

        // initialize view
        initialize: function() {
            this.cTpl = _.template(tpl);

            devkit.on('entities', this.handle_all);
            devkit.on('entity', this.handle_single);

            devkit.emit('entities', {});
            devkit.emit('subscribe', {type: devkit.subscribe_edelta});

            this.render();
        },

        // triggered on close
        close: function() {
            devkit.off('entities', this.handle_all);
            devkit.off('entity', this.handle_single);

            devkit.emit('unsubscribe', {type: devkit.subscribe_edelta});

            _.each(eopen, function (eid) {
                devkit.emit('unsubscribe', {type: devkit.subscribe_entity, id: eid});
            });

            eopen = [];
        },

        // filter entities
        on_filter: function(ele) {
            filter = $(ele.currentTarget).val();
            filter_all();
        },

        // open entity
        on_open: function(ele) {
            $( "#entities .tabs table" ).removeClass("active");
            devkit.emit('entity', {id: $(ele.currentTarget).data('eid')});
            devkit.emit('subscribe', {type: devkit.subscribe_entity, id: $(ele.currentTarget).data('eid')});
        },

        // set active tab
        on_tab: function(ele) {
            var id = $(ele.currentTarget).data('eid');
            $( "#entities .tabs table" ).removeClass("active");
            $( "#entity"+id ).addClass("active");
        },

        // close entity
        on_close: function(ele) {
            var id = $(ele.currentTarget).parent().data('eid');
            devkit.emit('unsubscribe', {type: devkit.subscribe_entity, id: id});

            $(ele.currentTarget).parent().remove();
            $( "#entity"+id ).remove();
            eopen.splice(eopen.indexOf(id), 1);
        },

        // refresh entity list
        on_refresh: function(ele) {
            devkit.emit('entities', {});
        },

        // refresh all
        handle_all: function(data) {
            var ents = data.data;
            var tdat = {'pinned': [], 'normal': []};

            _.each(ents, function(e) {
                if (_.indexOf(pinned, e.id) != -1) {
                    tdat.pinned.push(e);
                } else {
                    tdat.normal.push(e);
                }
            });

            // refresh pinned state
            pinned = _.pluck(tdat.pinned, 'id');

            // render pinned
            $("#epinned").html( lTpl({items: tdat.pinned}) );
            var offset = 35 + $("#epinned").height();

            // calc normal height and render
            $("#enormal").height("calc(100% - "+offset+"px)");
            $("#enormal").html( lTpl({items: tdat.normal}));

            // filter remaining
            filter_all();
        },

        handle_single: function(data) {
            // set type
            _.each(data.data.properties, function (p) {
                p.type = id_to_type(p.type);
            });

            // already open
            if (_.indexOf(eopen, data.data.id) != -1) {
                _.each(data.data.properties, function (p) {
                    var tid = "#entity"+data.data.id;
                    var eid = "#e"+data.data.id+"p"+p.hash+"b"+p.baseline;
                    var ele = $(eid);

                    if (ele.length) {
                        if (ele.html() != p.value) {
                            ele.html(p.value);
                        }
                    } else {
                        // New prop, re-render
                        $( tid ).replaceWith( tTpl(data.data) );
                    }
                });
            } else {
                eopen.push(data.data.id);

                // remove active from existing tabs
                $( "#entities .item-tabs" ).removeClass("active");

                // add to nav
                $( "#entities .item-tabs" ).append(
                    "<div data-eid='"+data.data.id+"' class='item-tab active'>"+data.data.class+" <i class='fa fa-times item-close' aria-hidden='true'></i></div>"
                );

                // render to tab
                $( "#entities .tabs" ).append( tTpl(data.data) );
            }
        },

        // render all components
        render: function() {
            this.$el.html( this.cTpl({}) );
        }
    });
});
