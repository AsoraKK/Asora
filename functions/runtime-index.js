// Thin entrypoint for Azure Functions v4 runtime (packaged zip)
// CI copies compiled dist/src into ./src inside the deployment ZIP.
require('./src/index.js');
