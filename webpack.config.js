const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
    context: path.resolve(__dirname, 'src'),
    entry: { 
        app: './index.js' 
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist')
    },
    devtool: 'inline-source-map',
    devServer: {
        host: '0.0.0.0',
        contentBase: path.join(__dirname, 'dist'),
        hot: true
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html'
        }),
        // new MiniCssExtractPlugin({
        //     filename: '[name].css',
        //     chunkFilename: '[id].css'
        // }),
        new webpack.HotModuleReplacementPlugin()
    ],
    module: {
        rules: [
              {
                test: /\.js$/,
                use: 'babel-loader',
                exclude: /node_modules/
              },
              {
                test: /\.scss$/,
                use: [
                  'style-loader',
                  {
                    loader: 'css-loader',
                    options: {
                      modules: true
                    }
                  },
                  'sass-loader'
                ]
              }
        ]
    },
    resolve: {
        extensions: ['.js', '.scss']
      }
};
