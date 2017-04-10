define([], function() {
    return {
        show: function() {
            $("#loading").css('display', 'block');
        },

        hide: function() {
            $("#loading").css('display', 'none');
        }
    }
});
