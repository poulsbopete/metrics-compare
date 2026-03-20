/**
 * GitHub Pages: static host — set GITHUB_PAGES=true and BASE_PATH="/{repo-name}" in CI.
 * Vercel / local: leave unset (no static export, API routes + instrumentation work).
 */
const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isGithubPages && {
    output: "export",
    trailingSlash: true,
    basePath: basePath || undefined,
    assetPrefix: basePath ? `${basePath}/` : undefined,
    images: { unoptimized: true },
  }),
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

