const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const storage = require('./storage');
const mozlog = require('./log');

const log = mozlog('send.cleanup');

// Los blobs se guardan como `${prefix}-${id}` y la clave en Valkey es el `id`.
function idFromFilename(name) {
  const dash = name.indexOf('-');
  return dash === -1 ? null : name.slice(dash + 1);
}

async function sweep() {
  const dir = config.file_dir;
  const cutoff = Date.now() - config.cleanup_min_age_seconds * 1000;
  let removed = 0;
  let freed = 0;

  const entries = await fs.readdir(dir);
  for (const name of entries) {
    const id = idFromFilename(name);
    if (!id) {
      continue;
    }
    const file = path.join(dir, name);
    try {
      const stat = await fs.stat(file);
      if (!stat.isFile() || stat.mtimeMs > cutoff) {
        // demasiado reciente: puede ser una subida a medio terminar
        continue;
      }
      if (await storage.valkey.exists(id)) {
        continue;
      }
      await fs.unlink(file);
      removed++;
      freed += stat.size;
    } catch (e) {
      // otro proceso pudo borrarlo entre el stat y el unlink
      if (e.code !== 'ENOENT') {
        log.warn('no se pudo revisar el fichero', name, e.message);
      }
    }
  }

  if (removed > 0) {
    log.info('blobs caducados eliminados', { removed, freed });
  }
  return { removed, freed };
}

module.exports = {
  sweep,
  start() {
    if (config.cleanup_interval_seconds <= 0) {
      return null;
    }
    // Sólo aplica al almacenamiento en disco: S3 y GCS se limpian con sus
    // propias reglas de ciclo de vida.
    if (config.s3_bucket || config.gcs_bucket) {
      return null;
    }
    const run = () =>
      sweep().catch(e => log.error('fallo el barrido', e.message));
    const timer = setInterval(run, config.cleanup_interval_seconds * 1000);
    // que un barrido pendiente no mantenga vivo el proceso al apagarlo
    timer.unref();
    run();
    return timer;
  }
};
