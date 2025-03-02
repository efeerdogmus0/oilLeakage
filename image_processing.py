import cv2
import numpy as np
import os
import time
from datetime import datetime

class OilLeakDetection:
    def __init__(self, sensitivity=0.6, min_area=1000):
        """
        Oil leak detection module
        
        Parameters:
        sensitivity -- Oil leak detection sensitivity (0-1)
        min_area -- Minimum oil leak area to detect (in pixels)
        """
        self.sensitivity = sensitivity
        self.min_area = min_area
        # Color ranges for oil leak (in HSV format)
        # Note: These values should be tested and adjusted
        self.lower_value = np.array([0, 0, 100])  # Dark black/gray tones
        self.upper_value = np.array([180, 100, 220])  # Non-bright black/gray tones
        
    def read_image(self, file_path=None, image=None):
        """Read image from file or camera"""
        if image is not None:
            return image
        elif file_path and os.path.exists(file_path):
            return cv2.imread(file_path)
        else:
            return None
        
    def process_image(self, image):
        """Process image to detect oil leaks"""
        if image is None:
            return None, []
        
        # Convert to HSV format
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Create color mask for oil leak
        mask = cv2.inRange(hsv, self.lower_value, self.upper_value)
        
        # Apply morphological operations
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Oil leak detections
        detections = []
        result_image = image.copy()
        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            
            # Check contours larger than minimum area
            if area > self.min_area:
                # Draw rectangle around contour
                x, y, w, h = cv2.boundingRect(cnt)
                cv2.rectangle(result_image, (x, y), (x + w, y + h), (0, 0, 255), 2)
                
                # Calculate contour center
                M = cv2.moments(cnt)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                else:
                    cx, cy = x + w//2, y + h//2
                
                # Add detection information
                detection = {
                    "center": (cx, cy),
                    "area": area,
                    "frame": (x, y, w, h)
                }
                detections.append(detection)
                
                # Add info text
                cv2.putText(result_image, f"Oil Leak: {area:.0f}px", 
                           (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
        
        return result_image, detections
    
    def detect_ships(self, image):
        """Detect ships in the image (simple example)"""
        # Note: For real ship detection, more advanced
        # object detection methods should be used (YOLO, SSD etc.)
        
        # This simple example assumes large dark objects as ships
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Dark color range
        lower_value = np.array([0, 0, 0])
        upper_value = np.array([180, 255, 100])
        
        mask = cv2.inRange(hsv, lower_value, upper_value)
        kernel = np.ones((10, 10), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        ships = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            # Assume large objects as ships
            if area > 5000:
                x, y, w, h = cv2.boundingRect(cnt)
                
                # Add ship information
                ship = {
                    "center": (x + w//2, y + h//2),
                    "area": area,
                    "frame": (x, y, w, h)
                }
                ships.append(ship)
        
        return ships
    
    def detect(self, image_path=None, image=None):
        """Detect oil leaks and ships in the given image"""
        image = self.read_image(image_path, image)
        if image is None:
            return None, [], []
        
        processed_image, oil_leaks = self.process_image(image)
        ships = self.detect_ships(image)
        
        # Draw ships on image
        for ship in ships:
            x, y, w, h = ship["frame"]
            cv2.rectangle(processed_image, (x, y), (x + w, y + h), (255, 0, 0), 2)
            cv2.putText(processed_image, "Ship", 
                       (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
        
        return processed_image, oil_leaks, ships
    
    def save_image(self, image, folder="detections"):
        """Save processed image to specified folder"""
        if not os.path.exists(folder):
            os.makedirs(folder)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_name = f"{folder}/oil_leak_{timestamp}.jpg"
        cv2.imwrite(file_name, image)
        return file_name

# Example usage for testing
if __name__ == "__main__":
    detector = OilLeakDetection(sensitivity=0.7, min_area=1500)
    
    # Get image from camera (for testing)
    camera = cv2.VideoCapture(0)  # 0: default camera
    
    while True:
        ret, frame = camera.read()
        if not ret:
            break
        
        # Process image
        processed_image, leaks, ships = detector.detect(image=frame)
        
        # Show results
        cv2.imshow('Oil Leak Detection', processed_image)
        
        # Save image every 5 seconds (for testing)
        if int(time.time()) % 5 == 0:
            if len(leaks) > 0:
                detector.save_image(processed_image)
        
        # Press 'q' to exit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    camera.release()
    cv2.destroyAllWindows()
