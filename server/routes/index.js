const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const storage = require('../storage');
const config = require('../config');
const auth = require('../middleware/auth');
const language = require('../middleware/language');
const pages = require('./pages');
const clientConstants = require('../clientConstants');

const IS_DEV = config.env === 'development';
// A personal instance is often reached over plain http on a LAN. Sending
// HSTS or upgrade-insecure-requests in that case makes the browser force
// https on the host and the site stops loading.
const IS_HTTPS = /^https:\/\//.test(config.base_url);
const ID_REGEX = /^[0-9a-fA-F]{10,16}$/;

// path-to-regexp v8 (Express 5) dropped inline regex in route params, so the
// id format is checked here instead of in the path itself.
function validId(req, res, next) {
  if (!ID_REGEX.test(req.params.id)) {
    return res.sendStatus(404);
  }
  next();
}

function websocketUrl(baseUrl) {
  return baseUrl.replace(/^http/, 'ws');
}

module.exports = function(app) {
  app.set('trust proxy', true);
  // helmet's own CSP is disabled because we build a nonce-based one below
  app.use(
    helmet({ contentSecurityPolicy: false, strictTransportSecurity: false })
  );
  if (!IS_DEV && IS_HTTPS) {
    app.use(
      helmet.strictTransportSecurity({
        maxAge: 31536000
      })
    );
  }
  app.use(function(req, res, next) {
    req.cspNonce = crypto.randomBytes(16).toString('hex');
    next();
  });
  if (!IS_DEV) {
    const csp = {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", websocketUrl(config.base_url)],
        imgSrc: ["'self'"],
        scriptSrc: ["'self'", req => `'nonce-${req.cspNonce}'`],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: IS_HTTPS ? [] : null
      }
    };

    app.use(helmet.contentSecurityPolicy(csp));
  }

  app.use(function(req, res, next) {
    res.set('Pragma', 'no-cache');
    res.set(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate, max-age=0'
    );
    next();
  });
  app.use(express.json());
  app.use(express.text());
  app.get('/', language, pages.index);
  app.get('/config', function(req, res) {
    res.json(clientConstants);
  });
  app.get('/error', language, pages.blank);
  app.get('/report', language, pages.blank);
  app.get('/app.webmanifest', language, require('./webmanifest'));
  app.get('/download/:id', validId, language, pages.download);
  app.get('/unsupported/:reason', language, pages.unsupported);
  app.get(
    '/api/download/token/:id',
    validId,
    auth.hmac,
    require('./token')
  );
  app.get('/api/download/:id', validId, auth.dlToken, require('./download'));
  app.get(
    '/api/download/blob/:id',
    validId,
    auth.dlToken,
    require('./download')
  );
  app.post(
    '/api/download/done/:id',
    validId,
    auth.dlToken,
    require('./done.js')
  );
  app.get('/api/exists/:id', validId, require('./exists'));
  app.get('/api/metadata/:id', validId, auth.hmac, require('./metadata'));
  app.post('/api/delete/:id', validId, auth.owner, require('./delete'));
  app.post('/api/password/:id', validId, auth.owner, require('./password'));
  app.post('/api/params/:id', validId, auth.owner, require('./params'));
  app.post('/api/info/:id', validId, auth.owner, require('./info'));
  app.post('/api/report/:id', validId, auth.hmac, require('./report'));
  app.get('/__version__', function(req, res) {
    res.sendFile(require.resolve('../../dist/version.json'));
  });

  app.get('/__lbheartbeat__', function(req, res) {
    res.sendStatus(200);
  });

  app.get('/__heartbeat__', async (req, res) => {
    try {
      await storage.ping();
      res.sendStatus(200);
    } catch (e) {
      res.sendStatus(500);
    }
  });
};
