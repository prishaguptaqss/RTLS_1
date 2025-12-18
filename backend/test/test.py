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
 
BROKER = "192.168.1.232"
PORT = 1883
TOPIC = "Hospital"
COLLECT_SECONDS = 2.0  # 3, Scan window duration in seconds
LOSS_SECONDS = 30.0     # 20, mark tag as lost if not seen for this many seconds
MIN_SAMPLES = 2        # 3, minimum packets per gateway per window *****************************
HYSTERESIS_DB = 5.0 # 6 ********************************
EMA_ALPHA = 0.5  # 0.4 ******************smoothing factor (0.2–0.4 is good)
 
BACKEND_URL = "http://192.168.1.125:3000/api/events/location-event"
 
_messages = []            # shared list of incoming records
_lock = threading.Lock()  # protects _messages
 
# persistent map: mac -> currently selected best gateway (string), Dictionary storing best gateway per tag at the moment.
best_map = {}
# last_seen: mac -> timestamp (time.time()) of last observation, Dictionary storing last seen time per tag.
last_seen = {}
 
# NEW: exponential moving average RSSI
ema_rssi = defaultdict(dict)  # mac -> gw -> ema_rssi
 
# ---------------- BACKEND SENDER ----------------
def send_location_event(event_type, tag_id, to_room=None, from_room=None, last_room=None):
    payload = {
        "event_type": event_type,
        "tag_id": tag_id,
        "timestamp": int(time.time())
    }
 
    if to_room:
        payload["to_room"] = to_room
    if from_room:
        payload["from_room"] = from_room
 
    try:
        r = requests.post(BACKEND_URL, json=payload, timeout=3)
        if r.status_code == 200:
            print("    ✓ Backend updated")
        else:
            print(f"    ✗ Backend error {r.status_code}: {r.text}")
    except Exception as e:
        print(f"    ✗ Backend send failed: {e}")
 
def async_send(*args, **kwargs):
    print("Starting async send thread")
    print(kwargs)
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
    gw = payload.get("Gtway", payload.get("Gw", payload.get("Gw_id", None)))   # Change
    name = payload.get("name", None)
    ts = payload.get("ts", None)                                               # Change
 
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
        "ts": ts,                                                                 # Change                    
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