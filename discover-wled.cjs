// wled-discovery.js
const bonjour = require('bonjour')();

const devices = new Map();
const listeners = new Set(); // Subscribers (renderer, etc.)

function startDiscovery() {
    console.log('Searching for WLED devices on the local network...\n');

    bonjour.find({ type: 'wled' }, (service) => {
        const key = service.referer.address;
        if (!devices.has(key)) {
            devices.set(key, service);
            console.log('==============================');
            console.log(`Name: ${service.name}`);
            console.log(`Host: ${service.host}`);
            console.log(`IP: ${service.referer.address}`);
            console.log(`Port: ${service.port}`);
            console.log('==============================\n');
            
            // Notify subscribers (renderer, etc.)
            for (const cb of listeners) cb(Array.from(devices.values()));
        }
    });
}

// Optional: keep the process alive
process.on('SIGINT', () => {
    console.log('\nStopping discovery...');
    process.exit();
});


function getDevices() {
    return Array.from(devices.values());
}

function onDevicesUpdated(callback) {
    listeners.add(callback);
    // Immediately send current list if any
    callback(getDevices());
    return () => listeners.delete(callback); // unsubscribe
}

module.exports = {
    startDiscovery,
    getDevices,
    onDevicesUpdated
};