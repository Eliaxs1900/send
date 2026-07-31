const { sources } = require('webpack');
const gitRevSync = require('git-rev-sync');
const pkg = require('../package.json');

let commit = 'unknown';

try {
  commit = gitRevSync.short();
} catch (e) {
  console.warn('Error fetching current git commit: ' + e);
}

const version = JSON.stringify({
  commit,
  source: pkg.homepage,
  version: `v${pkg.version}`
});

class VersionPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('VersionPlugin', compilation => {
      compilation.hooks.processAssets.tap(
        {
          name: 'VersionPlugin',
          stage: compilation.constructor.PROCESS_ASSETS_STAGE_ADDITIONAL
        },
        () => {
          compilation.emitAsset(
            'version.json',
            new sources.RawSource(version)
          );
        }
      );
    });
  }
}

module.exports = VersionPlugin;
