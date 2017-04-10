define([
    'jquery',
    'underscore'
], function($, _){
    var Uploader = function(dropper, options, uploaded, error){
        if (dropper && this.isSupported()){
            this.options = $.extend(true, {}, this.options, options );
            if (typeof uploaded === "function"){
                this.options.on.uploaded = uploaded;
            }
            if (typeof error === "function"){
                this.options.on.invalid = error;
                this.options.on.error = error;
            }
            this.dropper = dropper instanceof jQuery ? dropper : $(dropper) ;
            this.initDropper();
            if (this.options.clickObj){
                this.options.clickObj = this.options.clickObj instanceof jQuery ? this.options.clickObj : $(this.options.clickObj) ;
                if (!this.options.fileInput || this.options.fileInput.length < 1){
                    $(this.options.clickObj).parent().append('<input type="file" multiple name="files[]" style="visibility:hidden;opacity:0;position:absolute;top:-100px;left:-100px;width:0px;height:0px;"/>');
                    this.options.fileInput = $("input[type=file]");
                }
                this.initClickHandler();
            }
            return this;
        }
        return false;
    };

    // Default settings
    Uploader.prototype.options = {
        directupload    : false,
        fileInput       : $('input[type=file]'),
        clickObj        : undefined,
        dropEffect      : 'copy',
        headerCheck     : [0x50,0x42,0x44,0x45,0x4d,0x53,0x32],
        fileExt         : ".dem",
        className : {
            start       : 'dragstart',
            enter       : 'dragenter',
            over        : 'dragover'
        },
        on : {
            dragstart   : $.noop,
            dragend     : $.noop,
            dragenter   : $.noop,
            dragleave   : $.noop,
            dragover    : $.noop,
            drop        : $.noop,
            invalid     : $.noop,
            uploaded    : $.noop,
            error       : $.noop,
            progress    : $.noop
        },
        message : {
            error : {
                invalidFile        : "Invalid header check",
                wrongFileExtension : "File extension doesn't match"
            }
        }
    };

    // Selected files
    Uploader.prototype.files = [];
    Uploader.prototype.hasFiles = false;

    // Last loaded file
    Uploader.prototype.currentFiles = [];

    // Check if the browser supports this dnd upload
    Uploader.prototype.isSupported = function(){
        if (window.File && window.FileReader && window.FileList && window.Blob){
            return true;
        }
        return false;
    }

    // Draghandler
    Uploader.prototype.dragHandler = function(event){
        event.stopPropagation();
        event.preventDefault();
        switch(event.type){
            case "dragstart":
                //this.dropper.addClass(this.options.className.start);
                //this.options.on.dragstart(event);
                break;
            case "dragend":
                //this.dropper.removeClass(this.options.className.start);
                //this.options.on.dragend(event);
                break;
            case "dragenter":
                this.dropper.addClass(this.options.className.enter);
                this.options.on.dragenter(event);
                break;
            case "dragleave":
                this.dropper.removeClass(this.options.className.enter);
                this.dropper.removeClass(this.options.className.over);
                this.options.on.dragleave(event);
                break;
            case "dragover":
                this.dropper.addClass(this.options.className.over);
                event.originalEvent.dataTransfer.dropEffect = this.options.dropEffect;
                this.options.on.dragover(event);
                break;
        }
        return false;
    };


    // Drop handler
    Uploader.prototype.dropHandler = function(event){
        event.stopPropagation();
        event.preventDefault();

        this.dropper.removeClass(this.options.className.enter);
        this.dropper.removeClass(this.options.className.over);
        this.dropper.removeClass(this.options.className.start);

        this.files = event.originalEvent.dataTransfer.files;
        this.hasFiles = (this.files.length > 0);
        this.options.on.drop(event, this.files);
        if (this.options.directupload && this.hasFiles){
            this.upload();
        }
    };

    // Initiate drag and drop handler
    Uploader.prototype.initDropper = function(){
        this.dropper.on('dragstart', $.proxy(this.dragHandler, this));
        this.dropper.on('dragend', $.proxy(this.dragHandler, this));
        this.dropper.on('dragenter', $.proxy(this.dragHandler, this));
        this.dropper.on('dragleave', $.proxy(this.dragHandler, this));
        this.dropper.on('dragover', $.proxy(this.dragHandler, this));
        this.dropper.on('drop', $.proxy(this.dropHandler, this));
    };


    Uploader.prototype.initClickHandler = function(){
        var self = this;
        this.options.fileInput.on("change", function(event){
            event.stopPropagation();
            event.preventDefault();

            self.files = event.originalEvent.target.files;
            self.hasFiles = (self.files.length > 0);

            if (self.options.directupload && self.hasFiles){
                self.upload();
            }

            return false;
        });
        this.options.clickObj.on("click", function(event){
            event.stopPropagation();
            event.preventDefault();

            self.options.fileInput.click();

            return false;
        });
    }

    // File upload in Browser -> Result Int8Array
    Uploader.prototype.upload = function(){
        try{
            if (this.files.length > 0){

                // Only one file at the moment
                if (this.files.length > 1){
                    this.files = [this.files[0]];
                }

                // Validate each File
                var self = this;
                _.each(this.files, function(f){
                    self.currentFiles = [];
                    self.validateFile(f, function(){
                        /*var reader = new FileReader();
                        reader.onload = function(){
                            self.currentFile = new Int8Array(reader.result);
                            self.options.on.uploaded(self.currentFile);
                        };
                        reader.onprogress = function(a){
                            self.options.on.progress(this, f);
                        };
                        reader.readAsArrayBuffer(f);*/
                        self.currentFiles.push(f);
                        self.options.on.uploaded(f);
                    }, function(message){
                        self.options.on.invalid(message, f);
                    });
                });
            }
        }catch(e){
            console.error(e);
            this.options.on.error(e);
        }
    };

    // Validate file extension and file header
    Uploader.prototype.validateFile = function(file, callback, error){
        try{
            if (this.options.headerCheck.length < 1  || !this.options.fileExt ){
                callback();
                return;
            }
            if (!file.name.match( new RegExp(this.options.fileExt + "$", "i") )){
                error(this.options.message.error.wrongFileExtension);
                return;
            }
            var self = this;
            var reader = new FileReader();
            reader.onloadend = function(evt){
                if (evt.target.readyState == FileReader.DONE) {
                    var buffer = evt.target.result;
                    var int8View = new Int8Array(buffer);
                    var i = 0;
                    while(i < self.options.headerCheck.length){
                        if (int8View[i] != self.options.headerCheck[i]){
                            error(self.options.message.error.invalidFile);
                            return;
                        }
                        i++;
                    }
                    callback();
                }
            };
            reader.readAsArrayBuffer(file.slice(0, this.options.headerCheck.length));
        }catch(e){
            console.error(e);
            this.options.on.error(e);
        }
    };

    return Uploader;
});
