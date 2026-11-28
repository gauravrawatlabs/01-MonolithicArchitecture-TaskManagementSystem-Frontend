// Runtime configuration (optional). Loaded before the app, so a deployment can point the SAME build at a
// different API by replacing this one file, without rebuilding. Empty values fall back to the build-time
// VITE_* variables. The Docker image writes this file from environment variables at start-up.
window.__APP_CONFIG__ = {
  // apiBaseUrl: 'https://api.example.com',
  // appName: 'Task Management System',
};
