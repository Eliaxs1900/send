const express = require('express');
const path = require('path');
const config = require('../config');
const routes = require('../routes');
const pages = require('../routes/pages');
const attachWebSocket = require('../ws');
const cleanup = require('../cleanup');

const app = express();

routes(app);

app.use(
  express.static(path.resolve(__dirname, '../../dist/'), {
    setHeaders: function(res, path) {
      if (!/serviceWorker\.js$/.test(path)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      res.removeHeader('Pragma');
    }
  })
);

app.use(pages.notfound);

const server = app.listen(config.listen_port, config.listen_address);
attachWebSocket(server);
cleanup.start();
