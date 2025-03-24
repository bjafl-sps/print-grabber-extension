const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.ts',
    content: './src/content.ts',
    popup: './src/popup.ts',
    settings: './src/settings.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/popup.html', to: 'popup.html' },
        { from: 'src/settings.html', to: 'settings.html' },
        { from: 'src/print.css', to: 'print.css' },
        { from: './node_modules/pdfmake/build/pdfmake.js', to: 'pdfmake.js' },
        { from: './node_modules/pdfmake/build/vfs_fonts.js', to: 'pdffonts.js' },
        { from: 'node_modules/html-to-pdfmake/index.js', to: 'htmltopdfmake.js' },
        { from: 'icons', to: 'icons' }
      ],
    }),
  ],
};