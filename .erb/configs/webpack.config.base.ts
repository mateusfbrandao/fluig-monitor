/**
 * Base webpack config used across other specific configs
 */

import path from 'path';
import webpack from 'webpack';
import webpackPaths from './webpack.paths';

export default {
  target: 'web',

  externals: [],

  stats: 'errors-only',

  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
    ],
  },

  output: {
    path: webpackPaths.srcPath,
  },

  resolve: {
    alias: {
      electron: path.resolve(webpackPaths.srcRendererPath, 'ipc/tauriShim.ts'),
      'electron-log': path.resolve(webpackPaths.srcRendererPath, 'ipc/loggerShim.ts'),
    },
    fallback: {
      crypto: false,
      stream: false,
      buffer: false,
    },
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    modules: [webpackPaths.srcPath, 'node_modules'],
  },

  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
    }),
  ],
} as webpack.Configuration;
