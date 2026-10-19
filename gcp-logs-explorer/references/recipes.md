# Recipes

## Filters

Errors for a GKE container:
```
resource.type="k8s_container"
resource.labels.cluster_name="CLUSTER"
resource.labels.namespace_name="NAMESPACE"
resource.labels.container_name="CONTAINER"
severity>=ERROR
```

Cloud Run service errors:
```
resource.type="cloud_run_revision"
resource.labels.service_name="SERVICE"
severity>=ERROR
```

Cloud Run 5xx requests:
```
resource.type="cloud_run_revision"
httpRequest.status>=500
```

Cloud Functions logs:
```
resource.type="cloud_function"
resource.labels.function_name="FUNCTION"
```

Compute Engine instance, syslog:
```
resource.type="gce_instance"
logName="projects/PROJECT/logs/syslog"
```

Admin Activity audit logs (who changed what):
```
log_id("cloudaudit.googleapis.com/activity")
protoPayload.methodName:"setIamPolicy"
```

One user's actions:
```
protoPayload.authenticationInfo.principalEmail="user@example.com"
```

Every log of one request:
```
trace="projects/PROJECT/traces/TRACE_ID"
```

Slow requests (latency is a duration string, so use a regex on seconds):
```
resource.type="cloud_run_revision"
httpRequest.latency=~"^([5-9]|[1-9][0-9]+)\\."
```

Text search in JSON message:
```
SEARCH(jsonPayload.message, "connection refused")
```

Exclude health checks:
```
NOT httpRequest.requestUrl:"/healthz"
```

## gcloud

```
gcloud logging read 'resource.type="cloud_run_revision" AND severity>=ERROR' --project=PROJECT --freshness=1h --limit=50 --format=json
```
```
gcloud logging read 'FILTER' --project=PROJECT --order=desc --format='table(timestamp,severity,textPayload)'
```
```
gcloud logging read 'FILTER' --project=PROJECT --format='value(jsonPayload.message)'
```
Tail (needs `gcloud components install alpha` on older versions):
```
gcloud alpha logging tail 'resource.type="k8s_container" AND severity>=WARNING' --project=PROJECT
```
Wrap the whole filter in single quotes so the shell leaves the inner double quotes alone.

Create a log-based metric, a sink and list buckets:
```
gcloud logging metrics create error_count --description='5xx responses' --log-filter='httpRequest.status>=500'
```
```
gcloud logging sinks create my-sink storage.googleapis.com/MY_BUCKET --log-filter='severity>=ERROR'
```
```
gcloud logging buckets list --project=PROJECT
```

## Deep link to Logs Explorer

Format:
```
https://console.cloud.google.com/logs/query;query=URL_ENCODED_FILTER;timeRange=PT1H;cursorTimestamp=2025-04-02T10:00:00Z?project=PROJECT
```
- `query` is the filter, URL-encoded (newline becomes `%0A`, space `%20`, `"` `%22`, `=` `%3D`, `>` `%3E`).
- `timeRange` accepts durations such as `PT15M`, `PT1H`, `P1D`, or `start/end` ISO timestamps like `2025-04-02T10:00:00Z/2025-04-02T11:00:00Z`.
- `project` goes after the `?`, the other parameters are `;`-separated.
- Generate the encoded link with:
```
python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' 'resource.type="cloud_run_revision" AND severity>=ERROR'
```
Tell the user to confirm the link opens, since the console may change parameter handling. The in-product Share link is the reliable fallback.

## Hand-off to Analytics

When the user wants counts or groupings, tell them to upgrade the bucket to Log Analytics, then use Actions then Analyze results. The query is translated to SQL with a `FROM` over the bucket view. Example shape:
```
SELECT severity, COUNT(*) AS n
FROM `PROJECT.LOCATION.BUCKET.LOG_VIEW`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
GROUP BY severity
```
