import time
import requests
import subprocess
import json

ALERT_API = "http://admin:admin@localhost:3000/api/prometheus/grafana/api/v1/alerts"

def poll_alerts():
    print("Polling for alerts...")
    try:
        response = requests.get(ALERT_API, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if 'data' in data and 'alerts' in data['data']:
            for alert in data['data']['alerts']:
                if alert['state'] == 'firing':
                    print(f"Alert firing: {alert['labels'].get('alertname')}")
                    handle_alert(alert)
    except Exception as e:
        print(f"Error polling alerts: {e}")

def handle_alert(alert):
    alert_details = json.dumps(alert)
    # Pass to a headless coding agent (e.g. using Antigravity CLI or an LLM script)
    print("Passing alert to headless coding agent...")
    try:
        subprocess.run(["agy", "run", f"Fix the issue described in this alert: {alert_details}"], check=False)
    except FileNotFoundError:
        print("Mocking agent run: agy CLI not found.")

if __name__ == "__main__":
    while True:
        poll_alerts()
        time.sleep(60)
