# Console.web Monitoring Configuration

Pre-built monitoring configurations for Grafana and Prometheus AlertManager.

## Grafana Dashboard

Import `grafana/dashboards/console-web.json` into your Grafana instance:

1. Go to Dashboards → Import
2. Upload the JSON file or paste its contents
3. Select your Prometheus data source
4. Click Import

### Dashboard Panels

| Panel | Description |
|-------|-------------|
| Request Rate | Requests per second |
| P95 Response Time | 95th percentile latency |
| Error Rate | Percentage of 5xx responses |
| WebSocket Connections | Active Socket.IO connections |
| Request Rate by Endpoint | Breakdown by route |
| Response Time Percentiles | p50, p95, p99 latency |
| Terminal Sessions | Active terminal connections |
| Memory Usage | Process memory metrics |
| Rate Limited Requests | 429 responses by route |

## AlertManager Rules

Add `alertmanager/rules.yml` to your Prometheus configuration:

```yaml
# prometheus.yml
rule_files:
  - /path/to/console-web/monitoring/alertmanager/rules.yml
```

### Alerts Included

| Alert | Severity | Threshold |
|-------|----------|-----------|
| HighErrorRate | critical | >5% errors for 2m |
| HighResponseTime | warning | p95 >1s for 5m |
| ServiceDown | critical | Unreachable for 1m |
| HighMemory | warning | >450MB for 5m |
| RateLimitHits | warning | >1 req/s rate limited |
| HighWebSocketConnections | warning | >50 connections |
| NoTraffic | warning | No requests for 15m |
| SlowDatabaseQueries | warning | p95 >0.5s for 5m |
| HighTerminalSessions | info | >20 sessions |

## Prometheus Scrape Config

Add this to your Prometheus configuration:

```yaml
scrape_configs:
  - job_name: 'console-web'
    static_configs:
      - targets: ['localhost:5275']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

## Metrics Endpoint

Console.web exposes Prometheus metrics at:

```
GET /metrics
```

Available metrics:
- `consoleweb_http_requests_total` - HTTP request counter
- `consoleweb_http_request_duration_seconds` - Request duration histogram
- `consoleweb_websocket_connections` - WebSocket connection gauge
- `consoleweb_terminal_sessions` - Terminal session gauge
- Standard Node.js process metrics

## Log Aggregation (Fluentd)

Ship structured JSON logs to Elasticsearch or Loki for centralized log management.

### Setup

1. Enable file logging in Console.web:
   ```bash
   export LOG_FILE=/home/thornburywn/Projects/console-web/logs/app.log
   ```

2. Configure Elasticsearch connection:
   ```bash
   export ELASTICSEARCH_HOST=your-elasticsearch-host
   export ELASTICSEARCH_PORT=9200
   export ELASTICSEARCH_USER=elastic
   export ELASTICSEARCH_PASSWORD=your-password
   ```

3. Start Fluentd:
   ```bash
   cd monitoring/fluentd
   docker-compose up -d
   ```

### Log Fields

Logs include these structured fields:
- `time` - ISO timestamp
- `level` - Numeric log level (10-60)
- `severity` - Human-readable level (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)
- `service` - Service name (console-web)
- `component` - Component name (http, socket, server, etc.)
- `requestId` - Request correlation ID
- `msg` - Log message

### Retention

Daily indices are created with pattern `console-web-YYYY.MM.DD`. Configure Elasticsearch ILM or a cron job for retention.

## Distributed Tracing (OpenTelemetry)

Enable distributed tracing for request correlation across services.

### Setup

1. Configure the OTLP endpoint:
   ```bash
   export OTEL_EXPORTER_OTLP_ENDPOINT=http://your-collector:4318
   export OTEL_SERVICE_NAME=console-web
   ```

2. Restart Console.web - tracing auto-initializes on startup.

### Trace Collectors

Compatible with:
- Jaeger
- Tempo (Grafana)
- Zipkin (via OTLP)
- Any OTLP-compatible collector

### Instrumented Components

Auto-instrumented:
- HTTP requests (Express)
- Database queries (PostgreSQL/Prisma)
- External HTTP calls

### Response Headers

When tracing is enabled, responses include:
- `X-Trace-Id` - Trace ID for correlation
