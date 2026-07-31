const genmap = require('./generate_asset_map');
const isServer = typeof genmap === 'function';
let prefix = '';
let manifest = {};
try {
  manifest = require('../dist/manifest.json');
} catch (e) {
  // use middleware
}

const assets = isServer ? manifest : genmap;

function getAsset(name) {
  return prefix + assets[name];
}

function setPrefix(name) {
  prefix = name;
}

function getMatches(match) {
  return Object.keys(assets)
    .filter(k => match.test(k))
    .map(getAsset);
}

const instance = {
  setPrefix: setPrefix,
  get: getAsset,
  match: getMatches,
  // In dev the bundle is rebuilt constantly, so the server reads the
  // manifest on every lookup. `getManifest` is supplied by the dev server
  // to keep filesystem access out of the client bundle.
  setManifestReader: function(getManifest) {
    if (!getManifest) {
      return;
    }
    instance.get = function getAssetFromReader(name) {
      return prefix + getManifest()[name];
    };
    instance.match = function matchAssetFromReader(match) {
      const m = getManifest();
      return Object.keys(m)
        .filter(k => match.test(k))
        .map(k => prefix + m[k]);
    };
  }
};

module.exports = instance;
