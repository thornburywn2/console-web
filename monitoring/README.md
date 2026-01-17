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
