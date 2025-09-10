// Thin entrypoint for Azure Functions v4 runtime (packaged zip)
// In the CI zip, we copy the contents of ./dist to the zip root,
// so compiled sources live under ./src
require('./src/index.js');
