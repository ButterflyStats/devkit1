define(['backbone', 'router'], function(Backbone, Router){
    return {
        initialize: function() {
            window.app = Router.initialize();

            if (window.demo) {
                $("#wrapper").css('display', 'block');
                $("#upload_wrapper").css('display', 'none');
                $("#loading").css('display', 'none');
            }
        }
    };
});
