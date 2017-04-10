define([
    'backbone',
    'jquery',
    'underscore',
    'uploader',
    'loader',
    'devkit'

], function(backbone, $, _, uploader, loader, devkit) {
    return backbone.View.extend({
        initialize: function() {
            var self = this;

            // Switch path in overview
            $(document).on('click', '.btn-path', this.handlePath);

            // Initializer uploader object
            this.uploader = new uploader($("#upload_wrapper"), {
		        directupload : true,
		        clickObj : '.upload-ele'
		    }, function (result) {
                self.hide();
                loader.show();

                devkit.emit('load', {file: result});
		    }, function (error) {
                console.log(error);
		    });

            // initialize devkit
            devkit.init();

            // callback for init
            devkit.on('init', function(ev) {
                loader.hide();
                self.show();
            });

            // callback for progress
            devkit.on('progress', function(ev) {
                var width = Math.floor(5 * ev.data.progress);
                $("#loading-prog").width(width+"px");

                if (ev.data.progress < 10) ev.data.progress = "0"+ev.data.progress;
                $("#loading-ptext").html(Math.floor(ev.data.progress));
            });

            // callback for replay load
            devkit.on('open', function(ev) {
                window.app.navigate("//dashboard");
                loader.hide();
                $("#wrapper").css('display', 'block');
            });
        },

        handlePath: function (el) {
            $("#path-target").val($(el.target).attr("data-path"));
            $(".btn-path").removeClass("active");
            $(el.target).addClass("active");
        },

        show: function() {
            $("#upload_wrapper").css('display', 'block');
        },

        hide: function() {
            $("#upload_wrapper").css('display', 'none');
        }
    });
});
