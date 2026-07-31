const convict = require('convict');
// convict 6 moved the `url` and `ipaddress` formats into a separate package
convict.addFormats(require('convict-format-with-validator'));
const { tmpdir } = require('os');
const path = require('path');
const { randomBytes } = require('crypto');

const conf = convict({
  s3_bucket: {
    format: String,
    default: '',
    env: 'S3_BUCKET'
  },
  s3_endpoint: {
    format: String,
    default: '',
    env: 'S3_ENDPOINT'
  },
  s3_region: {
    format: String,
    default: 'us-east-1',
    env: 'S3_REGION'
  },
  s3_use_path_style_endpoint: {
    format: Boolean,
    default: false,
    env: 'S3_USE_PATH_STYLE_ENDPOINT'
  },
  gcs_bucket: {
    format: String,
    default: '',
    env: 'GCS_BUCKET'
  },
  expire_times_seconds: {
    format: Array,
    default: [300, 3600, 86400, 604800],
    env: 'EXPIRE_TIMES_SECONDS'
  },
  default_expire_seconds: {
    format: Number,
    default: 86400,
    env: 'DEFAULT_EXPIRE_SECONDS'
  },
  max_expire_seconds: {
    format: Number,
    default: 86400 * 7,
    env: 'MAX_EXPIRE_SECONDS'
  },
  download_counts: {
    format: Array,
    default: [1, 2, 3, 4, 5, 20, 50, 100],
    env: 'DOWNLOAD_COUNTS'
  },
  max_downloads: {
    format: Number,
    default: 100,
    env: 'MAX_DOWNLOADS'
  },
  max_files_per_archive: {
    format: Number,
    default: 64,
    env: 'MAX_FILES_PER_ARCHIVE'
  },
  max_archives_per_user: {
    format: Number,
    default: 16,
    env: 'MAX_ARCHIVES_PER_USER'
  },
  valkey_host: {
    format: String,
    default: 'mock',
    env: 'VALKEY_HOST'
  },
  valkey_port: {
    format: 'port',
    default: 6379,
    env: 'VALKEY_PORT'
  },
  valkey_retry_time: {
    format: Number,
    default: 10000,
    env: 'VALKEY_RETRY_TIME'
  },
  valkey_retry_delay: {
    format: Number,
    default: 500,
    env: 'VALKEY_RETRY_DELAY'
  },
  listen_address: {
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'IP_ADDRESS'
  },
  listen_port: {
    format: 'port',
    default: 1443,
    arg: 'port',
    env: 'PORT'
  },
  env: {
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  max_file_size: {
    format: Number,
    default: 1024 * 1024 * 1024 * 2.5,
    env: 'MAX_FILE_SIZE'
  },
  l10n_dev: {
    format: Boolean,
    default: false,
    env: 'L10N_DEV'
  },
  base_url: {
    format: 'url',
    default: 'http://localhost:1443',
    env: 'BASE_URL'
  },
  file_dir: {
    format: 'String',
    default: `${tmpdir()}${path.sep}send-${randomBytes(4).toString('hex')}`,
    env: 'FILE_DIR'
  },
  // El TTL vive en Valkey: al caducar desaparecen los metadatos, pero el blob
  // cifrado se queda en disco ocupando espacio. Este barrido lo recoge.
  cleanup_interval_seconds: {
    format: Number,
    default: 3600,
    env: 'CLEANUP_INTERVAL_SECONDS'
  },
  // Un fichero recien subido todavia no tiene metadatos, asi que hay que
  // dejarlo madurar antes de considerarlo huerfano o se borraria una subida
  // en curso.
  cleanup_min_age_seconds: {
    format: Number,
    default: 3600,
    env: 'CLEANUP_MIN_AGE_SECONDS'
  }
});

// Perform validation
conf.validate({ allowed: 'strict' });

const props = conf.getProperties();

// convict devuelve las listas del entorno como cadenas, mientras que los
// valores por defecto son numeros. El cliente compara estas opciones con ===
// contra el valor seleccionado, asi que hay que dejarlas siempre numericas.
props.expire_times_seconds = props.expire_times_seconds.map(Number);
props.download_counts = props.download_counts.map(Number);

module.exports = props;
