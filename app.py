from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO
from drone_control import DroneControl
from image_processing import OilLeakDetection
import threading
import time

# Create Flask application
app = Flask(__name__)
socketio = SocketIO(app)

# Create drone controller and detector
drone = DroneControl()
detector = OilLeakDetection()

# Home page
@app.route('/')
def index():
    return render_template('index.html')

# Map page
@app.route('/map')
def map():
    return render_template('map.html')

# Settings page
@app.route('/settings')
def settings():
    return render_template('settings.html')

# Detections page
@app.route('/detections')
def detections():
    return render_template('detections.html')

# Drone connection API
@app.route('/api/drone/connect', methods=['POST'])
def drone_connect():
    try:
        connection_address = request.json.get('connection_address', None)
        if drone.connect(connection_address):
            return jsonify({"status": "success"})
        return jsonify({"status": "failed", "error": "Could not connect"})
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)})

# Drone disconnect API
@app.route('/api/drone/disconnect', methods=['POST'])
def drone_disconnect():
    try:
        if drone.disconnect():
            return jsonify({"status": "success"})
        return jsonify({"status": "failed", "error": "Could not disconnect"})
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)})

# Drone arm API
@app.route('/api/drone/arm', methods=['POST'])
def drone_arm():
    try:
        if drone.arm():
            return jsonify({"status": "success"})
        return jsonify({"status": "failed", "error": "Could not arm"})
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)})

# Drone takeoff API
@app.route('/api/drone/takeoff', methods=['POST'])
def drone_takeoff():
    try:
        altitude = request.json.get('altitude', None)
        if drone.takeoff(altitude):
            return jsonify({"status": "success"})
        return jsonify({"status": "failed", "error": "Could not takeoff"})
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)})

# Drone land API
@app.route('/api/drone/land', methods=['POST'])
def drone_land():
    try:
        if drone.land():
            return jsonify({"status": "success"})
        return jsonify({"status": "failed", "error": "Could not land"})
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)})

# Drone RTL API
@app.route('/api/drone/rtl', methods=['POST'])
def drone_rtl():
    try:
        if drone.rtl():
            return jsonify({"status": "success"})
        return jsonify({"status": "failed", "error": "Could not start RTL"})
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)})

# Drone goto location API
@app.route('/api/drone/goto', methods=['POST'])
def drone_goto():
    try:
        data = request.json
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        altitude = data.get('altitude', None)
        
        if drone.goto_location(latitude, longitude, altitude):
            return jsonify({"status": "success"})
        return jsonify({"status": "failed", "error": "Could not go to location"})
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)})

# Set drone speed API
@app.route('/api/drone/set_speed', methods=['POST'])
def set_drone_speed():
    try:
        speed = request.json.get('speed')
        if drone.set_speed(speed):
            return jsonify({"status": "success"})
        return jsonify({"status": "failed", "error": "Could not set speed"})
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)})

# Set drone altitude API
@app.route('/api/drone/set_altitude', methods=['POST'])
def set_drone_altitude():
    try:
        altitude = request.json.get('altitude')
        if drone.set_altitude(altitude):
            return jsonify({"status": "success"})
        return jsonify({"status": "failed", "error": "Could not set altitude"})
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)})

# Start scan API
@app.route('/api/scan/start', methods=['POST'])
def start_scan():
    try:
        data = request.json
        northwest = (data['northwest']['latitude'], data['northwest']['longitude'])
        southeast = (data['southeast']['latitude'], data['southeast']['longitude'])
        distance = data.get('distance', 50)
        altitude = data.get('altitude', None)
        
        if drone.start_scan(northwest, southeast, distance, altitude):
            return jsonify({"status": "success"})
        return jsonify({"status": "failed", "error": "Could not start scan"})
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)})

# Cancel scan API
@app.route('/api/scan/cancel', methods=['POST'])
def cancel_scan():
    try:
        if drone.cancel_scan():
            return jsonify({"status": "success"})
        return jsonify({"status": "failed", "error": "Could not cancel scan"})
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)})

# Send drone status
def send_status():
    while True:
        try:
            status = drone.get_status()
            socketio.emit('drone_status', status)
        except Exception as e:
            print(f"Status sending error: {e}")
        time.sleep(0.1)  # Update every 100ms

# SocketIO connection events
@socketio.on('connect')
def handle_connect():
    print('Web client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Web client disconnected')

if __name__ == '__main__':
    # Start status sending process in background
    threading.Thread(target=send_status, daemon=True).start()
    
    # Start Flask application
    socketio.run(app, host='0.0.0.0', port=5000, debug=True) 