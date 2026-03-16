// Infrastructure-based metrics sizing estimates
// GB/day per unit based on standard Elastic Agent integrations at 5-minute scrape intervals
// Reference values validated against Peter Simkins' estimates:
//   100 Linux servers ≈ 4 GB/day, 10 MySQL ≈ 0.3 GB/day, 10 Kafka brokers ≈ 0.6 GB/day

export interface Integration {
  id: string;
  name: string;
  emoji: string;
  category: string;
  gbPerDayPerUnit: number;
  referenceLabel: string; // "per server", "per node", "per broker", etc.
  description: string;
}

export const INTEGRATION_CATEGORIES = [
  "Hosts",
  "Kubernetes",
  "Databases",
  "Messaging",
  "Web / Proxy",
  "Cloud (AWS)",
  "Infrastructure",
] as const;

export const integrations: Integration[] = [
  // Hosts
  {
    id: "linux",
    name: "Linux Server",
    emoji: "🐧",
    category: "Hosts",
    gbPerDayPerUnit: 0.04,
    referenceLabel: "per server",
    description: "CPU, memory, disk, network, process metrics via system integration (~500 metrics at 5 min interval)",
  },
  {
    id: "windows",
    name: "Windows Server",
    emoji: "🪟",
    category: "Hosts",
    gbPerDayPerUnit: 0.05,
    referenceLabel: "per server",
    description: "WMI performance counters, services, system metrics (~600 metrics at 5 min interval)",
  },

  // Kubernetes
  {
    id: "k8s-node",
    name: "Kubernetes Node",
    emoji: "☸️",
    category: "Kubernetes",
    gbPerDayPerUnit: 0.08,
    referenceLabel: "per node",
    description: "kubelet, cAdvisor, system metrics per node (~900 metrics at 5 min interval)",
  },
  {
    id: "k8s-pod",
    name: "Kubernetes Pod",
    emoji: "📦",
    category: "Kubernetes",
    gbPerDayPerUnit: 0.015,
    referenceLabel: "per pod",
    description: "Container CPU, memory, network, filesystem metrics (~150 metrics at 5 min interval)",
  },

  // Databases
  {
    id: "mysql",
    name: "MySQL",
    emoji: "🐬",
    category: "Databases",
    gbPerDayPerUnit: 0.03,
    referenceLabel: "per instance",
    description: "Query performance, InnoDB, connections, replication lag (~300 metrics at 5 min interval)",
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    emoji: "🐘",
    category: "Databases",
    gbPerDayPerUnit: 0.025,
    referenceLabel: "per instance",
    description: "Query stats, table/index metrics, connections, locks (~250 metrics at 5 min interval)",
  },
  {
    id: "redis",
    name: "Redis",
    emoji: "🔴",
    category: "Databases",
    gbPerDayPerUnit: 0.02,
    referenceLabel: "per instance",
    description: "Memory, ops/sec, keyspace, replication, persistence (~200 metrics at 5 min interval)",
  },
  {
    id: "mongodb",
    name: "MongoDB",
    emoji: "🍃",
    category: "Databases",
    gbPerDayPerUnit: 0.03,
    referenceLabel: "per instance",
    description: "Operations, connections, replication, WiredTiger (~300 metrics at 5 min interval)",
  },
  {
    id: "elasticsearch-node",
    name: "Elasticsearch Node",
    emoji: "🔍",
    category: "Databases",
    gbPerDayPerUnit: 0.04,
    referenceLabel: "per node",
    description: "Cluster health, JVM heap, index, shard, threadpool metrics (~400 metrics at 5 min interval)",
  },
  {
    id: "mssql",
    name: "SQL Server (MSSQL)",
    emoji: "🗃️",
    category: "Databases",
    gbPerDayPerUnit: 0.035,
    referenceLabel: "per instance",
    description: "Query store, wait stats, buffer pool, replication metrics (~350 metrics at 5 min interval)",
  },

  // Messaging
  {
    id: "kafka",
    name: "Kafka Broker",
    emoji: "📨",
    category: "Messaging",
    gbPerDayPerUnit: 0.06,
    referenceLabel: "per broker",
    description: "Consumer group lag, topic/partition metrics, broker JVM stats (~600 metrics at 5 min interval)",
  },
  {
    id: "rabbitmq",
    name: "RabbitMQ",
    emoji: "🐰",
    category: "Messaging",
    gbPerDayPerUnit: 0.025,
    referenceLabel: "per node",
    description: "Queue depth, message rates, consumers, exchanges (~250 metrics at 5 min interval)",
  },

  // Web / Proxy
  {
    id: "nginx",
    name: "NGINX",
    emoji: "🟢",
    category: "Web / Proxy",
    gbPerDayPerUnit: 0.015,
    referenceLabel: "per instance",
    description: "Request rates, connections, upstream, status codes (~150 metrics at 5 min interval)",
  },
  {
    id: "apache",
    name: "Apache",
    emoji: "🪶",
    category: "Web / Proxy",
    gbPerDayPerUnit: 0.015,
    referenceLabel: "per instance",
    description: "Request rates, workers, virtual host metrics (~150 metrics at 5 min interval)",
  },
  {
    id: "haproxy",
    name: "HAProxy",
    emoji: "⚖️",
    category: "Web / Proxy",
    gbPerDayPerUnit: 0.02,
    referenceLabel: "per instance",
    description: "Frontend/backend stats, connection rates, errors (~200 metrics at 5 min interval)",
  },

  // Cloud (AWS)
  {
    id: "aws-ec2",
    name: "AWS EC2 Instance",
    emoji: "☁️",
    category: "Cloud (AWS)",
    gbPerDayPerUnit: 0.02,
    referenceLabel: "per instance",
    description: "CloudWatch: CPU, network, disk, status check metrics (~5 min CloudWatch resolution)",
  },
  {
    id: "aws-rds",
    name: "AWS RDS Instance",
    emoji: "🗄️",
    category: "Cloud (AWS)",
    gbPerDayPerUnit: 0.025,
    referenceLabel: "per instance",
    description: "CloudWatch: DB connections, IOPS, latency, freeable memory (~5 min resolution)",
  },
  {
    id: "aws-lambda",
    name: "AWS Lambda Function",
    emoji: "⚡",
    category: "Cloud (AWS)",
    gbPerDayPerUnit: 0.008,
    referenceLabel: "per function",
    description: "Invocations, errors, duration, throttles, concurrent executions (~5 min resolution)",
  },
  {
    id: "aws-elb",
    name: "AWS ELB / ALB",
    emoji: "🔀",
    category: "Cloud (AWS)",
    gbPerDayPerUnit: 0.015,
    referenceLabel: "per load balancer",
    description: "Request count, latency, HTTP error rates, healthy host count (~5 min resolution)",
  },

  // Infrastructure
  {
    id: "docker",
    name: "Docker Host",
    emoji: "🐋",
    category: "Infrastructure",
    gbPerDayPerUnit: 0.03,
    referenceLabel: "per host",
    description: "Container CPU, memory, network, block I/O per host (~300 metrics at 5 min interval)",
  },
  {
    id: "vsphere-host",
    name: "VMware vSphere Host",
    emoji: "💻",
    category: "Infrastructure",
    gbPerDayPerUnit: 0.05,
    referenceLabel: "per ESXi host",
    description: "CPU, memory, disk, network per ESXi host including VMs (~500 metrics at 5 min interval)",
  },
  {
    id: "cisco-switch",
    name: "Cisco Switch / Router",
    emoji: "🔌",
    category: "Infrastructure",
    gbPerDayPerUnit: 0.03,
    referenceLabel: "per device",
    description: "Interface traffic, error rates, CPU, memory via SNMP (~300 metrics at 5 min interval)",
  },
];

// Convert total GB/day to metrics per second given bytes per datapoint
export function gbPerDayToMetricsPerSecond(gbPerDay: number, bytesPerDatapoint: number): number {
  const bytesPerDay = gbPerDay * 1024 * 1024 * 1024;
  const datapointsPerDay = bytesPerDay / bytesPerDatapoint;
  return datapointsPerDay / 86400;
}

// Convert total GB/day to monthly metric count
export function gbPerDayToMonthlyMetrics(gbPerDay: number, bytesPerDatapoint: number): number {
  const monthlyGB = gbPerDay * 30;
  return (monthlyGB * 1024 * 1024 * 1024) / bytesPerDatapoint;
}
