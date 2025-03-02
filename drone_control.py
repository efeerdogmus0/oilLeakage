import time
import math
import threading
from datetime import datetime
from drone_adapter import DroneAdapter

class DroneControl:
    def __init__(self, connection_address="tcp:127.0.0.1:5760", speed=5, altitude=30):
        """
        Drone control class
        
        Parameters:
        connection_address -- Drone connection address (default: "tcp:127.0.0.1:5760")
        speed -- Default flight speed (m/s)
        altitude -- Default flight altitude (m)
        """
        self.connection_address = connection_address
        self.speed = speed
        self.altitude = altitude
        
        # Drone adapter
        self.drone = None
        
        # Drone state
        self.connected = False
        self.armed = False
        self.flying = False
        self.mode = "GUIDED"
        self.position = {"latitude": 41.0082, "longitude": 28.9784, "altitude": 0}
        self.target = None
        self.battery = {"level": 100, "voltage": 12.6}
        
        # Scan state
        self.scan_active = False
        self.scan_cancel = False
        self.scan_thread = None
        self.scan_progress = 0
        
        # Callbacks
        self.location_callback = None
        self.status_callback = None
        self.detection_callback = None
    
    def connect(self, connection_address=None):
        """Connect to drone"""
        if connection_address:
            self.connection_address = connection_address
            
        print(f"Connecting to drone at: {self.connection_address}")
        
        # Create drone adapter
        self.drone = DroneAdapter(self.connection_address)
        
        # Add callbacks
        self.drone.add_callback("location_callback", self._on_location_changed)
        self.drone.add_callback("status_callback", self._on_status_changed)
        self.drone.add_callback("detection_callback", self._on_detection)
        
        # Connect to drone
        if self.drone.connect():
            self.connected = True
            return True
        else:
            self.drone = None
            return False
    
    def disconnect(self):
        """Disconnect from drone"""
        if not self.connected:
            return False
            
        if self.drone:
            self.drone.close()
            self.drone = None
            
        self.connected = False
        self.armed = False
        self.flying = False
        return True
    
    def arm(self):
        """Arm the drone"""
        if not self.connected:
            return False
        
        if self.drone.arm():
            self.armed = True
            return True
        return False
    
    def takeoff(self, altitude=None):
        """Take off the drone"""
        if not self.connected or not self.armed:
            return False
        
        target_altitude = altitude if altitude is not None else self.altitude
        
        if self.drone.takeoff(target_altitude):
            self.flying = True
            return True
        return False
    
    def land(self):
        """Land the drone"""
        if not self.connected or not self.flying:
            return False
        
        return self.drone.land()
    
    def rtl(self):
        """Return to Launch - Return to starting point"""
        if not self.connected or not self.flying:
            return False
        
        return self.drone.rtl()
    
    def goto_location(self, latitude, longitude, altitude=None):
        """Go to specified GPS location"""
        if not self.connected or not self.flying:
            return False
        
        target_altitude = altitude if altitude is not None else self.altitude
        
        return self.drone.goto(latitude, longitude, target_altitude)
    
    def set_speed(self, speed):
        """Set drone speed in m/s"""
        if not self.connected:
            return False
            
        self.speed = float(speed)
        return self.drone.set_speed(self.speed)
    
    def set_altitude(self, altitude):
        """Set default flight altitude in meters"""
        if not self.connected:
            return False
            
        self.altitude = float(altitude)
        return True
    
    def calculate_distance(self, pos1, pos2):
        """Calculate distance between two positions in meters"""
        # This is a simplified calculation
        # For better accuracy, use Haversine formula
        
        # Earth's radius in km
        R = 6371.0
        
        # Convert coordinates to radians
        lat1 = math.radians(pos1["latitude"])
        lon1 = math.radians(pos1["longitude"])
        lat2 = math.radians(pos2["latitude"])
        lon2 = math.radians(pos2["longitude"])
        
        # Differences
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        
        # Haversine formula
        a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = R * c
        
        # Return distance in meters
        return distance * 1000
    
    def start_scan(self, northwest, southeast, distance, altitude=None):
        """Start area scan"""
        if not self.connected or not self.armed:
            return False
        
        self.scan_active = True
        self.scan_cancel = False
        self.scan_progress = 0
        
        scan_altitude = altitude if altitude is not None else self.altitude
        
        if self.drone.start_scan(northwest, southeast, distance, scan_altitude):
            return True
        else:
            self.scan_active = False
            return False
    
    def cancel_scan(self):
        """Cancel active scan"""
        if not self.scan_active:
            return False
            
        self.scan_cancel = True
        if self.drone:
            self.drone.cancel_scan()
        
        self.scan_active = False
        return True
    
    def get_status(self):
        """Get drone status"""
        return {
            "connected": self.connected,
            "status": "Ready" if self.connected and self.armed else "Standby" if self.connected else "Disconnected",
            "armed": self.armed,
            "mode": self.mode,
            "location": {
                "latitude": self.position["latitude"],
                "longitude": self.position["longitude"],
                "altitude": self.position["altitude"]
            },
            "battery": {
                "level": self.battery["level"],
                "voltage": self.battery["voltage"]
            }
        }
    
    def _on_location_changed(self, location):
        """Handle location change callback"""
        if location:
            self.position = location
            
            # Call external callback if set
            if self.location_callback:
                self.location_callback(location)
    
    def _on_status_changed(self, status):
        """Handle status change callback"""
        if not status:
            return
            
        # Update drone state
        if "armed" in status:
            self.armed = status["armed"]
            
        if "mode" in status:
            self.mode = status["mode"]
            
        if "location" in status:
            self.position = status["location"]
            
        if "battery" in status:
            self.battery = status["battery"]
            
        if "scan_active" in status:
            self.scan_active = status["scan_active"]
            
        if "scan_progress" in status:
            self.scan_progress = status["scan_progress"]
            
        # Call external callback if set
        if self.status_callback:
            self.status_callback(status)
    
    def _on_detection(self, detection):
        """Handle detection callback"""
        # Call external callback if set
        if self.detection_callback and detection:
            self.detection_callback(detection)
    
    def set_location_callback(self, callback):
        """Set location update callback"""
        self.location_callback = callback
    
    def set_status_callback(self, callback):
        """Set status update callback"""
        self.status_callback = callback
    
    def set_detection_callback(self, callback):
        """Set detection callback"""
        self.detection_callback = callback 