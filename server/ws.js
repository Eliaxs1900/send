const { WebSocketServer } = require('ws');
const uploadHandler = require('./routes/ws');

const UPGRADE_PATH = '/api/ws';

function firstHeaderValue(value) {
  return String(value || '')
    .split(',')[0]
    .trim();
}

// The upload handler only needs to know how to address this server, so
// instead of running the raw upgrade request through the express stack we
// give it the two fields it reads.
function requestShim(req, trustProxy) {
  const forwardedProto = trustProxy
    ? firstHeaderValue(req.headers['x-forwarded-proto'])
    : '';
  const forwardedHost = trustProxy
    ? firstHeaderValue(req.headers['x-forwarded-host'])
    : '';
  return {
    protocol:
      forwardedProto || (req.socket.encrypted ? 'https' : 'http'),
    host: forwardedHost || req.headers.host,
    headers: req.headers
  };
}

module.exports = function attachWebSocket(server, { trustProxy = true } = {}) {
  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false
  });

  server.on('upgrade', (req, socket, head) => {
    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch (e) {
      socket.destroy();
      return;
    }
    if (pathname !== UPGRADE_PATH) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => {
      uploadHandler(ws, requestShim(req, trustProxy));
    });
  });

  return wss;
};
