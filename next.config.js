/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignore optional OpenTelemetry dependencies that may not be installed
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@opentelemetry/winston-transport': false,
        '@opentelemetry/exporter-jaeger': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;

