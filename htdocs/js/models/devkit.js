define([
    'backbone',
    'underscore'
], function(Backbone, _) {
    var model = Backbone.Model.extend({
        defaults: {
            // stub for demo mode
            info: {
                finished_at: 1444441176,
                leagueid: 0,
                matchid: 1855408730,
                mode: 1,
                playback_frames: 31892,
                playback_ticks: 63786,
                playback_time: 2126.2001953125,
                time_game: 184.243728637695,
                time_pregame: 109.2320009887695,
                team_dire: [
                    {hero: "npc_dota_hero_kunkka", name: "p1", steamid: 0},
                    {hero: "npc_dota_hero_lion", name: "p2", steamid: 0},
                    {hero: "npc_dota_hero_treant", name: "p3", steamid: 0},
                    {hero: "npc_dota_hero_ursa", name: "p4", steamid: 0},
                    {hero: "npc_dota_hero_bloodseeker", name: "p5", steamid: 0}
                ],
                team_radiant: [
                    {hero: "npc_dota_hero_broodmother", name: "p6", steamid: 0},
                    {hero: "npc_dota_hero_pugna", name: "p7", steamid: 0},
                    {hero: "npc_dota_hero_omniknight", name: "p8", steamid: 0},
                    {hero: "npc_dota_hero_ember_spirit", name: "p9", steamid: 0},
                    {hero: "npc_dota_hero_phantom_assassin", name: "p10", steamid: 0}
                ],
                channels: [
                    { id: 1, country: "ru", description: "RU SLTV - USE ENGLISH CAMERA", casters: [{id: 11, name: "Yzori", steam: 1}, {id: 21, name: "Yzori2", steam: 1}] },
                    { id: 2, country: "us", description: "BeyondtheSummit English Commentary", casters: [{id: 12, name: "BTZ GoDZ", steam: 1}]} ,
                    { id: 3, country: "cn", description: "HuomaoTV-Mengluoke&FreeAgain", casters: [{id: 13, name: "YingYang", steam: 1}] }
                ]
            },
            state: "pause",
            active_channel: -1
        }
    });

    return new model();
});
