# Migrating from v7 to v8

v8 is a breaking release. The themes are: errors never carry credentials,
every failure is a `TravelTimeError`, axios is gone, and client config is
immutable.

## Requirements

- **Node `>=22`**, now declared in `engines` (v7 declared no floor).
- Build output moved `target/` → `dist/`. This only matters if you imported
  from a deep path such as `traveltime-api/target/...`; the package `main`
  and `types` fields are updated.
- `axios` and `agentkeepalive` are no longer dependencies. `protobufjs` is
  the only runtime dependency left.

## Errors

The biggest change. Error fields are camelCase, and every failure the SDK
throws is now a `TravelTimeError` or one of its two subclasses.

### Field renames

| v7 | v8 |
| --- | --- |
| `http_status` | `status` |
| `error_code` | `errorCode` |
| `documentation_link` | `documentationLink` |
| `additional_info` | `additionalInfo` |
| `description`, `details` | unchanged |

`status` and `errorCode` are now **optional** — a transport failure has no
HTTP status to report.

```ts
// v7
catch (e) { if (e.http_status === 429) retry(); }

// v8
catch (e) { if (e.status === 429) retry(); }
```

### New error classes

- `TravelTimeError` — an error the API returned.
- `TravelTimeValidationError` — client-side validation failed; the request
  was never sent.
- `TravelTimeNetworkError` — a transport failure (timeout, DNS, aborted
  connection) or an HTTP failure with no TravelTime error body.

All three extend `Error`, so existing `catch` blocks keep working.

### Failures that used to escape as raw errors

In v7 anything that was not TravelTime-shaped was rethrown as-is, including
raw axios errors carrying `config.headers['X-Api-Key']`. In v8 those arrive
as `TravelTimeNetworkError` holding only primitive, credential-free fields.

```ts
// v7 — no longer works, axios is gone
catch (e) { if (e.isAxiosError) log(e.response.status); }

// v8
catch (e) { if (e instanceof TravelTimeNetworkError) log(e.status, e.code, e.url); }
```

`url` is recorded with the query string, fragment and any userinfo stripped.

### Renamed and removed

- `TraveltimeErrorConstructor` → `TravelTimeApiErrorPayload`.
- `makeError` / `makeProtoError` → `TravelTimeError.fromJsonResponse` /
  `fromProtoResponse`. Most callers need neither — the clients map errors
  themselves.
- `isTravelTimeError` now checks `instanceof` rather than the payload shape.
- `BatchResponse.error` is typed `TravelTimeError` rather than `Error`.
  Reading it is unaffected; constructing a `BatchResponse` with a plain
  `Error` no longer typechecks.
- Errors expose `isRetryable`, and `toJSON()` for structured loggers.

## Transport

The `axiosInstance` option is gone with no replacement — the clients use
native `fetch`. Timeouts and 429 retries are configured directly:

```ts
new TravelTimeClient(credentials, {
  timeout: 120000,                 // ms, default 120000
  retry: { maxRetries: 3, baseDelay: 1000, maxDelay: 60000 },
});
```

`TransportRetryOptions` no longer accepts `enabled` — pass `maxRetries: 0`
to disable retries.

## Config is immutable

`setCredentials`, `setBaseURL` and `setRateLimitSettings` are removed from
both clients. Pass configuration to the constructor; build a new client to
change it.

In v7 `setCredentials` updated unused private fields while requests kept
using the credentials captured at construction, so key rotation silently
never took effect. Constructing a new client is the fix.

## Rate limiter

`RateLimitSettings` is unchanged. The limiter itself was rewritten:

- Admissions are **paced** at `60000 / hitsPerMinute` ms per hit rather than
  bursting to the limit and stalling.
- A request costing more hits than `hitsPerMinute` now rejects immediately
  instead of hanging forever.
- Settings are validated at construction. Values v7 accepted silently —
  `maxRetries: Infinity`, fractional counts, non-positive delays — now throw
  `TravelTimeValidationError`.
- The proto client retries 429 while the rate limiter is enabled; in v7 that
  configuration had no retry path at all.

`RateLimiter` is not exported from the package root, so this only affects
deep imports. If you use it directly: `addAndExecute(task, hits, priority)`
is replaced by `await acquire(hits, priority)`, and `setRateLimitSettings`
and `setIsSleeping` are removed. `isEnabled`, `getRetryCount` and
`getTimeBetweenRetries` are unchanged.

## Proto client

- An unsupported `country` throws `TravelTimeValidationError` before the
  request is sent, naming the supported list. The country segment is
  lowercased, so `'UK'` and `'uk'` both work.
- `GeohashFastProtoResponseError` is removed and `GeohashFastProtoResponse`
  is the properties shape alone — `GeohashFastResponse` has no error field
  in the schema, so the variant was unreachable.
- `TimeFilterFastProtoResponseError.type` is optional: proto3 omits the
  enum's zero value (`UNKNOWN`) from the wire.
- An area with no reachable cells returns `{ cells: { ids: [] } }` rather
  than a bare `{}`, so `cells.ids` is always safe to map over.

## Removed deprecated request params

| Removed | Use instead |
| --- | --- |
| `single_shape` (time map, distance map) | `polygons_filter: { limit }` |
| `snap_penalty: 'enabled' \| 'disabled'` | `snapping: { penalty: 'enabled' \| 'disabled' }` |

## Also new in 8.0

Not breaking, carried up from 7.5.0:

- Many-to-one proto searches — pass `arrivalLocation` instead of
  `departureLocation`. Exactly one is now required at the type level.
- `timeFilterFastFares` on the proto client, returning `monthlyFares`.
- `h3Fast` proto endpoint, returning H3 cell indices in 15-character hex.
- `removeWaterBodies` on the fast cell endpoints.
- Bare `cycling` proto requests go to the cycling endpoint.
- `protoCountries` is exported from the package root, so you can reuse the
  supported-country list rather than hard-coding it.
