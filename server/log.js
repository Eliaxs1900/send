/*
  mozlog pulled in `intel`, which calls the `util.isError` helper Node
  removed in v23. Mozilla's log aggregation isn't relevant to a self-hosted
  instance anyway, so this writes structured lines to stdout/stderr.
*/
const conf = require('./config');

const isProduction = conf.env === 'production';
const LEVELS = ['debug', 'verbose', 'info', 'warn', 'error'];
const threshold = LEVELS.indexOf(isProduction ? 'info' : 'debug');

function write(stream, name, level, args) {
  const [message, ...rest] = args;
  const entry = {
    time: new Date().toISOString(),
    level,
    logger: name,
    message: typeof message === 'string' ? message : undefined,
    detail: rest
      .concat(typeof message === 'string' ? [] : [message])
      .map(v => (v instanceof Error ? { error: v.message, stack: v.stack } : v))
  };
  if (entry.detail.length === 0) {
    delete entry.detail;
  }
  stream.write(JSON.stringify(entry) + '\n');
}

module.exports = function mozlog(name) {
  const logger = {};
  for (const level of LEVELS) {
    const enabled = LEVELS.indexOf(level) >= threshold;
    const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
    logger[level] = enabled
      ? (...args) => write(stream, name, level, args)
      : () => {};
  }
  return logger;
};
