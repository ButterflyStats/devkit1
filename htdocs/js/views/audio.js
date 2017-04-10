define([
    'backbone',
    'jquery',
    'underscore',
    'devkit',

    'util/base64',
    'util/crc32',
    'util/resample',

    'text!templates/audio.html',
], function(backbone, $, _, devkit, base64, crc, resampler, tpl) {
    /** Audio Context related data */
    var audioInitialized = false; // Whether we have initialized the audio
    var audioContext = null; // Audio context
    var audioSource = null; // Our audio source
    var audioSilence = null; // Special empty buffer
    var audioScriptNode = null; // Context script node

    /** Resampling */
    var audioResampler = null;
    var rsInputBuf = null;
    var rsInputView = null;
    var rsOutputView = null;

    /** Audio Buffer related data */
    var audioFilled = [];
    var audioActive = null;
    var audioActiveCur = 0;
    var audioSampleCur = 0;

    /** Audio settings */
    var audioChannels = 1;
    var audioBuffersize = 8192;
    var audioSamples = 16000;
    var audioMaxCached = 64;

    var once = false;

    // View
    return backbone.View.extend({
        el: $('#content'),

        events: {
            'click #audio .aselect': 'on_channel'
        },

        initialize: function() {
            this.cTpl = _.template(tpl);
            this.render();

            if (!audioInitialized) {
                try {
                    // Create context
                    window.AudioContext = window.AudioContext || window.webkitAudioContext;
                    audioContext = new AudioContext();

                    audioSilence = audioContext.createBuffer(audioChannels, audioBuffersize, audioSamples);
                    for (var i = 0; i < audioBuffersize; ++i) {
                        audioSilence.getChannelData(0)[i] = 0;
                    }

                    audioScriptNode = audioContext.createScriptProcessor(audioBuffersize, 1, 1);
                    audioScriptNode.onaudioprocess = function(audioProcessingEvent) {
                        var out = audioProcessingEvent.outputBuffer;

                        if (audioFilled.length == 0) {
                            for (var i = 0; i < audioBuffersize; ++i) {
                                out.getChannelData(0)[i] = 0.0;
                            }
                        } else {
                            var buf = audioFilled.shift().getChannelData(0);
                            var data = out.getChannelData(0);

                            for (var i = 0; i < audioBuffersize; ++i) {
                                data[i] = buf[i];
                            }
                        }
                    };

                    audioActive = audioContext.createBuffer(audioChannels, audioBuffersize, 44100);
                    audioScriptNode.connect(audioContext.destination);

                    // resampler
                    rsInputBuf = new ArrayBuffer(audioBuffersize*16);
                    rsInputView = new Float32Array(rsInputBuf);
                    audioResampler = new resampler(audioSamples, audioContext.sampleRate, 1, rsInputView);
                    rsOutputView = audioResampler.outputBuffer;
                } catch(e) {
                    alert('Web Audio API is not supported in this browser');
                }

                devkit.on('audio', this.handle_audio);
                audioInitialized = true;
            }
        },

        on_channel: function (ele) {
            var target = $(ele.currentTarget).data('target');
            devkit.set_channel(target);
            this.render();
        },

        render: function() {
            var info = devkit.info();
            info.active = devkit.get_channel();
            this.$el.html( this.cTpl(info) );
        },

        handle_audio: function(data) {
            if (once) return;

            // get frames
            var abuffer = base64.decode(data.data.pcm);
            var adata = new Int16Array(abuffer);

            // resample to new
            var output = audioActive.getChannelData(0);

            var i = 0;
            for (i = 0; i < adata.length; ++i) {
                rsInputView[audioActiveCur++] = (adata[i] / 32767.0);

                // 1st check, input buffer is ready to recycle
                if (audioActiveCur == audioBuffersize) {
                    var frames = audioResampler.resampler(audioBuffersize);

                    for (var j = 0; j < frames; ++j) {
                        if (audioSampleCur == audioBuffersize) {
                            audioFilled.push(audioActive);
                            audioSampleCur = 0;
                            audioActive = audioContext.createBuffer(audioChannels, audioBuffersize, 44100);
                            output = audioActive.getChannelData(0);
                        }

                        output[audioSampleCur++] = rsOutputView[j];
                    }

                    audioActiveCur = 0;
                }
            }

            if (audioFilled.length == audioMaxCached) {
                console.log("Warning: Skipping frames, buffer is full");
                audioFilled.shift(); // pop first item
            }
        }
    });
});
