const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'cheap-source-map',  // Changed from eval-source-map
  entry: './popup/src/index.js',
  output: {
    path: path.resolve(__dirname, 'popup/build'),
    filename: 'popup.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  optimization: {
    minimize: false  // This helps with debugging
  }
};