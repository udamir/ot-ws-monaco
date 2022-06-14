const path = require("path");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

module.exports = (env, argv) => {
  const mode = argv.mode || "development";
  const port = argv.port || 8001;
  const host = argv.host || "0.0.0.0";

  return {
    mode,
    context: __dirname,
    devtool: 'source-map',
    target: "web",
    entry: {
      monaco: {
        import: "./src/index.ts",
      },
      "ws-monaco": ["./src/ws-monaco"],
    },
    output: {
      chunkFilename: "[name].[chunkhash:8].js",
      clean: true,
      filename: "[name].js",
      path: path.resolve(__dirname, "./lib"),
    },
    devServer: {
      host,
      port,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers":
          "X-Requested-With, content-type, Authorization",
      },
      http2: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".json"],
    },
    stats: {
      children: !!env.VERBOSE,
      errorDetails: !!env.VERBOSE,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader",
              options: {
                configFile: "tsconfig.build.json",
              },
            },
          ],
        },
        {
          test: /\.js$/,
          use: ["source-map-loader"],
          enforce: "pre",
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(html|woff|woff2|eot|ttf|otf)$/i,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new MonacoWebpackPlugin(),
    ],
  };
};
