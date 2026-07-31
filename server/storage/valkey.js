const Valkey = require('iovalkey');

// Valkey is the BSD-3 licensed fork of Redis maintained by the Linux
// Foundation, created after Redis moved to the RSALv2/SSPLv1 licenses in
// 2024. It is protocol compatible, so it is a drop-in replacement.
module.exports = function(config) {
  if (config.env === 'development' && config.valkey_host === 'mock') {
    const ValkeyMock = require('ioredis-mock');
    return new ValkeyMock();
  }

  return new Valkey({
    host: config.valkey_host,
    port: config.valkey_port,
    // `iovalkey` reconnects on its own; give up once the configured window
    // has elapsed so a dead server surfaces as an error instead of hanging.
    retryStrategy(times) {
      const waited = times * config.valkey_retry_delay;
      if (waited > config.valkey_retry_time) {
        return null;
      }
      return config.valkey_retry_delay;
    }
  });
};
