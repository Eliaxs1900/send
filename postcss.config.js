// Tailwind 4 se integra en PostCSS a través de su propio paquete y hace la
// minificación con Lightning CSS, así que ya no hace falta cssnano.
const options = {
  plugins: [require('@tailwindcss/postcss')]
};

if (process.env.NODE_ENV === 'development') {
  options.map = { inline: true };
}

module.exports = options;
