import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import TerserPlugin from "terser-webpack-plugin";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
	mode: "development",
	devtool: false,
	entry: {
		main: "./src/Main.ts",
	},
	output: {
		path: resolve(__dirname, './public'),
		filename: "index.js"
	},
	resolve: {
		extensions: [".ts"],
	},
	module: {
		rules: [
			{ 
				test: /\.ts$/,
				loader: "ts-loader"
			}
		]
	},
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				extractComments: false,
				terserOptions: {
					format: {
						comments: false,
					},
				},
			}),
		],
	}
};