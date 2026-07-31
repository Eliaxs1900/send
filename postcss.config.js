const options = {
  plugins: [require('tailwindcss'), require('postcss-preset-env')]
};

if (process.env.NODE_ENV === 'development') {
  options.map = { inline: true };
} else {
  // Tailwind 3 only generates the classes it finds in `content`, so the
  // separate purgecss pass this build used to run is no longer needed.
  options.plugins.push(
    require('cssnano')({
      preset: 'default'
    })
  );
}

module.exports = options;
