# Metrics Cost Comparison Tool

A Next.js application that helps you compare the costs of different observability platforms based on metric volume and tag cardinality.

## Features

- **Interactive Metric Volume Slider**: Adjust base metrics per second
- **Tag Management**: Add tags to see how cardinality explosion affects metric volume
- **Cost Comparison**: Compare monthly and annual costs across multiple platforms:
  - Elastic Serverless
  - Datadog
  - New Relic
  - Splunk Observability
  - Dynatrace
  - Prometheus (Self-hosted)
  - Grafana Cloud
- **Real-time Calculations**: See cost impacts instantly as you adjust parameters

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Deployment to Vercel

1. Push your code to a Git repository
2. Import the project in Vercel
3. Vercel will automatically detect Next.js and configure the build settings

Or use the Vercel CLI:

```bash
npm i -g vercel
vercel
```

## How It Works

The tool calculates metric volume by:
1. Starting with a base volume (metrics per second)
2. Multiplying by the number of unique tag values for each tag added
3. Converting to monthly volume
4. Calculating costs based on each platform's pricing model

This demonstrates how adding tags with high cardinality can dramatically increase metric volume and costs.

## License

MIT

