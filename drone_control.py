import time
import math
import threading
from datetime import datetime

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
        
        # Simulated drone state
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
    
    def connect(self, port=None, baud_rate=None):
        """Connect to drone (simulated)"""
        time.sleep(1)  # Connection simulation
        self.connected = True
        return True
    
    def disconnect(self):
        """Disconnect from drone"""
        self.connected = False
        self.armed = False
        self.flying = False
    
    def arm(self):
        """Arm the drone"""
        if not self.connected:
            return False
        
        time.sleep(1)  # Arm operation simulation
        self.armed = True
        return True
    
    def takeoff(self, altitude=None):
        """Take off the drone"""
        if not self.connected or not self.armed:
            return False
        
        target_altitude = altitude if altitude is not None else self.altitude
        
        # Takeoff simulation
        def takeoff_simulation():
            step = 0.5  # Increase 0.5m each step
            while self.position["altitude"] < target_altitude:
                time.sleep(0.1)
                self.position["altitude"] += step
            self.flying = True
        
        threading.Thread(target=takeoff_simulation).start()
        return True
    
    def land(self):
        """Land the drone"""
        if not self.connected or not self.flying:
            return False
        
        # Landing simulation
        def landing_simulation():
            step = 0.5  # Decrease 0.5m each step
            while self.position["altitude"] > 0:
                time.sleep(0.1)
                self.position["altitude"] -= step
            self.flying = False
            self.armed = False
        
        threading.Thread(target=landing_simulation).start()
        return True
    
    def rtl(self):
        """Return to Launch - Return to starting point"""
        if not self.connected or not self.flying:
            return False
        
        # RTL simulation
        def rtl_simulation():
            # First return to starting point
            self.goto_position(41.0082, 28.9784)
            # Then land
            self.land()
        
        threading.Thread(target=rtl_simulation).start()
        return True
    
    def goto_position(self, latitude, longitude, altitude=None):
        """Go to specified position"""
        if not self.connected or not self.flying:
            return False
        
        target_altitude = altitude if altitude is not None else self.position["altitude"]
        self.target = {"latitude": latitude, "longitude": longitude, "altitude": target_altitude}
        
        # Movement simulation
        def movement_simulation():
            while self.calculate_distance(self.position, self.target) > 0.1:
                time.sleep(0.1)
                # Calculate new position
                ratio = min(self.speed * 0.1 / self.calculate_distance(self.position, self.target), 1)
                self.position["latitude"] += (self.target["latitude"] - self.position["latitude"]) * ratio
                self.position["longitude"] += (self.target["longitude"] - self.position["longitude"]) * ratio
                self.position["altitude"] += (self.target["altitude"] - self.position["altitude"]) * ratio
            
            self.target = None
        
        threading.Thread(target=movement_simulation).start()
        return True
    
    def set_speed(self, speed):
        """Set drone speed"""
        self.speed = speed
        return True
    
    def set_altitude(self, altitude):
        """Set drone altitude"""
        if not self.connected or not self.flying:
            return False
        
        return self.goto_position(self.position["latitude"], self.position["longitude"], altitude)
    
    def calculate_distance(self, pos1, pos2):
        """Calculate distance between two positions (meters)"""
        # Earth radius (meters)
        R = 6371000
        
        # Convert to radians
        lat1 = math.radians(pos1["latitude"])
        lon1 = math.radians(pos1["longitude"])
        lat2 = math.radians(pos2["latitude"])
        lon2 = math.radians(pos2["longitude"])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        # Horizontal distance
        distance = R * c
        
        # Add altitude difference
        daltitude = pos2["altitude"] - pos1["altitude"]
        
        # Total distance
        return math.sqrt(distance**2 + daltitude**2)
    
    def create_scan_plan(self, northwest, southeast, distance):
        """Create flight points for scanning"""
        points = []
        
        # Calculate area dimensions
        width = self.calculate_distance(
            {"latitude": northwest[0], "longitude": northwest[1], "altitude": 0},
            {"latitude": northwest[0], "longitude": southeast[1], "altitude": 0}
        )
        
        height = self.calculate_distance(
            {"latitude": northwest[0], "longitude": northwest[1], "altitude": 0},
            {"latitude": southeast[0], "longitude": northwest[1], "altitude": 0}
        )
        
        # Calculate number of lines
        line_count = math.ceil(width / distance)
        
        # Create points for each line
        for i in range(line_count):
            ratio = i / (line_count - 1) if line_count > 1 else 0
            longitude = northwest[1] + (southeast[1] - northwest[1]) * ratio
            
            if i % 2 == 0:
                # Top to bottom
                points.append((northwest[0], longitude))
                points.append((southeast[0], longitude))
            else:
                # Bottom to top
                points.append((southeast[0], longitude))
                points.append((northwest[0], longitude))
        
        return points
    
    def start_scan(self, northwest, southeast, distance, altitude):
        """Start scanning operation"""
        if self.scan_active:
            return False
        
        self.scan_active = True
        self.scan_cancel = False
        
        def scan_operation():
            try:
                # Create scan points
                points = self.create_scan_plan(northwest, southeast, distance)
                
                # Go to each point
                for i, (latitude, longitude) in enumerate(points):
                    if self.scan_cancel:
                        break
                    
                    # Go to position
                    self.goto_position(latitude, longitude, altitude)
                    
                    # Wait until reaching target
                    while self.target is not None:
                        if self.scan_cancel:
                            break
                        time.sleep(0.1)
                    
                    # Update progress
                    progress = (i + 1) / len(points) * 100
                    print(f"Scan progress: %{progress:.1f}")
                
                # Scan completed, return to launch
                if not self.scan_cancel:
                    self.rtl()
            
            finally:
                self.scan_active = False
                self.scan_cancel = False
        
        self.scan_thread = threading.Thread(target=scan_operation)
        self.scan_thread.start()
        return True
    
    def cancel_scan(self):
        """Cancel scanning operation"""
        if not self.scan_active:
            return False
        
        self.scan_cancel = True
        return True
    
    def wait_until_target(self, latitude, longitude):
        """Wait until drone reaches target"""
        target = {"latitude": latitude, "longitude": longitude, "altitude": self.position["altitude"]}
        while self.calculate_distance(self.position, target) > 0.1:
            time.sleep(0.1)
    
    def get_status(self):
        """Return drone status"""
        return {
            "connection": self.connected,
            "arm": self.armed,
            "flying": self.flying,
            "mode": self.mode,
            "position": self.position,
            "target": self.target,
            "battery": self.battery,
            "scan_active": self.scan_active
        } 