const assert = require('assert');
const sinon = require('sinon');
const { Readable } = require('stream');
const proxyquire = require('proxyquire').noCallThru();

// AWS SDK v3 replaces method calls with command objects sent through a
// client, so the stubs are shaped around `client.send(command)`.
const send = sinon.stub();

class Command {
  constructor(name, input) {
    this.name = name;
    this.input = input;
  }
}

const clientStub = {
  S3Client: function(config) {
    this.config = config;
    this.send = send;
  },
  HeadObjectCommand: class extends Command {
    constructor(input) {
      super('HeadObject', input);
    }
  },
  GetObjectCommand: class extends Command {
    constructor(input) {
      super('GetObject', input);
    }
  },
  DeleteObjectCommand: class extends Command {
    constructor(input) {
      super('DeleteObject', input);
    }
  },
  HeadBucketCommand: class extends Command {
    constructor(input) {
      super('HeadBucket', input);
    }
  }
};

let uploadDone = sinon.stub();
const uploadAbort = sinon.stub();
const libStorageStub = {
  Upload: function(options) {
    this.options = options;
    this.done = () => uploadDone(options);
    this.abort = uploadAbort;
  }
};

const S3Storage = proxyquire('../../server/storage/s3', {
  '@aws-sdk/client-s3': clientStub,
  '@aws-sdk/lib-storage': libStorageStub
});

const config = { s3_bucket: 'foo', s3_endpoint: '', s3_region: 'us-east-1' };

function commandOf(name) {
  return send.getCalls().find(c => c.args[0].name === name).args[0];
}

describe('S3Storage', function() {
  beforeEach(function() {
    send.reset();
    uploadAbort.resetHistory();
    uploadDone = sinon.stub().resolves();
  });

  it('uses config.s3_bucket', function() {
    const s = new S3Storage(config);
    assert.equal(s.bucket, 'foo');
  });

  describe('length', function() {
    it('returns the ContentLength', async function() {
      send.resolves({ ContentLength: 123 });
      const s = new S3Storage(config);
      const len = await s.length('x');
      assert.equal(len, 123);
      assert.deepEqual(commandOf('HeadObject').input, {
        Bucket: 'foo',
        Key: 'x'
      });
    });

    it('throws when id not found', async function() {
      const err = new Error('missing');
      send.rejects(err);
      const s = new S3Storage(config);
      await assert.rejects(() => s.length('x'), /missing/);
    });
  });

  describe('getStream', function() {
    it('returns a stream carrying the object body', async function() {
      send.resolves({ Body: Readable.from(['hello ', 'world']) });
      const s = new S3Storage(config);
      const result = s.getStream('x');
      const chunks = [];
      for await (const chunk of result) {
        chunks.push(chunk);
      }
      assert.equal(Buffer.concat(chunks).toString(), 'hello world');
      assert.deepEqual(commandOf('GetObject').input, {
        Bucket: 'foo',
        Key: 'x'
      });
    });

    it('destroys the stream when the object is missing', function(done) {
      send.rejects(new Error('nope'));
      const s = new S3Storage(config);
      s.getStream('x').on('error', err => {
        assert.equal(err.message, 'nope');
        done();
      });
    });
  });

  describe('set', function() {
    it('uploads the file', async function() {
      const file = { on: sinon.stub() };
      const s = new S3Storage(config);
      await s.set('x', file);
      sinon.assert.calledWithMatch(uploadDone, {
        params: { Bucket: 'foo', Key: 'x', Body: file }
      });
    });

    it('aborts the upload when the source errors', async function() {
      const file = { on: (ev, fn) => fn() };
      uploadDone = sinon.stub().rejects(new Error('limit'));
      const s = new S3Storage(config);
      await assert.rejects(() => s.set('x', file), /limit/);
      sinon.assert.calledOnce(uploadAbort);
    });

    it('throws when the upload fails', async function() {
      const file = { on: sinon.stub() };
      uploadDone = sinon.stub().rejects(new Error('boom'));
      const s = new S3Storage(config);
      await assert.rejects(() => s.set('x', file), /boom/);
    });
  });

  describe('del', function() {
    it('deletes the object', async function() {
      send.resolves(true);
      const s = new S3Storage(config);
      const result = await s.del('x');
      assert.equal(result, true);
      assert.deepEqual(commandOf('DeleteObject').input, {
        Bucket: 'foo',
        Key: 'x'
      });
    });
  });

  describe('ping', function() {
    it('heads the bucket', async function() {
      send.resolves(true);
      const s = new S3Storage(config);
      const result = await s.ping();
      assert.equal(result, true);
      assert.deepEqual(commandOf('HeadBucket').input, { Bucket: 'foo' });
    });
  });
});
