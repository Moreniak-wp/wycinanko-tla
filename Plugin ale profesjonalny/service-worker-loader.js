// service-worker-loader.js
try {
  importScripts('strings.js', 'service-worker.js');
} catch (e) {
  console.error(e);
}
