const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Set global options
setGlobalOptions({ 
  maxInstances: 10,
  region: "asia-northeast3" // Seoul region
});

// Import Next.js functions
const { nextjsFunc, health } = require('./nextjs');

// Export Next.js function
exports.nextjsFunc = nextjsFunc;

// Export health check
exports.health = health;

// Example API function (can be used for testing)
exports.api = onRequest((request, response) => {
  response.json({ 
    message: "Firebase Functions API endpoint working!",
    timestamp: new Date().toISOString(),
    method: request.method,
    path: request.path
  });
});