const { PassThrough } = require('stream');
const {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand
} = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

class S3Storage {
  constructor(config, log) {
    this.bucket = config.s3_bucket;
    this.log = log;
    const cfg = { region: config.s3_region };
    if (config.s3_endpoint !== '') {
      cfg.endpoint = config.s3_endpoint;
    }
    if (config.s3_use_path_style_endpoint) {
      cfg.forcePathStyle = true;
    }
    this.client = new S3Client(cfg);
  }

  async length(id) {
    const result = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: id })
    );
    return Number(result.ContentLength);
  }

  getStream(id) {
    // callers expect a stream synchronously, so hand back a passthrough and
    // connect it once the SDK resolves the object body
    const stream = new PassThrough();
    this.client
      .send(new GetObjectCommand({ Bucket: this.bucket, Key: id }))
      .then(result => result.Body.pipe(stream))
      .catch(err => stream.destroy(err));
    return stream;
  }

  async set(id, file) {
    // the upload size isn't known up front, so use the multipart uploader
    const upload = new Upload({
      client: this.client,
      params: { Bucket: this.bucket, Key: id, Body: file }
    });
    file.on('error', () => upload.abort());
    await upload.done();
  }

  del(id) {
    return this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: id })
    );
  }

  ping() {
    return this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }
}

module.exports = S3Storage;
