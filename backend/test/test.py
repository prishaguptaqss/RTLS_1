# import time
# import requests
# from datetime import datetime

# # ---------------- CONFIG ----------------
# TAG_ID = "E2:D5:A0:F5:79:99"
# ROOM_CHANGE_INTERVAL = 60  
# BACKEND_URL = "http://localhost:3000/api/events/location-event"

# # Rooms to cycle through
# ROOMS = ["Room 101", "Room 102", "Room 104", "Room 105"]

# # ----------------------------------------

# def now():
#     return datetime.now()

# def send_location_event(event_type, tag_id, to_room=None, from_room=None):
#     """Send location event to backend API."""
#     payload = {
#         "event_type": event_type,
#         "tag_id": tag_id,
#         "timestamp": int(time.time())
#     }

#     if to_room:
#         payload["to_room"] = to_room
#     if from_room:
#         payload["from_room"] = from_room

#     try:
#         response = requests.post(BACKEND_URL, json=payload, timeout=5)
#         if response.status_code == 200:
#             print(f"    ✓ Backend updated successfully")
#             return True
#         else:
#             print(f"    ✗ Backend error: {response.status_code} - {response.text}")
#             return False
#     except requests.exceptions.ConnectionError:
#         print(f"    ✗ Could not connect to backend at {BACKEND_URL}")
#         return False
#     except Exception as e:
#         print(f"    ✗ Error sending to backend: {e}")
#         return False

# # ---------------- MAIN ----------------
# print("=" * 60)
# print(f"RTLS Simulator - Cycling through rooms every {ROOM_CHANGE_INTERVAL} seconds")
# print(f"Tag: {TAG_ID}")
# print(f"Rooms: {' → '.join(ROOMS)} (loop)")
# print("=" * 60)
# print()

# # Send initial location
# current_room_idx = 0
# current_room = ROOMS[current_room_idx]

# print(f"[{now()}] INITIAL LOCATION: {current_room}")
# send_location_event("INITIAL_LOCATION", TAG_ID, to_room=current_room)
# print()

# # Cycle through rooms
# while True:
#     time.sleep(ROOM_CHANGE_INTERVAL)

#     # Move to next room
#     previous_room = current_room
#     current_room_idx = (current_room_idx + 1) % len(ROOMS)
#     current_room = ROOMS[current_room_idx]

#     print(f"[{now()}] LOCATION CHANGE: {previous_room} → {current_room}")
#     send_location_event("LOCATION_CHANGE", TAG_ID, from_room=previous_room, to_room=current_room)
#     print()

#!/usr/bin/env python3
# """
# ble_mqtt_bestgw.py
 
# Subscribe to MQTT topic "Hospital", collect adverts in 2s windows,
# compute average RSSI per gateway for each MAC, choose the best gateway,
# and print only when a tag's best gateway changes (or on first assignment).
# """
 
# import time
# import json
# import threading
# from collections import defaultdict
# import requests

# import paho.mqtt.client as mqtt
# from flask import Flask, request, jsonify

# # Configuration Flask app for runtime threshold updates
# config_app = Flask(__name__)

# BROKER = "192.168.1.232"
# PORT = 1883
# TOPIC = "Hospital"
# COLLECT_SECONDS = 2.0  # 3, Scan window duration in seconds
# LOSS_SECONDS = 30.0     # 20, mark tag as lost if not seen for this many seconds (configurable via API)
# MIN_SAMPLES = 2        # 3, minimum packets per gateway per window *****************************
# HYSTERESIS_DB = 5.0 # 6 ********************************
# EMA_ALPHA = 0.5  # 0.4 ******************smoothing factor (0.2–0.4 is good)

# BACKEND_URL = "http://192.168.1.204:3000/api/events/location-event"
# ORGANIZATION_ID = "ORG-002"  # SET THIS TO YOUR ORGANIZATION ID
 
# _messages = []            # shared list of incoming records
# _lock = threading.Lock()  # protects _messages
 
# # persistent map: mac -> currently selected best gateway (string), Dictionary storing best gateway per tag at the moment.
# best_map = {}
# # last_seen: mac -> timestamp (time.time()) of last observation, Dictionary storing last seen time per tag.
# last_seen = {}
 
# # NEW: exponential moving average RSSI
# ema_rssi = defaultdict(dict)  # mac -> gw -> ema_rssi

# # ---------------- FLASK CONFIG API ----------------
# @config_app.route('/config/threshold', methods=['GET'])
# def get_threshold():
#     """Get current LOSS_SECONDS threshold."""
#     return jsonify({'threshold_seconds': LOSS_SECONDS})

# @config_app.route('/config/threshold', methods=['PUT'])
# def update_threshold():
#     """Update LOSS_SECONDS threshold at runtime."""
#     global LOSS_SECONDS
#     data = request.json
#     new_threshold = float(data.get('threshold_seconds', LOSS_SECONDS))

#     if new_threshold < 5 or new_threshold > 3600:
#         return jsonify({'error': 'Threshold must be between 5 and 3600 seconds'}), 400

#     LOSS_SECONDS = new_threshold
#     print(f"[CONFIG] Threshold updated to {LOSS_SECONDS} seconds")
#     return jsonify({'success': True, 'threshold_seconds': LOSS_SECONDS})

# # ---------------- BACKEND SENDER ----------------
# def send_location_event(event_type, tag_id, to_room=None, from_room=None, last_room=None):
#     payload = {
#         "event_type": event_type,
#         "tag_id": tag_id,
#         "timestamp": int(time.time())
#     }

#     if to_room:
#         payload["to_room"] = to_room
#     if from_room:
#         payload["from_room"] = from_room
#     if last_room:
#         payload["last_room"] = last_room

#     # Add organization ID to headers
#     headers = {
#         "Content-Type": "application/json",
#         "X-Organization-ID": str(ORGANIZATION_ID)
#     }

#     try:
#         r = requests.post(BACKEND_URL, json=payload, headers=headers, timeout=3)
#         if r.status_code == 200:
#             print("    ✓ Backend updated")
#         else:
#             print(f"    ✗ Backend error {r.status_code}: {r.text}")
#     except Exception as e:
#         print(f"    ✗ Backend send failed: {e}")
 
# def async_send(*args, **kwargs):
#     threading.Thread(
#         target=send_location_event,
#         args=args,
#         kwargs=kwargs,
#         daemon=True
#     ).start()
 
# def on_message(client, userdata, message):
#     try:
#         payload = json.loads(message.payload.decode(errors="ignore"))
#     except Exception:
#         return
 
#     # extract fields (tolerant to naming)
#     mac = payload.get("mac")
#     rssi = payload.get("rssi")
#     gw = payload.get("Gtway", payload.get("Gw", payload.get("Gw_id", None)))   # Change
#     name = payload.get("name", None)
#     ts = payload.get("ts", None)                                               # Change
 
#     if mac is None or rssi is None or gw is None:
#         return
 
#     try:
#         rssi_val = int(rssi)
#     except Exception:
#         try:
#             rssi_val = int(float(rssi))
#         except Exception:
#             return
 
#     record = {
#         "arrival": time.time(),
#         "ts": ts,                                                                 # Change                    
#         "mac": mac,
#         "rssi": rssi_val,
#         "gw": str(gw),
#         "name": name,
#     }
 
#     with _lock:
#         _messages.append(record)
 
# def process_batch(records):
 
#     """
#     This section compute avg RSSI per gateway and picks best for each MAC in records.
#     Compare with best_map(a dictionary containing key as the tag MAC and its value as the Gateway its colosest to or with max RSSI)
#     and print only on new assignment or change in the closest Gateway.
#     """
#     if not records:
#         # still check for timeout/lost tags even if no records this window
#         detect_and_cleanup_lost_tags()
#         return
 
#     data = defaultdict(lambda: defaultdict(list))
#     latest_arrival = {}  # mac -> latest arrival timestamp (float)
 
#     for r in records:
#         data[r["mac"]][r["gw"]].append(r["rssi"])
#         latest_arrival[r["mac"]] = max(latest_arrival.get(r["mac"], 0), r["arrival"])
 
 
#     now = time.strftime("%Y-%m-%d %H:%M:%S")
#     # iterate tags
#     for mac, gw_map in data.items():
#         # compute average per gw
#         #gw_avg = { gw: (sum(lst)/len(lst), len(lst)) for gw, lst in gw_map.items() } *************************
       
#         gw_avg = {    # From here ********************************************
#             gw: (sum(lst)/len(lst), len(lst))
#             for gw, lst in gw_map.items()
#             if len(lst) >= MIN_SAMPLES
#         }
 
# # If no gateway has enough samples, skip this tag
#         if not gw_avg:
#             continue
#         # Apply EMA smoothing per (tag, gateway)
#         for gw, (avg, cnt) in gw_avg.items():
#             prev_ema = ema_rssi[mac].get(gw)
#             if prev_ema is None:
#                 ema_rssi[mac][gw] = avg
#             else:
#                 ema_rssi[mac][gw] = EMA_ALPHA * avg + (1 - EMA_ALPHA) * prev_ema # Till here ***********************
 
#         # pick gw with max average RSSI (higher is better; -40 > -70)
#         #best_gw, (best_avg, best_count) = max(gw_avg.items(), key=lambda kv: kv[1][0])
#         # Only consider gateways seen in this batch
#         valid_ema = {
#             gw: ema
#             for gw, ema in ema_rssi[mac].items()
#             if gw in gw_avg
#         }
 
#         # Fallback safety
#         if not valid_ema:
#             continue
 
#         best_gw = max(valid_ema.items(), key=lambda kv: kv[1])[0]
#         best_avg = valid_ema[best_gw]
 
       
#         #best_gw = max(ema_rssi[mac].items(), key=lambda kv: kv[1])[0]
#         #best_avg = ema_rssi[mac][best_gw]
#         best_count = gw_avg.get(best_gw, (None, 0))[1]
 
#         prev = best_map.get(mac)
#         if prev is None:
#             # first time seeing this tag -> print initial assignment
#             print(f"[{now}] Tag {mac} initial best gateway is-> {best_gw} (with avg {best_avg:.1f} dBm RSSI, samples {best_count})")
#             # print details of all gws for context
#             #for gw, (avg, cnt) in sorted(gw_avg.items(), key=lambda kv: kv[1][0], reverse=True):
#                 #print(f"    gw={gw:>12} avg={avg:6.1f} dBm samples={cnt}")
#             print("-" * 50)
#             best_map[mac] = best_gw
#             # Send initial location event to backend
#             async_send("INITIAL_LOCATION", mac, to_room=best_gw)
#         elif prev != best_gw:
#             prev_ema = ema_rssi[mac].get(prev)
 
#     # Hysteresis check: require meaningful improvement
#             if prev_ema is not None and best_avg < prev_ema + HYSTERESIS_DB:            
#              # Ignore small fluctuation
#              continue
 
#     # Accept room change
#             print(f"[{now}] Tag {mac} changed best: {prev} -> {best_gw}")
#             print(f"    new best: {best_gw} (EMA {best_avg:.1f} dBm, samples {best_count})")
#             print("-" * 50)

#             best_map[mac] = best_gw
#             # Send location change event to backend
#             async_send("LOCATION_CHANGE", mac, from_room=prev, to_room=best_gw)

#         # else: no change, do nothing (silent)
#         last_seen[mac] = latest_arrival.get(mac, time.time())
# # After handling observed tags, check for timeouts (lost tags)
#     detect_and_cleanup_lost_tags()
 
# def detect_and_cleanup_lost_tags():
#     """Remove tags not seen within LOSS_SECONDS and print 'tag lost' lines"""
#     now = time.time()
#     lost_list = []
#     for mac, last in list(last_seen.items()):
#         if (now - last) > LOSS_SECONDS:
#             lost_list.append(mac)
 
#     for mac in lost_list:
#         prev_best = best_map.pop(mac, None)
#         last_seen.pop(mac, None)
#         tstr = time.strftime("%Y-%m-%d %H:%M:%S")
#         print(f"[{tstr}] Tag {mac} LOST (no adverts for {LOSS_SECONDS:.0f}s). Last location: {prev_best}")
#         print("-" * 50)
#         # Send tag lost event to backend
#         if prev_best:
#             async_send("TAG_LOST", mac, last_room=prev_best)
 
# def batch_loop():
#     print(f"Starting batch processor: {COLLECT_SECONDS}s windows. Printing only when best gateway changes.")
#     while True:
#         time.sleep(COLLECT_SECONDS)
#         with _lock:
#             if not _messages:
#                 batch = []
#             else:
#                 batch = _messages[:]
#                 _messages.clear()
#         process_batch(batch)
 
# def main():
#     # Start Flask configuration API server in background thread
#     print("Starting Flask configuration API on port 5001...")
#     flask_thread = threading.Thread(
#         target=lambda: config_app.run(host='0.0.0.0', port=5001, use_reloader=False),
#         daemon=True
#     )
#     flask_thread.start()
#     print("Configuration API started at http://localhost:5001")

#     # Start MQTT client
#     client = mqtt.Client()
#     client.on_message = on_message
#     client.connect(BROKER, PORT)
#     client.subscribe(TOPIC)
#     client.loop_start()

#     try:
#         batch_loop()
#     except KeyboardInterrupt:    # Press Ctrl+C to stop the program
#         print("Exiting...")
#     finally:
#         client.loop_stop()
#         client.disconnect()
 
# if __name__ == "__main__":
#     main()

# import time
# import requests
# from datetime import datetime

# # ---------------- CONFIG ----------------
# TAG_ID = "E2:D5:A0:F5:79:99"
# ROOM_CHANGE_INTERVAL = 60  
# BACKEND_URL = "http://localhost:3000/api/events/location-event"

# # Rooms to cycle through
# ROOMS = ["Room 101", "Room 102", "Room 104", "Room 105"]

# # ----------------------------------------

# def now():
#     return datetime.now()

# def send_location_event(event_type, tag_id, to_room=None, from_room=None):
#     """Send location event to backend API."""
#     payload = {
#         "event_type": event_type,
#         "tag_id": tag_id,
#         "timestamp": int(time.time())
#     }

#     if to_room:
#         payload["to_room"] = to_room
#     if from_room:
#         payload["from_room"] = from_room

#     try:
#         response = requests.post(BACKEND_URL, json=payload, timeout=5)
#         if response.status_code == 200:
#             print(f"    ✓ Backend updated successfully")
#             return True
#         else:
#             print(f"    ✗ Backend error: {response.status_code} - {response.text}")
#             return False
#     except requests.exceptions.ConnectionError:
#         print(f"    ✗ Could not connect to backend at {BACKEND_URL}")
#         return False
#     except Exception as e:
#         print(f"    ✗ Error sending to backend: {e}")
#         return False

# # ---------------- MAIN ----------------
# print("=" * 60)
# print(f"RTLS Simulator - Cycling through rooms every {ROOM_CHANGE_INTERVAL} seconds")
# print(f"Tag: {TAG_ID}")
# print(f"Rooms: {' → '.join(ROOMS)} (loop)")
# print("=" * 60)
# print()

# # Send initial location
# current_room_idx = 0
# current_room = ROOMS[current_room_idx]

# print(f"[{now()}] INITIAL LOCATION: {current_room}")
# send_location_event("INITIAL_LOCATION", TAG_ID, to_room=current_room)
# print()

# # Cycle through rooms
# while True:
#     time.sleep(ROOM_CHANGE_INTERVAL)

#     # Move to next room
#     previous_room = current_room
#     current_room_idx = (current_room_idx + 1) % len(ROOMS)
#     current_room = ROOMS[current_room_idx]

#     print(f"[{now()}] LOCATION CHANGE: {previous_room} → {current_room}")
#     send_location_event("LOCATION_CHANGE", TAG_ID, from_room=previous_room, to_room=current_room)
#     print()

#!/usr/bin/env python3
"""
ble_mqtt_bestgw.py
 
Subscribe to MQTT topic "Hospital", collect adverts in 2s windows,
compute average RSSI per gateway for each MAC, choose the best gateway,
and print only when a tag's best gateway changes (or on first assignment).
"""
 
import time
import json
import threading
from collections import defaultdict
import requests

import paho.mqtt.client as mqtt
from flask import Flask, request, jsonify

# Configuration Flask app for runtime threshold updates
config_app = Flask(__name__)

BROKER = "192.168.1.245"
PORT = 1883
TOPIC = "Hospital"
COLLECT_SECONDS = 2.0  # 3, Scan window duration in seconds
LOSS_SECONDS = 30.0     # 20, mark tag as lost if not seen for this many seconds (configurable via API)
MIN_SAMPLES = 2        # 3, minimum packets per gateway per window *****************************
HYSTERESIS_DB = 5.0 # 6 ********************************
EMA_ALPHA = 0.5  # 0.4 ******************smoothing factor (0.2–0.4 is good)

BACKEND_URL = "http://192.168.1.103:3000/api/events/location-event"
ORGANIZATION_ID = "1"  # DEPRECATED: Will be replaced by dynamic lookup
EXPECTED_ORGANIZATION_ID = 1  # For validation (numeric, not string)
ANCHOR_CACHE_TTL = 300  # 5 minutes in seconds
ANCHOR_API_URL = "http://192.168.1.103:3000/api/devices"  # Base URL for anchor lookup
ENABLE_ORGANIZATION_VALIDATION = True  # Set False to disable validation during testing

_messages = []            # shared list of incoming records
_lock = threading.Lock()  # protects _messages

# Anchor cache: {anchor_id: {"organization_id": 1, "room_id": 3, "status": "active", "cached_at": timestamp}}
anchor_cache = {}
anchor_cache_lock = threading.Lock()

# Cache statistics for monitoring
cache_stats = {
    "hits": 0,
    "misses": 0,
    "backend_errors": 0,
    "validation_failures": 0
}
 
# persistent map: mac -> currently selected best gateway (string), Dictionary storing best gateway per tag at the moment.
best_map = {}
# last_seen: mac -> timestamp (time.time()) of last observation, Dictionary storing last seen time per tag.
last_seen = {}
 
# NEW: exponential moving average RSSI
ema_rssi = defaultdict(dict)  # mac -> gw -> ema_rssi

# ---------------- FLASK CONFIG API ----------------
@config_app.route('/config/threshold', methods=['GET'])
def get_threshold():
    """Get current LOSS_SECONDS threshold."""
    return jsonify({'threshold_seconds': LOSS_SECONDS})

@config_app.route('/config/threshold', methods=['PUT'])
def update_threshold():
    """Update LOSS_SECONDS threshold at runtime."""
    global LOSS_SECONDS
    data = request.json
    new_threshold = float(data.get('threshold_seconds', LOSS_SECONDS))

    if new_threshold < 5 or new_threshold > 3600:
        return jsonify({'error': 'Threshold must be between 5 and 3600 seconds'}), 400

    LOSS_SECONDS = new_threshold
    print(f"[CONFIG] Threshold updated to {LOSS_SECONDS} seconds")
    return jsonify({'success': True, 'threshold_seconds': LOSS_SECONDS})

@config_app.route('/config/cache-stats', methods=['GET'])
def get_cache_stats():
    """Get anchor cache statistics."""
    with anchor_cache_lock:
        cache_size = len(anchor_cache)
        cache_entries = [
            {
                "anchor_id": aid,
                "organization_id": data.get("organization_id"),
                "room_id": data.get("room_id"),
                "age_seconds": int(time.time() - data["cached_at"]),
                "not_found": data.get("not_found", False)
            }
            for aid, data in anchor_cache.items()
        ]

    return jsonify({
        'cache_size': cache_size,
        'cache_ttl': ANCHOR_CACHE_TTL,
        'stats': cache_stats,
        'entries': cache_entries
    })

@config_app.route('/config/cache-clear', methods=['POST'])
def clear_cache():
    """Clear anchor cache."""
    with anchor_cache_lock:
        size = len(anchor_cache)
        anchor_cache.clear()
        cache_stats["hits"] = 0
        cache_stats["misses"] = 0
        cache_stats["backend_errors"] = 0
        cache_stats["validation_failures"] = 0
    print(f"[CONFIG] Cache cleared ({size} entries removed)")
    return jsonify({'success': True, 'cleared_entries': size})

# ---------------- ANCHOR ORGANIZATION LOOKUP ----------------
def get_anchor_organization(anchor_id):
    """
    Query backend to get organization_id for an anchor.
    Uses cache with 5-minute TTL to minimize backend calls.

    Returns: (organization_id, room_id, status) or (None, None, None) if not found
    """
    now = time.time()

    # Check cache first
    with anchor_cache_lock:
        if anchor_id in anchor_cache:
            cached_data = anchor_cache[anchor_id]
            age = now - cached_data["cached_at"]

            # Handle "not found" entries (1-minute TTL)
            if cached_data.get("not_found"):
                if age < 60:
                    cache_stats["hits"] += 1
                    return None, None, None
                else:
                    del anchor_cache[anchor_id]
            # Handle valid entries (5-minute TTL)
            elif age < ANCHOR_CACHE_TTL:
                cache_stats["hits"] += 1
                return cached_data["organization_id"], cached_data["room_id"], cached_data["status"]
            else:
                del anchor_cache[anchor_id]

    # Cache miss - query backend
    cache_stats["misses"] += 1

    try:
        url = f"{ANCHOR_API_URL}/{anchor_id}/organization"
        response = requests.get(url, timeout=3)

        if response.status_code == 200:
            data = response.json()
            org_id = data["organization_id"]
            room_id = data.get("room_id")
            status = data.get("status", "active")

            # Cache successful lookup
            with anchor_cache_lock:
                anchor_cache[anchor_id] = {
                    "organization_id": org_id,
                    "room_id": room_id,
                    "status": status,
                    "cached_at": now
                }

            print(f"    [API] Anchor {anchor_id} -> org {org_id}, room {room_id}")
            return org_id, room_id, status

        elif response.status_code == 404:
            # Cache "not found" with short TTL
            with anchor_cache_lock:
                anchor_cache[anchor_id] = {
                    "not_found": True,
                    "cached_at": now
                }
            print(f"    [API 404] Anchor {anchor_id} not found")
            return None, None, None

        else:
            cache_stats["backend_errors"] += 1
            print(f"    [API ERROR] {response.status_code}: {response.text}")
            return None, None, None

    except Exception as e:
        cache_stats["backend_errors"] += 1
        print(f"    [ERROR] Backend query failed: {e}")
        return None, None, None

# ---------------- BACKEND SENDER ----------------
def send_location_event(event_type, tag_id, to_room=None, from_room=None, last_room=None):
    """
    Send location event to backend with dynamic organization validation.
    """
    # Determine which anchor to validate
    anchor_to_validate = to_room or from_room or last_room

    if ENABLE_ORGANIZATION_VALIDATION and anchor_to_validate:
        # Lookup anchor organization
        org_id, room_id, status = get_anchor_organization(anchor_to_validate)

        # Check if anchor exists
        if org_id is None:
            print(f"    ⚠ Unknown anchor: {anchor_to_validate}, skipping event")
            return False

        # Validate organization matches expected
        if org_id != EXPECTED_ORGANIZATION_ID:
            cache_stats["validation_failures"] += 1
            print(f"    ✗ Org mismatch: anchor {anchor_to_validate} is org {org_id}, expected {EXPECTED_ORGANIZATION_ID}")
            return False

        # Log warning for inactive anchors (but still send event)
        if status in ["inactive_defective", "inactive_in_store"]:
            print(f"    ⚠ Anchor {anchor_to_validate} is {status}")

        validated_org_id = org_id
    else:
        # Validation disabled - use default
        validated_org_id = ORGANIZATION_ID

    # Build payload
    payload = {
        "event_type": event_type,
        "tag_id": tag_id,
        "timestamp": int(time.time())
    }
    if to_room:
        payload["to_room"] = to_room
    if from_room:
        payload["from_room"] = from_room
    if last_room:
        payload["last_room"] = last_room

    # Add validated organization ID to headers
    headers = {
        "Content-Type": "application/json",
        "X-Organization-ID": str(validated_org_id)
    }

    try:
        r = requests.post(BACKEND_URL, json=payload, headers=headers, timeout=3)
        if r.status_code == 200:
            print("    ✓ Backend updated")
            return True
        else:
            print(f"    ✗ Backend error {r.status_code}: {r.text}")
            return False
    except Exception as e:
        print(f"    ✗ Backend send failed: {e}")
        return False
 
def async_send(*args, **kwargs):
    threading.Thread(
        target=send_location_event,
        args=args,
        kwargs=kwargs,
        daemon=True
    ).start()
 
def on_message(client, userdata, message):
    try:
        payload = json.loads(message.payload.decode(errors="ignore"))
    except Exception:
        return
 
    # extract fields (tolerant to naming)
    mac = payload.get("mac")
    rssi = payload.get("rssi")
    gw = payload.get("Gtway") #, payload.get("Gw", payload.get("Gw_id", None)))   # Change
    name = payload.get("name", None)
    #ts = payload.get("ts", None)                                               # Change
 
    if mac is None or rssi is None or gw is None:
        return
 
    try:
        rssi_val = int(rssi)
    except Exception:
        try:
            rssi_val = int(float(rssi))
        except Exception:
            return
 
    record = {
        "arrival": time.time(),
        #"ts": ts,                                                                 # Change                    
        "mac": mac,
        "rssi": rssi_val,
        "gw": str(gw),
        "name": name,
    }
 
    with _lock:
        _messages.append(record)
 
def process_batch(records):
 
    """
    This section compute avg RSSI per gateway and picks best for each MAC in records.
    Compare with best_map(a dictionary containing key as the tag MAC and its value as the Gateway its colosest to or with max RSSI)
    and print only on new assignment or change in the closest Gateway.
    """
    if not records:
        # still check for timeout/lost tags even if no records this window
        detect_and_cleanup_lost_tags()
        return
 
    data = defaultdict(lambda: defaultdict(list))
    latest_arrival = {}  # mac -> latest arrival timestamp (float)
 
    for r in records:
        data[r["mac"]][r["gw"]].append(r["rssi"])
        latest_arrival[r["mac"]] = max(latest_arrival.get(r["mac"], 0), r["arrival"])
 
 
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    # iterate tags
    for mac, gw_map in data.items():
        # compute average per gw
        #gw_avg = { gw: (sum(lst)/len(lst), len(lst)) for gw, lst in gw_map.items() } *************************
       
        gw_avg = {    # From here ********************************************
            gw: (sum(lst)/len(lst), len(lst))
            for gw, lst in gw_map.items()
            if len(lst) >= MIN_SAMPLES
        }
 
# If no gateway has enough samples, skip this tag
        if not gw_avg:
            continue
        # Apply EMA smoothing per (tag, gateway)
        for gw, (avg, cnt) in gw_avg.items():
            prev_ema = ema_rssi[mac].get(gw)
            if prev_ema is None:
                ema_rssi[mac][gw] = avg
            else:
                ema_rssi[mac][gw] = EMA_ALPHA * avg + (1 - EMA_ALPHA) * prev_ema # Till here ***********************
 
        # pick gw with max average RSSI (higher is better; -40 > -70)
        #best_gw, (best_avg, best_count) = max(gw_avg.items(), key=lambda kv: kv[1][0])
        # Only consider gateways seen in this batch
        valid_ema = {
            gw: ema
            for gw, ema in ema_rssi[mac].items()
            if gw in gw_avg
        }
 
        # Fallback safety
        if not valid_ema:
            continue
 
        best_gw = max(valid_ema.items(), key=lambda kv: kv[1])[0]
        best_avg = valid_ema[best_gw]
 
       
        #best_gw = max(ema_rssi[mac].items(), key=lambda kv: kv[1])[0]
        #best_avg = ema_rssi[mac][best_gw]
        best_count = gw_avg.get(best_gw, (None, 0))[1]
 
        prev = best_map.get(mac)
        if prev is None:
            # first time seeing this tag -> print initial assignment
            print(f"[{now}] Tag {mac} initial best gateway is-> {best_gw} (with avg {best_avg:.1f} dBm RSSI, samples {best_count})")
            # print details of all gws for context
            #for gw, (avg, cnt) in sorted(gw_avg.items(), key=lambda kv: kv[1][0], reverse=True):
                #print(f"    gw={gw:>12} avg={avg:6.1f} dBm samples={cnt}")
            print("-" * 50)
            best_map[mac] = best_gw
            # Send initial location event to backend
            async_send("INITIAL_LOCATION", mac, to_room=best_gw)
        elif prev != best_gw:
            prev_ema = ema_rssi[mac].get(prev)
 
    # Hysteresis check: require meaningful improvement
            if prev_ema is not None and best_avg < prev_ema + HYSTERESIS_DB:            
             # Ignore small fluctuation
             continue
 
    # Accept room change
            print(f"[{now}] Tag {mac} changed best: {prev} -> {best_gw}")
            print(f"    new best: {best_gw} (EMA {best_avg:.1f} dBm, samples {best_count})")
            print("-" * 50)

            best_map[mac] = best_gw
            # Send location change event to backend
            async_send("LOCATION_CHANGE", mac, from_room=prev, to_room=best_gw)

        # else: no change, do nothing (silent)
        last_seen[mac] = latest_arrival.get(mac, time.time())
# After handling observed tags, check for timeouts (lost tags)
    detect_and_cleanup_lost_tags()
 
def detect_and_cleanup_lost_tags():
    """Remove tags not seen within LOSS_SECONDS and print 'tag lost' lines"""
    now = time.time()
    lost_list = []
    for mac, last in list(last_seen.items()):
        if (now - last) > LOSS_SECONDS:
            lost_list.append(mac)
 
    for mac in lost_list:
        prev_best = best_map.pop(mac, None)
        last_seen.pop(mac, None)
        tstr = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{tstr}] Tag {mac} LOST (no adverts for {LOSS_SECONDS:.0f}s). Last location: {prev_best}")
        print("-" * 50)
        # Send tag lost event to backend
        if prev_best:
            async_send("TAG_LOST", mac, last_room=prev_best)
 
def batch_loop():
    print(f"Starting batch processor: {COLLECT_SECONDS}s windows. Printing only when best gateway changes.")
    while True:
        time.sleep(COLLECT_SECONDS)
        with _lock:
            if not _messages:
                batch = []
            else:
                batch = _messages[:]
                _messages.clear()
        process_batch(batch)
 
def main():
    # Start Flask configuration API server in background thread
    print("Starting Flask configuration API on port 5001...")
    flask_thread = threading.Thread(
        target=lambda: config_app.run(host='0.0.0.0', port=5001, use_reloader=False),
        daemon=True
    )
    flask_thread.start()
    print("Configuration API started at http://localhost:5001")

    # Start MQTT client
    client = mqtt.Client()
    client.on_message = on_message
    client.connect(BROKER, PORT)
    client.subscribe(TOPIC)
    client.loop_start()

    try:
        batch_loop()
    except KeyboardInterrupt:    # Press Ctrl+C to stop the program
        print("Exiting...")
    finally:
        client.loop_stop()
        client.disconnect()
 
if __name__ == "__main__":
    main()