#include <mutex>
#include <butterfly/butterfly.hpp>
#include "app.hpp"
#include "callbacks.hpp"

#include <emscripten.h>

using namespace butterfly;

/** Parser Object */
parser p(true);

/** Function callback */
callback g_cb = nullptr;

/** Play / seek mutex */
std::mutex g_lock;

/** Ticks / second */
float g_tickrate = 0.0f;

/** Subscription list for stringtables */
std::set<uint32_t> g_subtable;

/** Subscription list for single entities */
std::set<uint32_t> g_subents;

/** Subscription list for entity types */
std::set<uint32_t> g_subtypes;

/** Subscribed to delta for entities? */
bool g_subedelta = false;

/** Subscribed audio channel */
uint32_t g_subaudio = 999;

/** Channels */
std::unordered_map<uint32_t, std::set<uint64_t>> g_channels;

entity* g_gamerules = nullptr;
entity* g_playerresources = nullptr;

/** codec */
void *psDec;
void* DecControl;

/** output buffer */
char* g_audio_out = new char[102400];

static const std::string base64_chars =
             "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
             "abcdefghijklmnopqrstuvwxyz"
             "0123456789+/";

static inline bool is_base64(unsigned char c) {
  return (isalnum(c) || (c == '+') || (c == '/'));
}

std::string base64_encode(unsigned char const* bytes_to_encode, unsigned int in_len) {
  std::string ret;
  int i = 0;
  int j = 0;
  unsigned char char_array_3[3];
  unsigned char char_array_4[4];

  while (in_len--) {
    char_array_3[i++] = *(bytes_to_encode++);
    if (i == 3) {
      char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
      char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
      char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
      char_array_4[3] = char_array_3[2] & 0x3f;

      for(i = 0; (i <4) ; i++)
        ret += base64_chars[char_array_4[i]];
      i = 0;
    }
  }

  if (i)
  {
    for(j = i; j < 3; j++)
      char_array_3[j] = '\0';

    char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
    char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
    char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
    char_array_4[3] = char_array_3[2] & 0x3f;

    for (j = 0; (j < i + 1); j++)
      ret += base64_chars[char_array_4[j]];

    while((i++ < 3))
      ret += '=';

  }

  return ret;
}

// Reverses (reflects) bits in a 32-bit word.
uint32_t reverse(uint32_t x) {
   x = ((x & 0x55555555) <<  1) | ((x >>  1) & 0x55555555);
   x = ((x & 0x33333333) <<  2) | ((x >>  2) & 0x33333333);
   x = ((x & 0x0F0F0F0F) <<  4) | ((x >>  4) & 0x0F0F0F0F);
   x = (x << 24) | ((x & 0xFF00) << 8) |
       ((x >> 8) & 0xFF00) | (x >> 24);
   return x;
}

unsigned int crc32a(unsigned char *message, uint32_t size) {
   int i, j;
   unsigned int byte, crc;

   i = 0;
   crc = 0xFFFFFFFF;
   for (i = 0; i < size; ++i) {
      byte = message[i];            // Get next byte.
      byte = reverse(byte);         // 32-bit reversal.
      for (j = 0; j <= 7; j++) {    // Do eight times.
         if ((int)(crc ^ byte) < 0)
              crc = (crc << 1) ^ 0x04C11DB7;
         else crc = crc << 1;
         byte = byte << 1;          // Ready next msg bit.
      }
   }
   return reverse(~crc);
}

#undef expect
#include "json/src/json.hpp"
using json = nlohmann::json;

void audio_decomp(const char* comp, uint32_t comp_len, char* uncomp, uint32_t uncomp_len) {
    // Not going to release this at this time, sorry
}

// This function will return the current ingame time
float ingame_time() {
    entity* e = nullptr;

    // try to find gamerules proxy
    auto ecls = p.classes.classes.by_key("CDOTAGamerulesProxy").index;
    for (uint32_t i = 0; i < p.entities.size(); ++i) {
        if (p.entities[i] && p.entities[i]->cls == ecls) {
            e = p.entities[i];
            break;
        }
    }

    // return in game or approximate time
    if (!e || !e->has("m_pGameRules.m_fGameTime"_chash)) {
        return -999.999f;
    } else {
        return e->get("m_pGameRules.m_fGameTime"_chash)->data.fl;
    }
}

// Progress callback
void demo_progress(float prog) {
    static uint32_t lp = 0;

    if ((uint32_t)prog != lp) {
        g_cb(CB_PROGRESS, std::string("{\"progress\":"+std::to_string(prog)+"}").c_str());
    } {
        lp = (uint32_t)prog;
    }
}

entity* entity_by_class(const char* ckey) {
    if (!p.classes.classes.has_key(ckey)) {
        std::cout << "Warning: No class like " << ckey << std::endl;
        return nullptr;
    }

    auto ecls = p.classes.classes.by_key( ckey ).index;

    for ( uint32_t i = 0; i < p.entities.size(); ++i ) {
        if ( p.entities[i] && p.entities[i]->cls == ecls ) {
            return p.entities[i];
        }
    }

    std::cout << "Warning: No entity for class " << ckey << std::endl;
    return nullptr;
}

std::string str_lookup(const char* table, uint32_t index) {
    if (!p.stringtables.has_key(table)) {
        std::cout << "Warning: No such stringtable " << table << std::endl;
        return "";
    }

    auto &tbl = p.stringtables.by_key(table);
    if (tbl->has_index(index)) {
        return tbl->by_index(index).key;
    } else {
        std::cout << "Warning: No such index " << index << " in table " << table << std::endl;
        return "";
    }
}

// Will convert an entity by index to a json string
json ent_to_json(uint32_t id) {
    if (!p.entities[id])
        return {};

    json ret;
    ret["id"] = id;
    ret["class"] = p.classes->by_index(p.entities[id]->cls).key;
    ret["type"] = p.entities[id]->type;
    ret["properties"] = json::object();

    for (auto prop : p.entities[id]->properties) {
        if (!prop.second)
            continue;

        json prop2;
        prop2["name"] = prop.second->info->name;
        prop2["hash"] = prop.second->info->hash;
        prop2["value"] = prop.second->as_string();
        prop2["type"] = prop.second->type;
        prop2["baseline"] = false;

        ret["properties"][prop.second->info->name] = prop2;
    }

    if (p.entities[id]->type == ENT_HERO) {
        g_playerresources = entity_by_class("CDOTA_PlayerResource");

        if (!g_playerresources) {
            std::cout << "Error finding player resources when returning hero" << std::endl;
            return ret;
        }

        ret["hero_info"] = json::object();
        ret["hero_info"]["items"] = json::array();
        ret["hero_info"]["name"] = "";

        if (!p.entities[id]->has("m_iPlayerID"_chash)) return ret;
        if (!p.entities[id]->has("m_hItems.0"_chash)) return ret;
        if (!p.entities[id]->has("m_hItems.1"_chash)) return ret;
        if (!p.entities[id]->has("m_hItems.2"_chash)) return ret;
        if (!p.entities[id]->has("m_hItems.3"_chash)) return ret;
        if (!p.entities[id]->has("m_hItems.4"_chash)) return ret;
        if (!p.entities[id]->has("m_hItems.5"_chash)) return ret;

        // player id
        int32_t pid = p.entities[id]->get("m_iPlayerID"_chash)->data.i32;

        // name
        std::string nsz = "m_vecPlayerData."+std::to_string(pid)+".m_iszPlayerName";

        if (!g_playerresources->has(nsz.c_str())) {
            std::cout << "No Name for " << nsz << std::endl;
            return ret;
        }

        std::string pname = g_playerresources->get(nsz.c_str())->data_str;

        if (pname.size() > 24) {
            pname = pname.substr(0, 24) + "...";
        }

        ret["hero_info"]["name"] = pname;

        // items
        ret["hero_info"]["items"] = json::array();
        int32_t hitems[] = {
            p.entities[id]->get("m_hItems.0"_chash)->data.i32, p.entities[id]->get("m_hItems.1"_chash)->data.i32,
            p.entities[id]->get("m_hItems.2"_chash)->data.i32, p.entities[id]->get("m_hItems.3"_chash)->data.i32,
            p.entities[id]->get("m_hItems.4"_chash)->data.i32, p.entities[id]->get("m_hItems.5"_chash)->data.i32
        };

        for (int32_t i = 0; i < 6; ++i) {
            if (hitems[i] == ENULL) continue;
            entity* ient = p.entities[hitems[i] & EMASK];

            if (!ient) {
                std::cout << "Item is 0: " << (hitems[i] & EMASK) << " (" << hitems[i] << ")" << std::endl;
                continue;
            }

            if (!ient->has("m_pEntity.m_nameStringableIndex"_chash)) continue;
            auto istr = str_lookup("EntityNames", ient->get("m_pEntity.m_nameStringableIndex")->data.i32);

            if (istr.substr(0, 11) == "item_recipe") istr = "item_recipe";
            ret["hero_info"]["items"].push_back(istr);
        }
    }

    return ret;
}

/** Visitor */
class v : public visitor {
public:
    // on_entity callback
    void on_entity( entity_state state, entity* ent ) {
        if (state == ENT_UPDATED) {
            if (!g_subents.empty()) {
                auto it = g_subents.find(ent->id);

                if (it != g_subents.end()) {
                    g_cb(CB_ENTITY, ent_to_json(ent->id).dump().c_str());
                }
            }

            if (!g_subtypes.empty()) {
                auto it = g_subtypes.find(ent->type);

                if (it != g_subtypes.end()) {
                    g_cb(CB_ENTITY, ent_to_json(ent->id).dump().c_str());
                }
            }
        } else {
            if (g_subedelta) {
                json ret;

                for (uint32_t i = 0; i < p.entities.size(); ++i) {
                    if (p.entities[i]) {
                        json row;
                        row["id"] = i;
                        row["class"] = p.classes->by_index(p.entities[i]->cls).key;
                        row["type"] = p.entities[i]->type;
                        ret.push_back(row);
                    }
                }

                g_cb(CB_ENTITIES, ret.dump().c_str());
            }
        }
    }

    // on_packet callback
    virtual void on_packet( uint32_t type, char* data, uint32_t size ) {
        // Not a voice packet
        if (type != svc_VoiceData)
            return;

        // Not subscribed to channel
        if (g_subaudio == 999)
            return;

        // Not going to release this at this time, sorry
    }
};

v vv;

extern "C" {
    void devkit_open(const char* file, callback cb) {
        std::lock_guard<std::mutex> lock(g_lock);
        g_cb = cb;

        /* Reset decoder */
        memset(g_audio_out, 0, 102400);

        // open replay
        p.open(file, demo_progress);
        p.require(svc_VoiceData);

        // get summary
        json ret;

        auto summary = p.dem->summary();
        auto sinfo = p.seek_info();

        g_tickrate = summary.playback_time() / summary.playback_ticks();

        ret["playback_time"] = summary.playback_time();
        ret["playback_ticks"] = summary.playback_ticks();
        ret["playback_frames"] = summary.playback_frames();
        ret["time_pregame"] = sinfo.pregamestart;
        ret["time_game"] = sinfo.gamestart;
        ret["finished_at"] = summary.game_info().dota().end_time();
        ret["leagueid"] = summary.game_info().dota().leagueid();
        ret["matchid"] = summary.game_info().dota().match_id();
        ret["mode"] = summary.game_info().dota().game_mode();
        ret["team_dire"] = json::array();
        ret["team_radiant"] = json::array();
        ret["tickrate"] = g_tickrate;

        for (auto &player : summary.game_info().dota().player_info()) {
            json p;
            p["hero"] = player.hero_name();
            p["name"] = player.player_name();
            p["steamid"] = player.steamid();

            if (player.game_team() == 2) {
                ret["team_radiant"].push_back(p);
            } else {
                ret["team_dire"].push_back(p);
            }
        }

        // Get Broadcaster data
        auto pres = entity_by_class("CDOTA_PlayerResource");
        ret["channels"] = json::array();

        if (pres && pres->has("m_vecBrodcasterData"_chash)) {
            uint32_t channels = pres->get("m_vecBrodcasterData"_chash)->data.u32;
            uint32_t players = pres->get("m_vecPlayerData"_chash)->data.u32;

            std::cout << "Found " << channels << " broadcaster channels" << std::endl;

            for (uint32_t i = 0; i < channels; ++i) {
                json channel = json::object();
                std::string bc1 = "m_vecBrodcasterData."+std::to_string(i)+".m_iszBroadcasterChannelCountryCode";
                std::string bc2 = "m_vecBrodcasterData."+std::to_string(i)+".m_iszBroadcasterChannelDescription";

                channel["country"] = pres->get(bc1.c_str())->data_str;
                channel["description"] = pres->get(bc2.c_str())->data_str;
                channel["casters"] = json::array();
                channel["id"] = i;

                for (uint32_t j = 0; j < players; ++j) {
                    std::string bc3 = "m_vecPlayerData."+std::to_string(j)+".m_iBroadcasterChannel";
                    if (i != pres->get(bc3.c_str())->data.u32) continue;

                    std::string bc4 = "m_vecPlayerData."+std::to_string(j)+".m_iszPlayerName";
                    std::string bc5 = "m_vecPlayerData."+std::to_string(j)+".m_iPlayerSteamID";

                    std::cout << "Channel " << i << ", Caster " << j << std::endl;
                    json caster = json::object();
                    caster["name"] = pres->get(bc4.c_str())->data_str;
                    caster["id"] = j;
                    caster["steam"] = pres->get(bc5.c_str())->data.u64;

                    channel["casters"].push_back(caster);

                    g_channels[i].insert(pres->get(bc5.c_str())->data.u64);
                }

                ret["channels"].push_back(channel);
            }
        }

        g_cb(CB_OPEN, ret.dump().c_str());

        // send entity and stringtable info after open
        devkit_entities();
        devkit_stringtables();
    }

    void devkit_close() {
        std::lock_guard<std::mutex> lock(g_lock);

        g_cb(CB_CLOSE, "{}");
    }

    float devkit_parse(uint32_t num) {
        std::lock_guard<std::mutex> lock(g_lock);

        // Starting time
        auto t_start = getZTime();

        // data to return
        json ret;
        ret["eof"] = false;

        while (ingame_time() == (-999.999f)) {
            p.parse(&vv);
        }

        auto d_tick = p.tick + num;

        for (uint32_t i = p.tick; i < d_tick; i = p.tick) {
            if (!p.dem->good()) {
                ret["eof"] = true;
                break;
            }

            p.parse(&vv);
        }

        // set additional data
        ret["tick"] = p.tick;
        ret["pos"] = ingame_time();

        g_lock.unlock();

        // cb
        g_cb(CB_PARSE, ret.dump().c_str());

        // calculate time spend
        float frame = (float)(p.tick-d_tick) * g_tickrate * 1000000.0f;
        float spend = (frame*2) - (getZTime() - t_start);

        if (spend < 0) {
            return 0;
        }

        return (spend / 1000.0f);
    }

    void devkit_seek(uint32_t num) {
        // lock scope
        {
            std::lock_guard<std::mutex> lock(g_lock);

            p.seek(num);

            json ret;
            ret["tick"] = p.tick;
            ret["pos"] = ingame_time();

            g_cb(CB_SEEK, ret.dump().c_str());
        }

        // send entity and stringtable info after parse
        devkit_entities();
        devkit_stringtables();
    }

    void devkit_subscribe(uint32_t type, uint32_t value) {
        std::lock_guard<std::mutex> lock(g_lock);

        switch (type) {
        case SUB_ENT:
            g_subents.insert(value);
            break;
        case SUB_ENTTYPE:
            g_subtypes.insert(value);
            break;
        case SUB_STRINGTABLE:
            g_subtable.insert(value);
            break;
        case SUB_EDELTA:
            g_subedelta = true;
            break;
        case SUB_AUDIO:
            if (value < 6 || value == 999) g_subaudio = value;
            std::cout << "Subscribed to audio channel " << value << std::endl;
            break;
        default: break;
        }

        g_cb(CB_SUBSCRIBE, "{}");
    }

    void devkit_unsubscribe(uint32_t type, uint32_t value) {
        std::lock_guard<std::mutex> lock(g_lock);

        switch (type) {
        case SUB_ENT: {
            auto it = g_subents.find(value);
            if (it != g_subents.end()) {
                g_subents.erase(it);
            }
        } break;
        case SUB_ENTTYPE: {
            auto it = g_subtypes.find(value);
            if (it != g_subtypes.end()) {
                g_subtypes.erase(it);
            }
        } break;
        case SUB_STRINGTABLE: {
            auto it = g_subtable.find(value);
            if (it != g_subtable.end()) {
                g_subtable.erase(it);
            }
        } break;
        case SUB_EDELTA:
            g_subedelta = false;
            break;
        default: break;
        }

        g_cb(CB_UNSUBSCRIBE, "{}");
    }

    void devkit_status() {
        std::lock_guard<std::mutex> lock(g_lock);
        g_cb(CB_STATUS, "{}");
    }

    void devkit_classes() {
        std::lock_guard<std::mutex> lock(g_lock);

        json ret;
        auto &c = p.classes.classes;

        for (auto &cls : c) {
            json row;
            row["id"] = cls.index;
            row["name"] = cls.key;
            row["type"] = cls->type;
            row["hash"] = cls->hash;

            ret.push_back(row);
        }

        g_cb(CB_CLASSES, ret.dump().c_str());
    }

    void devkit_baselines() {
        std::lock_guard<std::mutex> lock(g_lock);

        json ret;

        for (uint32_t i = 0; i < p.entities.size(); ++i) {
            if (p.baselines[i]) {
                json row;
                row["id"] = i;
                row["class"] = p.classes->by_index(p.entities[i]->cls).key;
                row["type"] = p.entities[i]->type;
                ret.push_back(row);
            }
        }

        g_cb(CB_BASELINES, ret.dump().c_str());
    }

    void devkit_entities() {
        std::lock_guard<std::mutex> lock(g_lock);

        json ret;

        for (uint32_t i = 0; i < p.entities.size(); ++i) {
            if (p.entities[i]) {
                json row;
                row["id"] = i;
                row["class"] = p.classes->by_index(p.entities[i]->cls).key;
                row["type"] = p.entities[i]->type;
                ret.push_back(row);
            }
        }

        g_cb(CB_ENTITIES, ret.dump().c_str());
    }

    void devkit_entity(uint32_t id) {
        std::lock_guard<std::mutex> lock(g_lock);

        if (!p.entities[id])
            g_cb(CB_ENTITY, "{\"error\": \"Entity does not exist.\"}");

        g_cb(CB_ENTITY, ent_to_json(id).dump().c_str());
    }

    void devkit_stringtables() {
        std::lock_guard<std::mutex> lock(g_lock);

        json ret;

        for (auto &t : p.stringtables) {
            json tbl;
            tbl["name"] = t.key;
            tbl["id"] = t.index;

            ret.push_back(tbl);
        }

        g_cb(CB_STRINGTABLES, ret.dump().c_str());
    }

    void devkit_stringtable(uint32_t id) {
        std::lock_guard<std::mutex> lock(g_lock);

        if (!p.stringtables.has_index(id))
            g_cb(CB_STRINGTABLE, "{\"error\": \"Stringtable does not exist.\"}");

        json ret;
        ret["name"] = p.stringtables.by_index(id).key;
        ret["id"] = id;
        ret["items"] = json::array();

        for (auto &t : p.stringtables.by_index(id).value) {
            json tbl;
            tbl["name"] = t.key;
            tbl["id"] = t.index;

            if (t.value.size()) {
                tbl["userdata"] = true;
            } else {
                tbl["userdata"] = false;
            }

            ret["items"].push_back(tbl);
        }

        g_cb(CB_STRINGTABLE, ret.dump().c_str());
    }

    void devkit_scoreboard() {
        std::lock_guard<std::mutex> lock(g_lock);

        g_cb(CB_SCOREBOARD, "{}");
    }
}
