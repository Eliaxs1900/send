const html = require('choo/html');
const raw = require('choo/html/raw');
const clientConstants = require('./clientConstants');

module.exports = function(state) {
  const jsconfig = `
  var LIMITS = ${JSON.stringify(clientConstants.LIMITS)};
  var DEFAULTS = ${JSON.stringify(clientConstants.DEFAULTS)};
  var PREFS = ${JSON.stringify(state.prefs)};
  var downloadMetadata = ${
    state.downloadMetadata ? raw(JSON.stringify(state.downloadMetadata)) : '{}'
  };
  `;
  return state.cspNonce
    ? html`
        <script nonce="${state.cspNonce}">
          ${raw(jsconfig)};
        </script>
      `
    : '';
};
