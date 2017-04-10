/** Sidebar Component View */

define([
    'backbone',
    'underscore',
    'jquery',
    'models/sidebar',

    'text!templates/components/sidebar.html',
], function(backbone, _, $, model, tpl) {
    // singleton
    return backbone.View.extend({
        el: '#sidebar-nav',
        model: model,

        events: {
            "click .sb-link": "navigate"
        },

        // initialize a new sidebar
        initialize: function() {
            var self = this;
            this.cTpl = _.template(tpl);

            this.model.on('change:active', function(model) {
                $("#sidebar-nav li").removeClass("active");
                $("#sb-"+model.get('active')).addClass("active");
            });

            this.model.on('change:pages', function(model) {
                self.render();
            });

            self.render();
        },

        // render the sidebar
        render: function() {
            this.$el.html( this.cTpl({pages: this.model.get('pages')}) );
        },

        // add a new page
        add_page: function(name, target, icon) {
            this.model.add_page({name: name, target: target, icon: icon});
        },

        // set active sidebar element
        active: function(ele) {
            this.model.set({active: ele});
        },

        // navigate to a page
        navigate: function(ele) {
            this.active($(ele.currentTarget).attr("data-target"));
            window.app.navigate("//"+$(ele.currentTarget).attr("data-target"));
        }
    });
});
