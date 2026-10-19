---
name: gcp-logs-explorer
description: Work with Google Cloud Logs Explorer - write and debug Logging query language filters, build Logs Explorer deep links, run the same queries from gcloud, and use the Explorer features (timeline, fields pane, pinning, trace correlation, streaming, download, create metric/sink/alert, Analyze results). Use when the user mentions Logs Explorer, Cloud Logging, gcloud logging, a log filter or query, finding errors for a GKE, Cloud Run, Compute or Cloud Functions workload, tracing a request through logs, exporting logs, or a log-based metric or alert.
---

# GCP Logs Explorer

Logs Explorer retrieves and views log entries stored in log buckets. For counts and aggregations it hands off to Observability Analytics (SQL), not the Explorer itself.

## Workflow

1. Pin down scope: project ID, resource type (`k8s_container`, `cloud_run_revision`, `gce_instance`, `cloud_function`), and the time window.
2. Write the filter in the Logging query language. Start narrow (resource, severity, time), then add text.
3. Deliver it in the form the user can use: the filter text, a `gcloud logging read` command, and a Logs Explorer deep link (see `references/recipes.md`).
4. If the user pastes a filter that returns nothing or errors, run the checklist under Debugging below before rewriting it.

Read `references/query-language.md` for syntax and `references/recipes.md` for ready filters, gcloud commands and deep links.

## Core syntax (must know)

- `AND`, `OR`, `NOT` must be uppercase. Whitespace between clauses means `AND`. Precedence is `NOT`, `OR`, `AND`, so parenthesize every `OR`.
- Operators: `=`, `!=`, `<`, `<=`, `>`, `>=`, `:` (contains), `=~` and `!~` (RE2 regex, case-sensitive, unanchored), `:*` (field exists), `--` comment.
- `severity >= ERROR` works because severity is ordered.
- `timestamp >= "2025-04-02T10:00:00Z"`. A bare date means midnight UTC.
- Prefer `SEARCH(textPayload, "words")` over a bare value or `:` for text lookup. Backticks force an exact phrase: ``SEARCH("`hello world`")``.
- Missing fields fail silently: `field != x` is FALSE when the field is absent, `NOT field = x` is TRUE.
- Max query length is 20,000 characters.

## Explorer features worth pointing the user to

- Query library: Recent, Saved, Suggested, Google-provided queries. Share link produces a short URL with an absolute time range.
- Scope: Project logs (`_Default`), a log view, or a custom log scope. Refine scope changes it for the session only.
- Timeline: bars colored by severity (blue Default to Notice, yellow Warning, red Error to Emergency). Drag handles then Run, Scroll to time, Zoom to time. Edits are limited to the past 30 days. Counts are approximate.
- Fields pane: click a value to refine the query. Pin custom `jsonPayload` fields. High-cardinality fields like `insertId` cannot be pinned.
- Results: expand, pin an entry, Show or Hide matching entries, Hide similar entries, Wrap lines (up to 10 lines), summary chips with Manage summary fields.
- Correlation: pin an entry, then Same resource.type, Same resource.labels or Same trace. Trace icon offers Show all logs for this trace (needs `trace` on the entry).
- Stream logs: live tail with the current filter. Scrolling pauses it.
- Actions menu: Create metric, Create sink (prefilled with the query), Create log alert, Download (CSV or JSON, max 10,000 entries), Analyze results (only on buckets upgraded to Log Analytics).

## Debugging a filter that returns nothing

1. Booleans uppercase? `or` is not an operator.
2. `OR` inside parentheses? `a = "x" OR "y"` means something different from `a = ("x" OR "y")`.
3. Field path correct and case-correct? `jsonPayload` and `labels` keys are case-sensitive.
4. Values containing `:` or spaces quoted?
5. A `timestamp` clause in the query overrides the time-range selector.
6. Wrong scope: the entries may live in another project or a log view that filters them out.
7. Entries older than bucket retention, or timestamped in the future, do not show.
8. Error "Invalid query" over many buckets (more than 200) means narrow the scope. "deadline expired" means narrow time and add indexed fields.

## Performance rules

- Use indexed fields first: `resource.type`, `resource.labels.*`, `logName`, `severity`, `timestamp`, `insertId`, `operation.id`, `trace`, `httpRequest.status`, `labels.*`.
- Equality beats `:`, `:` beats regex, `SEARCH` beats a bare global term. `AND` beats `OR`.
- Always bound the time range.

## Limits to mention when relevant

- Download caps at 10,000 entries. Use a sink to Cloud Storage or BigQuery for bulk export.
- Needs `logging.logEntries.list` to view and `logging.logEntries.download` to download (Logs Viewer or Logs View Accessor).
- Analytics does not query across projects or regions.
- Investigate log (Gemini Cloud Assist, Preview) should not be enabled for projects with data residency or CMEK requirements.
