define([
    'backbone',
    'jquery',
    'underscore',

    'text!templates/combatlog.html',
], function(backbone, $, _, tpl) {
    return backbone.View.extend({
        el: $('#content'),

        initialize: function() {
            this.cTpl = _.template(tpl);
            this.$el.html( this.cTpl({}) );
        }
    });
});
