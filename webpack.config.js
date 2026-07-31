const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const VersionPlugin = require('./build/version_plugin');

const webJsOptions = {
  babelrc: false,
  presets: [
    [
      '@babel/preset-env',
      {
        bugfixes: true,
        useBuiltIns: 'entry',
        corejs: 3
      }
    ]
  ],
  plugins: ['@babel/plugin-syntax-dynamic-import', 'module:nanohtml']
};

const svgoOptions = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // true causes stretched images
          removeViewBox: false,
          // ids are referenced by <use xlink:href="...#icon">
          cleanupIds: false
        }
      }
    },
    'removeTitle'
  ]
};

const serviceWorker = {
  target: 'webworker',
  entry: {
    serviceWorker: './app/serviceWorker.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.(png|jpg)$/,
        type: 'asset/resource',
        generator: {
          filename: '[name].[contenthash:8][ext]'
        }
      },
      {
        test: /\.svg$/,
        type: 'asset/resource',
        generator: {
          filename: '[name].[contenthash:8][ext]'
        },
        use: [
          {
            loader: 'svgo-loader',
            options: svgoOptions
          }
        ]
      },
      {
        // loads all assets from assets/ for use by common/assets.js
        test: require.resolve('./common/generate_asset_map.js'),
        use: ['babel-loader', 'val-loader']
      }
    ]
  },
  plugins: [new webpack.IgnorePlugin({ resourceRegExp: /\.\.\/dist/ })]
};

const web = {
  target: 'web',
  entry: {
    app: ['./app/main.js']
  },
  output: {
    chunkFilename: '[name].[contenthash:8].js',
    filename: '[name].[contenthash:8].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, 'app'),
          path.resolve(__dirname, 'common'),
          // some dependencies need to get re-babeled because we
          // have different targets than their default configs
          path.resolve(__dirname, 'node_modules/@fluent'),
          path.resolve(__dirname, 'node_modules/intl-pluralrules')
        ],
        loader: 'babel-loader',
        options: webJsOptions
      },
      {
        test: /\.(png|jpg)$/,
        type: 'asset/resource',
        generator: {
          filename: '[name].[contenthash:8][ext]'
        }
      },
      {
        test: /\.svg$/,
        type: 'asset/resource',
        generator: {
          filename: '[name].[contenthash:8][ext]'
        },
        use: [
          {
            loader: 'svgo-loader',
            options: svgoOptions
          }
        ]
      },
      {
        // creates style.css with all styles
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1
            }
          },
          'postcss-loader'
        ]
      },
      {
        test: /\.ftl$/,
        type: 'asset/source'
      },
      {
        // loads all assets from assets/ for use by common/assets.js
        test: require.resolve('./common/generate_asset_map.js'),
        use: ['babel-loader', 'val-loader']
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          context: 'public',
          from: '*.*'
        }
      ]
    }),
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new webpack.IgnorePlugin({ resourceRegExp: /\.\.\/dist/ }), // used in common/*.js
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash:8].css'
    }),
    new VersionPlugin(), // used for the /__version__ route
    new WebpackManifestPlugin() // used by server side to resolve hashed assets
  ],
  devtool: 'source-map',
  devServer: {
    // the express routes and the upload websocket run inside the dev server
    setupMiddlewares: (middlewares, devServer) => {
      require('./server/bin/dev')(devServer);
      return middlewares;
    },
    // server/bin/dev.js reads dist/manifest.json straight off disk
    devMiddleware: {
      writeToDisk: true
    },
    compress: true,
    hot: false,
    host: '0.0.0.0'
  }
};

module.exports = (env, argv) => {
  const mode = argv.mode || 'production';
  console.error(`mode: ${mode}`);
  process.env.NODE_ENV = web.mode = serviceWorker.mode = mode;
  return [web, serviceWorker];
};
