const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const jsonData = require('./src/assets/chart_data.json')

module.exports = {
    context: path.resolve(__dirname, 'src'),
    entry: {
        app: './index.js',
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: 'babel-loader',
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html',
            data: jsonData
        })
    ],
    resolve: {
        extensions: ['.js', '.scss'],
    },
}
