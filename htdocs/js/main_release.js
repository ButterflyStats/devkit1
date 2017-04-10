({
    baseUrl: ".",
    paths: {
        backbone: "../node_modules/backbone/backbone-min",
        bootstrap: "../node_modules/bootstrap/dist/js/bootstrap",
        chartjs: "../node_modules/chart.js/dist/Chart.bundle.min",
        jquery: "../node_modules/jquery/dist/jquery",
        pixi: "vendor/pixi.min",
        pixi_filters: "vendor/pixi-extra-filters.min",
        text: '../node_modules/requirejs-text/text',
        underscore: "../node_modules/underscore/underscore-min"
    },
    shim: {
      jquery: {
        exports: '$'
      },
      underscore: {
        exports: '_'
      },
      bootstrap: {
        deps: ["jquery"]
      },
      backbone: {
          deps: ["underscore"]
      },
      pixi_filters: {
          deps: ["pixi"]
      },
      app: {
        deps:["bootstrap", "backbone", "underscore"]
      }
    },
    name: "main",
    out: "main-built.js"
})
