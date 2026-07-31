const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const assets = require('../../common/assets');
const routes = require('../routes');
const pages = require('../routes/pages');
const attachWebSocket = require('../ws');

const DIST = path.resolve(__dirname, '../../dist');

// webpack-dev-server is configured with `writeToDisk`, so the freshly built
// manifest is always readable from dist/.
function readManifest() {
  return JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.json'), 'utf8'));
}

module.exports = function(devServer) {
  const app = devServer.app;

  assets.setManifestReader(readManifest);
  app.use(morgan('dev', { stream: process.stderr }));

  routes(app);
  attachWebSocket(devServer.server, { trustProxy: false });

  // webpack-dev-server routes haven't been added yet
  // so wait for next tick to add 404 handler
  process.nextTick(() => app.use(pages.notfound));
};
