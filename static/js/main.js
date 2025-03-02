/**
 * Oil Leak Detection System Main JavaScript File
 * This file contains JavaScript functions used on all pages.
 * Especially Socket.IO connection, drone status updates and common UI functions.
 */

// General application object
const OilLeakApp = {
    socket: null,
    drone: {
        connected: false,
        status: "Waiting for Connection",
        armed: false,
        mode: null,
        location: null,
        battery: null
    },
    scan: {
        active: false,
        cancelled: false,
        completion_percentage: 0
    },
    detections: [],
    
    // Initialize application
    init: function() {
        console.log("Oil Leak Detection System initializing...");
        this.setupSocketConnection();
        this.addEventListeners();
    },
    
    // Set up Socket.IO connection
    setupSocketConnection: function() {
        this.socket = io();
        
        // Connection events
        this.socket.on('connect', function() {
            console.log("Connected to Socket.IO server");
            $('#connection-status').removeClass('text-danger').addClass('text-success').text('Connected');
        });
        
        this.socket.on('disconnect', function() {
            console.log("Disconnected from Socket.IO server");
            $('#connection-status').removeClass('text-success').addClass('text-danger').text('Not Connected');
        });
        
        // Drone status update
        this.socket.on('drone_status', function(status) {
            OilLeakApp.drone = status;
            OilLeakApp.updateDroneStatus();
        });
        
        // Scan status update
        this.socket.on('scan_status', function(status) {
            OilLeakApp.scan = status;
            OilLeakApp.updateScanStatus();
        });
        
        // New detection event
        this.socket.on('new_detection', function(detection) {
            OilLeakApp.detections.unshift(detection); // Add to the beginning of the list
            if (OilLeakApp.detections.length > 20) {
                OilLeakApp.detections.pop(); // Remove the last item from the list (show max 20 detections)
            }
            OilLeakApp.updateDetectionList();
            OilLeakApp.showNotification('New Detection', `ID: ${detection.id} - Oil leak detected at location!`);
        });
    },
    
    // Add event listeners
    addEventListeners: function() {
        // Drone connection buttons
        $('#btn-connect').click(function() {
            $('#connection-modal').modal('show');
        });
        
        $('#btn-save-connection').click(function() {
            const connectionAddress = $('#connection-address').val();
            OilLeakApp.connectToDrone(connectionAddress);
            $('#connection-modal').modal('hide');
        });
        
        $('#btn-disconnect').click(function() {
            OilLeakApp.disconnectDrone();
        });
        
        // Drone control buttons
        $('#btn-arm').click(function() {
            OilLeakApp.armDrone();
        });
        
        $('#btn-takeoff').click(function() {
            const altitude = $('#drone-altitude').val();
            OilLeakApp.droneTakeoff(altitude);
        });
        
        $('#btn-land').click(function() {
            OilLeakApp.droneLand();
        });
        
        $('#btn-rtl').click(function() {
            OilLeakApp.droneRTL();
        });
        
        // Parameter setting buttons
        $('#btn-set-altitude').click(function() {
            const altitude = $('#drone-altitude').val();
            OilLeakApp.setDroneAltitude(altitude);
        });
        
        $('#btn-set-speed').click(function() {
            const speed = $('#drone-speed').val();
            OilLeakApp.setDroneSpeed(speed);
        });
        
        // Location sending button
        $('#btn-goto-location').click(function() {
            const latitude = $('#target-latitude').val();
            const longitude = $('#target-longitude').val();
            const altitude = $('#drone-altitude').val();
            
            if (!latitude || !longitude) {
                alert('Please enter valid latitude and longitude values.');
                return;
            }
            
            OilLeakApp.droneGotoLocation(latitude, longitude, altitude);
        });
        
        // Scan buttons
        $('#btn-scan').click(function() {
            $('#scan-modal').modal('show');
        });
        
        $('#btn-cancel-scan').click(function() {
            OilLeakApp.cancelScan();
        });
    },
    
    // Update drone status information
    updateDroneStatus: function() {
        // Update status area if it exists
        if ($('#drone-status').length) {
            let statusHTML = '';
            
            if (this.drone.connected) {
                let statusClass = this.drone.armed ? 'success' : 'warning';
                
                statusHTML = `
                    <div class="alert alert-${statusClass}">
                        <h6 class="mb-1"><strong>Status:</strong> ${this.drone.status}</h6>
                        <p class="mb-1"><strong>Armed:</strong> ${this.drone.armed ? 'Yes' : 'No'}</p>
                        <p class="mb-1"><strong>Mode:</strong> ${this.drone.mode || 'Unknown'}</p>
                    </div>
                    
                    <div class="row mb-2">
                        <div class="col-sm-6">
                            <div class="card">
                                <div class="card-body p-2">
                                    <p class="mb-0"><strong>Altitude:</strong> ${this.drone.location ? this.drone.location.altitude.toFixed(1) + ' m' : 'Unknown'}</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-sm-6">
                            <div class="card">
                                <div class="card-body p-2">
                                    <p class="mb-0"><strong>Battery:</strong> ${this.drone.battery ? this.drone.battery.level + '%' : 'Unknown'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-body p-2">
                            <p class="mb-1"><strong>Location:</strong></p>
                            <p class="mb-0 small">
                                ${this.drone.location ? 
                                    `Latitude: ${this.drone.location.latitude.toFixed(6)}<br>Longitude: ${this.drone.location.longitude.toFixed(6)}` :
                                    'No location data'}
                            </p>
                        </div>
                    </div>
                `;
            } else {
                statusHTML = `
                    <div class="alert alert-secondary">
                        <p class="mb-0">Drone not connected. Click "Connect" button to connect.</p>
                    </div>
                `;
            }
            
            $('#drone-status').html(statusHTML);
        }
        
        // Update the drone status summary in footer
        if (this.drone.connected) {
            $('#drone-status-summary').html(`Drone Status: ${this.drone.armed ? 'Armed' : 'Disarmed'} - ${this.drone.mode || 'Unknown'}`);
        } else {
            $('#drone-status-summary').html('Drone Status: Not Connected');
        }
        
        // Update buttons
        this.updateControlButtons();
    },
    
    // Update scan status
    updateScanStatus: function() {
        // Update scan status area if it exists
        if ($('#scan-status').length) {
            if (this.scan.active) {
                $('#scan-status').removeClass('d-none');
                $('#scan-progress').css('width', this.scan.completion_percentage + '%');
            } else {
                $('#scan-status').addClass('d-none');
            }
        }
    },
    
    // Update control buttons
    updateControlButtons: function() {
        // Connection buttons
        $('#btn-connect').prop('disabled', this.drone.connected);
        $('#btn-disconnect').prop('disabled', !this.drone.connected);
        
        // Drone control buttons
        $('#btn-arm').prop('disabled', !this.drone.connected || this.drone.armed);
        $('#btn-takeoff').prop('disabled', !this.drone.connected || !this.drone.armed);
        $('#btn-land').prop('disabled', !this.drone.connected || !this.drone.armed);
        $('#btn-rtl').prop('disabled', !this.drone.connected || !this.drone.armed);
        $('#btn-goto-location').prop('disabled', !this.drone.connected || !this.drone.armed);
        
        // Scan buttons
        $('#btn-scan').prop('disabled', !this.drone.connected || this.scan.active);
    },
    
    // Update detection list
    updateDetectionList: function() {
        // Update detection list if it exists
        if ($('#detection-list').length) {
            if (this.detections.length === 0) {
                $('#detection-list').html('<tr><td colspan="6" class="text-center">No detections yet.</td></tr>');
                return;
            }
            
            let detectionHTML = '';
            
            this.detections.forEach(function(detection) {
                detectionHTML += `
                    <tr>
                        <td>${detection.id}</td>
                        <td>${detection.date}</td>
                        <td>${detection.location ? detection.location.latitude.toFixed(6) + ', ' + detection.location.longitude.toFixed(6) : 'Unknown'}</td>
                        <td>${detection.oil_leak_count || 0}</td>
                        <td>${detection.ship_detected ? 'Yes' : 'No'}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="showDetectionDetails(${detection.id})">
                                <i class="fas fa-search-plus"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            $('#detection-list').html(detectionHTML);
        }
    },
    
    // Show notification
    showNotification: function(title, message) {
        // Use browser notifications
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, {
                body: message,
                icon: '/static/img/logo.png'
            });
        } else if ("Notification" in window && Notification.permission !== "denied") {
            // Request permission
            Notification.requestPermission().then(function (permission) {
                if (permission === "granted") {
                    new Notification(title, {
                        body: message,
                        icon: '/static/img/logo.png'
                    });
                }
            });
        }
        
        // Show on-screen notification
        const notificationHTML = `
            <div class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="5000">
                <div class="toast-header bg-primary text-white">
                    <strong class="me-auto">${title}</strong>
                    <small>${new Date().toLocaleTimeString()}</small>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        const notificationContainer = $('#notification-container');
        if (notificationContainer.length) {
            notificationContainer.append(notificationHTML);
            $('.toast').toast('show');
        }
    },
    
    // DRONE API FUNCTIONS
    
    // Connect to drone
    connectToDrone: function(connectionAddress) {
        $.ajax({
            url: '/api/drone/connect',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                connection_address: connectionAddress
            }),
            success: function(response) {
                if (response.status === 'success') {
                    OilLeakApp.showNotification('Drone Connection', 'Successfully connected to drone.');
                } else {
                    OilLeakApp.showNotification('Drone Connection Error', response.error);
                }
            }
        });
    },
    
    // Disconnect drone
    disconnectDrone: function() {
        $.ajax({
            url: '/api/drone/disconnect',
            type: 'POST',
            success: function(response) {
                if (response.status === 'success') {
                    OilLeakApp.showNotification('Drone Connection', 'Drone disconnected.');
                }
            }
        });
    },
    
    // Arm drone
    armDrone: function() {
        $.ajax({
            url: '/api/drone/arm',
            type: 'POST',
            success: function(response) {
                if (response.status === 'success') {
                    OilLeakApp.showNotification('Drone Control', 'Drone armed successfully.');
                } else {
                    OilLeakApp.showNotification('Drone Control Error', response.error);
                }
            }
        });
    },
    
    // Take off
    droneTakeoff: function(altitude) {
        $.ajax({
            url: '/api/drone/takeoff',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                altitude: altitude
            }),
            success: function(response) {
                if (response.status === 'success') {
                    OilLeakApp.showNotification('Drone Control', 'Takeoff initiated.');
                } else {
                    OilLeakApp.showNotification('Drone Control Error', response.error);
                }
            }
        });
    },
    
    // Land the drone
    droneLand: function() {
        $.ajax({
            url: '/api/drone/land',
            type: 'POST',
            success: function(response) {
                if (response.status === 'success') {
                    OilLeakApp.showNotification('Drone Control', 'Landing initiated.');
                } else {
                    OilLeakApp.showNotification('Drone Control Error', response.error);
                }
            }
        });
    },
    
    // Return to Launch
    droneRTL: function() {
        $.ajax({
            url: '/api/drone/rtl',
            type: 'POST',
            success: function(response) {
                if (response.status === 'success') {
                    OilLeakApp.showNotification('Drone Control', 'Return to launch initiated.');
                } else {
                    OilLeakApp.showNotification('Drone Control Error', response.error);
                }
            }
        });
    },
    
    // Go to location
    droneGotoLocation: function(latitude, longitude, altitude) {
        $.ajax({
            url: '/api/drone/goto',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                altitude: altitude ? parseFloat(altitude) : undefined
            }),
            success: function(response) {
                if (response.status === 'success') {
                    OilLeakApp.showNotification('Drone Control', 'Going to location.');
                } else {
                    OilLeakApp.showNotification('Drone Control Error', response.error);
                }
            }
        });
    },
    
    // Set drone speed
    setDroneSpeed: function(speed) {
        $.ajax({
            url: '/api/drone/set_speed',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                speed: parseFloat(speed)
            }),
            success: function(response) {
                if (response.status === 'success') {
                    OilLeakApp.showNotification('Drone Settings', `Drone speed set to ${speed}m/s.`);
                }
            }
        });
    },
    
    // Set drone altitude
    setDroneAltitude: function(altitude) {
        $.ajax({
            url: '/api/drone/set_altitude',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                altitude: parseFloat(altitude)
            }),
            success: function(response) {
                if (response.status === 'success') {
                    OilLeakApp.showNotification('Drone Settings', `Drone altitude set to ${altitude}m.`);
                }
            }
        });
    },
    
    // Start scan
    startScan: function(northwest, southeast, distance, altitude) {
        $.ajax({
            url: '/api/scan/start',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                northwest: northwest,
                southeast: southeast,
                distance: distance,
                altitude: altitude
            }),
            success: function(response) {
                if (response.status === 'success') {
                    OilLeakApp.showNotification('Scan', 'Area scan initiated.');
                } else {
                    OilLeakApp.showNotification('Scan Error', response.error);
                }
            }
        });
    },
    
    // Cancel scan
    cancelScan: function() {
        $.ajax({
            url: '/api/scan/cancel',
            type: 'POST',
            success: function(response) {
                if (response.status === 'success') {
                    OilLeakApp.showNotification('Scan', 'Area scan cancelled.');
                }
            }
        });
    }
};

// Initialize application when page loads
$(document).ready(function() {
    // Add notification container
    $('body').append('<div id="notification-container" class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1050;"></div>');
    
    // Initialize app
    OilLeakApp.init();
}); 