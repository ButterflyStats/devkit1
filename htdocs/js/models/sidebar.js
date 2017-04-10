define([
    'backbone',
    'underscore'
], function(Backbone, _) {
    var model = Backbone.Model.extend({
        // defaults
        defaults: {
            active: '',
            pages: []
        },

        // add a new page
        add_page: function(page) {
            this.set({
                'pages' : this.get('pages').concat(page)
            });
        }
    });

    return new model();
});
