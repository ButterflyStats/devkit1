
#ifndef _BUTTERFLY_DEVKIT_APP_HPP_
#define _BUTTERFLY_DEVKIT_APP_HPP_

#include <cstdint>

#define APP_EXPORT __attribute__ ((visibility ("default")))

extern "C" {
/// Callback type
typedef void (*callback)(uint32_t status, const char* json);

/// Open a replay
APP_EXPORT void devkit_open(const char* file, callback cb);

/// Close a replay
APP_EXPORT void devkit_close();

/// Parse given number of packets, returns time spend over limit
APP_EXPORT float devkit_parse(uint32_t num);

/// Seek to given position
APP_EXPORT void devkit_seek(uint32_t num);

/// Subscribe to data changes
APP_EXPORT void devkit_subscribe(uint32_t type, uint32_t value);

/// Unsubscribe from data changes
APP_EXPORT void devkit_unsubscribe(uint32_t type, uint32_t value);

/// Current replay status
APP_EXPORT void devkit_status();

/// Get a list of entity classes
APP_EXPORT void devkit_classes();

/// Get a list of current active entities
APP_EXPORT void devkit_baselines();

/// Get a list of current active entities
APP_EXPORT void devkit_entities();

/// Get the contents of a single entity
APP_EXPORT void devkit_entity(uint32_t id);

/// Get a list of active stringtables
APP_EXPORT void devkit_stringtables();

/// Get the contents of a single stringtable
APP_EXPORT void devkit_stringtable(uint32_t id);

/// Get the scoreboard
APP_EXPORT void devkit_scoreboard();
}

#endif /* _BUTTERFLY_DEVKIT_APP_HPP_ */
