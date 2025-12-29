/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      // Ignore optional OpenTelemetry dependencies that may not be installed
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@opentelemetry/winston-transport': false,
        '@opentelemetry/exporter-jaeger': false,
      };
      
      // Ignore missing manifest files in serverless environment
      // This prevents ENOENT errors for subresource-integrity-manifest.json
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.next\/server\/subresource-integrity-manifest\.json$/,
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;

