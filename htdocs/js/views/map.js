define([
    'backbone',
    'jquery',
    'underscore',
    'pixi',
    'pixi_filters',
    'devkit',

    'text!templates/map.html',
    'text!templates/map_hero.html',
], function(backbone, $, _, pixi, pixi_filters, devkit, tpl, tpl_hero) {
    /**    PIXI    */
    var pixiStage    = null;     // Our pixi js stage
    var pixiRenderer = null;     // Our pixi js renderer (webgl)
    var container    = new pixi.Container();

    /**    MAP     */
    var originalWidth  = 1024;   // original height of the map in pixels
    var originalHeight = 1024;   // original width of the map in pixels
    var dotaWidth      = 17664;  // width of dota map in cells
    var dotaHeight     = 16643;  // height of dota map in cells

    /**   COORDS   */
    var cellWidth   = (1 << 7);   // width of a single cell

    // used to compute px / coord ratio
    var renderRatio = [originalWidth / dotaWidth, originalHeight / dotaHeight];

    /**    DISPLAY    */
    var ents = {};    // entities to render
    var self = null;

    var hlookup = {}; // entity -> hero id lookup
    var hrender = {}; // hero render times
    var hrid = 0; // Current radiant hero id
    var hdid = 0; // Current dire hero id
    var hprops = { // default hero properties
        name: "Player",
        props: {
            "m_iCurrentLevel": {value: 1},
            "m_iMaxHealth": {value: 100},
            "m_flMaxMana": {value: 100}
        },
        manap: 100,
        healthp: 100,
        hero: "sven",
        info: {name: "", items: []}
    };

    return backbone.View.extend({
        /** DOM */
        el     : '#content', // where to render our entry template
        target : null,       // points at the dom element pixi is rendering to
        width  : 0,          // width of the dom element
        height : 0,          // height of the dom element
        scale  : 1.0,        // current map zoom
        moving : null,       // are we moving the map ?
        moved  : false,      // whether we already moved the cursor, used to prevent click while moving

        /** SETTINGS */
        active     : false,  // whether the render loop is active
        mpivot     : false,  // whether to move the map around the pivot point / center
        linearzoom : false,  // zoom / scale by a multiplicator
        zoomscale  : 0.10,   // percent to scale by
        pixscale   : 100,    // scale by 100 pixels off / on

        /** MAP BORDERS */
        borderX1 : 0,        // right
        borderX2 : 0,        // left
        borderY1 : 0,        // top
        borderY2 : 0,        // bottom

        // initialize view
        initialize: function() {
            // create template, set as active
            self = this;
            this.cTpl = _.template(tpl);
            this.hTpl = _.template(tpl_hero);
            this.active = true;

            // request heroes
            devkit.on('entity', this.handle_entity);
            devkit.emit('subscribe', {type: devkit.subscribe_entitytype, id: devkit.ent_hero});

            // render
            this.render();
        },

        // destructor
        close: function() {
            // unsubscribe everything
            this.active = false;
            devkit.emit('unsubscribe', {type: devkit.subscribe_entitytype, id: devkit.ent_hero});
            devkit.off('entity', this.handle_entity);
        },

        // render
        render: function() {
            // render the template
            this.$el.html(this.cTpl({}));

            $("#dhero_0").html(this.hTpl(hprops)); $("#rhero_0").html(this.hTpl(hprops));
            $("#dhero_1").html(this.hTpl(hprops)); $("#rhero_1").html(this.hTpl(hprops));
            $("#dhero_2").html(this.hTpl(hprops)); $("#rhero_2").html(this.hTpl(hprops));
            $("#dhero_3").html(this.hTpl(hprops)); $("#rhero_3").html(this.hTpl(hprops));
            $("#dhero_4").html(this.hTpl(hprops)); $("#rhero_4").html(this.hTpl(hprops));

            // center the hero spacer
            this.centerHeroList()

            // set dom params
            this.target = $("#pixitarget");
            this.width  = this.target.width();
            this.height = this.target.height();

            // initialize renderer on first load
            if (pixiRenderer == null) {
                // initialize our pixi stage and renderer
                pixiStage    = new pixi.Container();
                pixiRenderer = new pixi.WebGLRenderer(this.width, this.height);
                pixiRenderer.backgroundColor = 0x000000;

                // set stage properties
                pixiStage.height = this.height;
                pixiStage.width = this.width;

                // set container properties
                container.pivot.x = originalWidth / 2;
                container.pivot.y = originalHeight / 2;
                container.position.x = this.width / 2;
                container.position.y = this.height / 2;

                // add map texture
                var map = new PIXI.Sprite(PIXI.Texture.fromImage('assets/sprites/map.png'));
                map.interactive = true;
                container.addChild(map);

                // add to stage
                pixiStage.addChild(container);

                // handle zoom
                document.addEventListener("mousewheel", MouseWheelHandler(), false);
                document.addEventListener("DOMMouseScroll", MouseWheelHandler(), false);

                function MouseWheelHandler() {
                    return function (e) {
                        if (!self.active) return false;

                        var e = window.event || e;
                        var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

                        if (delta < 0) {
                            self.zoom(false);
                        } else {
                            self.zoom(true);
                        }

                        return false;
                    }
                }

                // handle movement
                map.on('mousedown', function(mouseData) {
                    self.moving = mouseData.data.getLocalPosition(container.parent);
                    self.moved = false;
                });

                map.on('mouseup', function(mouseData) {
                    self.moving = null;
                });

                map.on('mousemove', function(mouseData) {
                    if (self.moving !== null) {
                        self.moved = true;

                        if (self.mpivot) {
                            var c = mouseData.data.getLocalPosition(container);

                            container.pivot.x -= ((container.pivot.x - c.x) * self.scale) * 0.05;
                            container.pivot.y -= ((container.pivot.y - c.y) * self.scale) * 0.05;
                        } else {
                            var c = mouseData.data.getLocalPosition(container.parent);

                            // get positions we would move to, if we would move at all
                            var pX = container.position.x - (self.moving.x - c.x);
                            var pY = container.position.y - (self.moving.y - c.y);
                            self.moving = c;

                            if (self.width < container.width) {
                                if (pX < self.borderX1 && pX > (-self.borderX2)) {
                                    container.position.x = pX;
                                } else if (pX < self.borderX1) {
                                    container.position.x = -self.borderX2;
                                } else if (pX > (-self.borderX2)) {
                                    container.position.x = self.borderX1;
                                }
                            }

                            if (self.height < container.height) {
                                if (pY < self.borderY1 && pY > (-self.borderY2)) {
                                    container.position.y = pY;
                                } else if (pY < self.borderY1) {
                                    container.position.y = -self.borderY2;
                                } else if (pY > (-self.borderY2)) {
                                    container.position.y = self.borderY1;
                                }
                            }
                        }
                    }
                });
            }

            // render
            this.target.append(pixiRenderer.view);
            this.animate();
        },

        // center the hero list
        centerHeroList: function(data) {
            var h2 = $("#hspacer").height();
            var h3 = $("#map").height();

            var div = (h3-h2)/4;
            $("#hspacer hr").css("margin-top", 5+div);
            $("#hspacer hr").css("margin-bottom", 5+div);
            $("#hspacer").css("padding-top", div);
            $("#hspacer").css("padding-bottom", div);
        },

        // set zoom
        zoom: function(down) {
            console.log("zoom");
            var scale = self.zoomscale;

            if (self.linearzoom && container !== null) {
                var bounds = container.getBounds();
                scale = 1.0 - (bounds.width / (bounds.width + (self.pixscale * (bounds.width / originalWidth))));
            }

            if (down) {
                if (self.scale < 3.0) self.scale += scale;
            } else {
                if (self.scale > 1.0) self.scale -= scale;
            }

            self.borderX1 = (originalWidth * self.scale)/2;
            self.borderX2 = self.borderX1 - self.width;
            self.borderY1 = (originalHeight * self.scale)/2;
            self.borderY2 = self.borderY1 - self.height;
        },

        // fix zooming / dragging across map boundaries
        fixZoom: function() {
            if (container.position.x > self.borderX1)
                container.position.x = self.borderX1;

            if (container.position.x < (-self.borderX2))
                container.position.x = (-self.borderX2);

            if (container.position.y > self.borderY1)
                container.position.y = self.borderY1;

            if (container.position.y < (-self.borderY2))
                container.position.y = (-self.borderY2);

            var bounds = container.getBounds();
            if (bounds.width < self.width)
                container.position.x = self.width / 2;

            if (bounds.height < self.height)
                container.position.y = self.height / 2;
        },

        // center the container
        center: function() {
            container.position.x = self.width / 2;
            container.position.y = self.height / 2;
        },

        // animation loop
        animate: function() {
            // render the container
            pixiRenderer.render(pixiStage);

            if (self.scale != container.scale.x) {
                container.scale.x = self.scale;
                container.scale.y = self.scale;
                self.fixZoom();
            }

            // only call animate when the view is active
            if (self.active) {
                requestAnimationFrame(self.animate);
            }
        },

        world_to_local: function(point) {
            var ret = {x: 0, y: 0};

            ret.x = (point.x + 8832) * renderRatio[0];
            ret.y = originalWidth - (point.y + 8192) * renderRatio[1];

            return ret;
        },

        // called when an entity is updated
        handle_entity: function(data) {
            var ent = data.data;

            if (ent.type != devkit.ent_hero) {
                console.log("Warning: Received non-hero ent in map.handle_entity.", ent.type);
                return;
            }

            // don't render illusions for now
            if (parseInt(ent.properties['m_hReplicatingOtherHeroModel'].value) != 16777215) return;

            // calculate entity data
            if (typeof(ents[ent.class]) == 'undefined') {
                var hero = ent.class.substring(16).toLowerCase();
                var texture = PIXI.Texture.fromImage('assets/sprites/icons/'+hero+'.png');
                var sprite = new PIXI.Sprite(texture);

                ents[ent.class] = {
                    name: ent.class,
                    id: ent.id,
                    texture: texture,
                    sprite: sprite
                };

                container.addChild(sprite);

                switch (ent.properties['m_iTeamNum'].value) {
                    case "2": {
                        console.log("Connecting ent "+ent.id+" to radiant - "+hero);
                        hlookup[ent.id] = "#rhero_"+hrid;
                        hrid += 1;

                        sprite.filters = [new PIXI.filters.GlowFilter(pixiRenderer.width, pixiRenderer.height, 7, 2, 0, 0x8AC954, 0.5)];
                    } break;
                    case "3": {
                        console.log("Connecting ent "+ent.id+" to dire - "+hero);
                        hlookup[ent.id] = "#dhero_"+hdid;
                        hdid += 1;

                        sprite.filters = [new PIXI.filters.GlowFilter(pixiRenderer.width, pixiRenderer.height, 7, 2, 0, 0xC9302C, 0.5)];
                    } break;
                }

                hrender[ent.id] = 0;
            }

            var cell = [parseInt(ent.properties['CBodyComponent.m_cellX'].value), parseInt(ent.properties['CBodyComponent.m_cellY'].value)];
            var vec = [parseInt(ent.properties['CBodyComponent.m_vecX'].value), parseInt(ent.properties['CBodyComponent.m_vecY'].value)];

            var wcord = {
                x: ((cell[0] * cellWidth) - 16384 + vec[0]),
                y: ((cell[1] * cellWidth) - 16384 + vec[1])
            };

            var wlocal = self.world_to_local(wcord);

            ents[ent.class].sprite.anchor.x = 0.5;
            ents[ent.class].sprite.anchor.y = 0.5;
            ents[ent.class].sprite.position.x = wlocal.x;
            ents[ent.class].sprite.position.y = wlocal.y;

            if (hrender[ent.id] < Math.floor(Date.now() / 1000)) {
                hrender[ent.id] = Math.floor(Date.now() / 1000) + 2;
                self.render_hero(ent);
            }
        },

        render_hero: function(ent) {
            var ele = $(hlookup[ent.id]);
            var data = {
                "props": ent.properties,
                "hero": ent.class.substring(16).toLowerCase(),
                "info": ent.hero_info
            };

            data["healthp"] = Math.ceil((
                parseFloat(data["props"]["m_iHealth"].value) /
                parseFloat(data["props"]["m_iMaxHealth"].value)) * 100);

            data["manap"] = Math.ceil((
                parseFloat(data["props"]["m_flMana"].value) /
                parseFloat(data["props"]["m_flMaxMana"].value)) * 100);

            ele.html(self.hTpl(data));
        }
    });
});
