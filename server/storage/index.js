const config = require('../config');
const Metadata = require('../metadata');
const mozlog = require('../log');
const createValkeyClient = require('./valkey');

function getPrefix(seconds) {
  return Math.max(Math.floor(seconds / 86400), 1);
}

class DB {
  constructor(config) {
    let Storage;
    if (config.s3_bucket) {
      Storage = require('./s3');
    } else if (config.gcs_bucket) {
      Storage = require('./gcs');
    } else {
      Storage = require('./fs');
    }
    this.log = mozlog('send.storage');

    this.storage = new Storage(config, this.log);

    this.valkey = createValkeyClient(config);
    this.valkey.on('error', err => {
      this.log.error('Valkey:', err);
    });
  }

  async ttl(id) {
    const result = await this.valkey.ttl(id);
    return Math.ceil(result) * 1000;
  }

  async getPrefixedInfo(id) {
    const [prefix, dead, flagged] = await this.valkey.hmget(
      id,
      'prefix',
      'dead',
      'flagged'
    );
    return {
      filePath: `${prefix}-${id}`,
      flagged,
      dead
    };
  }

  async length(id) {
    const { filePath } = await this.getPrefixedInfo(id);
    return this.storage.length(filePath);
  }

  async get(id) {
    const info = await this.getPrefixedInfo(id);
    if (info.dead || info.flagged) {
      throw new Error(info.flagged ? 'flagged' : 'dead');
    }
    const length = await this.storage.length(info.filePath);
    return { length, stream: this.storage.getStream(info.filePath) };
  }

  async set(id, file, meta, expireSeconds = config.default_expire_seconds) {
    const prefix = getPrefix(expireSeconds);
    const filePath = `${prefix}-${id}`;
    await this.storage.set(filePath, file);
    // write the metadata and its expiry together so a file is never
    // left in storage without a record that can expire it
    const tx = this.valkey.multi();
    if (meta) {
      tx.hset(id, { prefix, ...meta });
    } else {
      tx.hset(id, 'prefix', prefix);
    }
    tx.expire(id, expireSeconds);
    await tx.exec();
  }

  setField(id, key, value) {
    this.valkey.hset(id, key, value);
  }

  async incrementField(id, key, increment = 1) {
    return await this.valkey.hincrby(id, key, increment);
  }

  async kill(id) {
    const { filePath, dead } = await this.getPrefixedInfo(id);
    if (!dead) {
      await this.valkey.hset(id, 'dead', 1);
      this.storage.del(filePath);
    }
  }

  async flag(id) {
    await this.kill(id);
    await this.valkey.hset(id, 'flagged', 1);
  }

  async del(id) {
    const { filePath } = await this.getPrefixedInfo(id);
    await this.valkey.del(id);
    this.storage.del(filePath);
  }

  async ping() {
    await this.valkey.ping();
    await this.storage.ping();
  }

  async metadata(id) {
    const result = await this.valkey.hgetall(id);
    // unlike node-redis, iovalkey resolves a missing hash to `{}` rather
    // than null, so an empty result has to be treated as "not found"
    if (!result || Object.keys(result).length === 0) {
      return null;
    }
    return new Metadata({ id, ...result }, this);
  }
}

module.exports = new DB(config);
