const fs = require('fs');
const path = require('path');
const { FluentBundle, FluentResource } = require('@fluent/bundle');
const localesPath = path.resolve(__dirname, '../public/locales');
const locales = fs.readdirSync(localesPath);

function makeBundle(locale) {
  const bundle = new FluentBundle(locale, { useIsolating: false });
  // addMessages was replaced by addResource in @fluent/bundle 0.14
  bundle.addResource(
    new FluentResource(
      fs.readFileSync(path.resolve(localesPath, locale, 'send.ftl'), 'utf8')
    )
  );
  return [locale, bundle];
}

const bundles = new Map(locales.map(makeBundle));

function format(bundle, id, data) {
  const message = bundle.getMessage(id);
  if (!message || !message.value) {
    return null;
  }
  return bundle.formatPattern(message.value, data);
}

module.exports = function getTranslator(locale) {
  const defaultBundle = bundles.get('en-US');
  const bundle = bundles.get(locale) || defaultBundle;
  return function(id, data) {
    return format(bundle, id, data) || format(defaultBundle, id, data) || id;
  };
};
