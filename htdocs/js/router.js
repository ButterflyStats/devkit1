define([
    'devkit',

    // global components
    'views/components/sidebar',
    'views/components/controls',

    // views
    'views/audio',
    'views/combatlog',
    'views/dashboard',
    'views/entities',
    'views/graphs',
    'views/index',
    'views/map',
    'views/stringtables'
], function(devkit, sidebar, controls, vAudio, vCombatlog, vDashboard, vEntities, vGraphs, vIndex, vMap, vStringtables) {
    // extending our router
    Backbone.Router.prototype.before = function () {};
    Backbone.Router.prototype.after = function () {};

    // invokes route before / after
    Backbone.Router.prototype.route = function (route, name, callback) {
        if (!_.isRegExp(route)) route = this._routeToRegExp(route);
        if (_.isFunction(name)) {
            callback = name;
            name = '';
        }

        if (!callback) callback = this[name];

        var router = this;

        Backbone.history.route(route, function(fragment) {
            var args = router._extractParameters(route, fragment);

            router.before.apply(router, arguments);
            callback && callback.apply(router, args);
            router.after.apply(router, arguments);

            router.trigger.apply(router, ['route:' + name].concat(args));
            router.trigger('route', name, args);
            Backbone.history.trigger('route', router, name, args);
        });

        return this;
    };

    // the active view
    var vActive = null;

    // components
    var vSidebar = new sidebar();
    var vControl = new controls();

    // application router
    var AppRouter = Backbone.Router.extend({
        routes: {
              'audio'        : 'audio',
              'combatlog'    : 'combatlog',
              'dashboard'    : 'dashboard',
              'entities'     : 'entities',
              'graphs'       : 'graphs',
              'index'        : 'index',
              'map'          : 'map',
              'stringtables' : 'stringtables',
              '*path'        : 'defaultAction'
        },
        before: function() {
            if (vActive != null && typeof(vActive.close) != 'undefined') {
                vActive.close();
            }
        },
        after: function() {
            //Loader.endLoading();
        }
    });

    // partial function application
    var partial_fn = function(fn) {
        const slice = Array.prototype.slice;
        const stored_args = slice.call(arguments, 1);

        return function () {
            const new_args = slice.call(arguments);
            const args = stored_args.concat(new_args);
            return fn.apply(null, args);
        };
    }

    // render template
    var render_tpl = function(type, tpl, args) {
        if (type != 'index' && !devkit.ready()) {
            var v = new vIndex();
            v.render();
            vActive = v;
        } else {
            var v = new tpl();
            v.render();
            vActive = v;
        }
    }

    // initializes our router
    var initialize = function() {
        var app_router = new AppRouter();

        // trigger devkit in demo mode
        if (window.demo) {
            devkit.init();
        }

        // specified routes
        app_router.on('route:audio', partial_fn(render_tpl, 'audio', vAudio));
        app_router.on('route:combatlog', partial_fn(render_tpl, 'combatlog', vCombatlog));
        app_router.on('route:dashboard', partial_fn(render_tpl, 'dashboard', vDashboard));
        app_router.on('route:entities', partial_fn(render_tpl, 'entities', vEntities));
        app_router.on('route:graphs', partial_fn(render_tpl, 'graphs', vGraphs));
        app_router.on('route:index', partial_fn(render_tpl, 'index', vIndex));
        app_router.on('route:map', partial_fn(render_tpl, 'map', vMap));
        app_router.on('route:stringtables', partial_fn(render_tpl, 'stringtables', vStringtables));

        // default route
        app_router.on('route:defaultAction', partial_fn(render_tpl, 'index', vIndex));

        // add routes to sidebar
        vSidebar.add_page('Dashboard', 'dashboard', 'desktop');
        vSidebar.add_page('Broadcasters', 'audio', 'microphone');
        vSidebar.add_page('Map', 'map', 'map-o');
        vSidebar.add_page('Graphs', 'graphs', 'area-chart');
        vSidebar.add_page('Combatlog', 'combatlog', 'file-text');
        vSidebar.add_page('Entities', 'entities', 'street-view');
        vSidebar.add_page('Stringtables', 'stringtables', 'list');

        // render our sidebar
        vSidebar.render();
        vSidebar.active('dashboard');

        // render controls
        vControl.render();

        Backbone.history.start();
        return app_router;
    };

    return {
        initialize: initialize
    };
});
