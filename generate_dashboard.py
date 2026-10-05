import json

dashboard = {
  "title": "Interview Metrics",
  "templating": {
    "list": [
      {
        "name": "environment",
        "type": "query",
        "datasource": "Prometheus",
        "query": "label_values(deployment_environment)",
        "refresh": 1
      },
      {
        "name": "version",
        "type": "query",
        "datasource": "Prometheus",
        "query": "label_values(service_version)",
        "refresh": 1
      }
    ]
  },
  "panels": [
    {
      "title": "Interview Rooms Created",
      "type": "timeseries",
      "targets": [{"expr": "rate(interview_rooms_created_total{deployment_environment=~\"$environment\", service_version=~\"$version\"}[5m])", "legendFormat": "Rooms"}],
      "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
    },
    {
      "title": "Active Participants",
      "type": "timeseries",
      "targets": [{"expr": "active_interview_participants{deployment_environment=~\"$environment\", service_version=~\"$version\"}", "legendFormat": "Participants"}],
      "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
    },
    {
      "title": "Canvas Elements Created",
      "type": "timeseries",
      "targets": [{"expr": "rate(canvas_elements_created_total{deployment_environment=~\"$environment\", service_version=~\"$version\"}[5m])", "legendFormat": "Elements"}],
      "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
    },
    {
      "title": "Component Creation Failures",
      "type": "timeseries",
      "targets": [{"expr": "rate(component_creation_failures_total{deployment_environment=~\"$environment\", service_version=~\"$version\"}[5m])", "legendFormat": "Failures"}],
      "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
    }
  ]
}
with open('02-development/observability/grafana/dashboards/interview_metrics.json', 'w') as f:
    json.dump(dashboard, f)
