# Logging query language reference

## Fields

Top-level: `httpRequest`, `insertId`, `jsonPayload`, `labels`, `logName`, `metadata`, `operation`, `protoPayload`, `resource`, `severity`, `sourceLocation`, `spanId`, `textPayload`, `timestamp`, `trace`.

Quote path parts with special characters: `labels."compute.googleapis.com/resource_id"`.

- `jsonPayload` and `labels` keys are case-sensitive. `protoPayload` field names are not.
- 64-bit integers in `jsonPayload` are strings. Numbers compare as double.
- JSON null: `jsonPayload.field = NULL_VALUE`.
- Arrays match if any element matches.
- Existence: `operation.id:*`.
- For protobuf `Any` fields omit `value`: `protoPayload.status.details.conditionNotMet.userVisibleMessage =~ "Specified reservation.*"`.

## Functions

| Function | Example |
|---|---|
| `log_id(id)` | `log_id("cloudaudit.googleapis.com/activity")` (not URL-encoded) |
| `SEARCH([field,] "text")` | `SEARCH(textPayload, "hello world")` tokenized, case-insensitive, text fields only |
| exact phrase | ``SEARCH("`hello world`")`` |
| `cast(field, TYPE[, option])` | `cast(timestamp, STRING, TIME_ZONE("America/New_York")) =~ "^2025-04-02.*"` |
| `REGEXP_EXTRACT(field, re)` | one capture group only, chain with cast: `CAST(REGEXP_EXTRACT(CAST(timestamp, STRING), "\\d+:\\d+:(\\d+)"), INT64) < 30` |
| `source(scope)` | `source(projects/my-project)`, also `folders/` and `organizations/`, does not match children |
| `sample(field, fraction)` | `sample(insertId, 0.25)` |
| `ip_in_net(field, cidr)` | `ip_in_net(jsonPayload.realClientIP, "10.1.2.0/24")` |

## Regex (RE2)

Case-sensitive, unanchored, strings only. `labels.pod_name =~ "(foo|bar)"`, `=~ "(?i)foo"`, `logName =~ "foo$"`, `!~ "foo"`.

## Common mistakes

- `resource.type = "a" OR "b"` should be `resource.type = ("a" OR "b")`.
- Lowercase `and` / `or` / `not`.
- `textPayload:foo` on a JSON log yields nothing. Use `jsonPayload.message:foo`.
- Trailing wildcards like `foo*` are not glob syntax. Use `:` or a regex.
- Log view filters support only `AND` and `NOT`.
