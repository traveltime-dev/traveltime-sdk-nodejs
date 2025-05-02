<p align="center">
    <a href="https://traveltime.com">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://web-common.traveltimeplatform.com/images/tt_logo_dark.png">
        <source media="(prefers-color-scheme: light)" srcset="https://web-common.traveltimeplatform.com/images/tt-logo-new.png">
        <img alt="TravelTime Logo" src="https://web-common.traveltimeplatform.com/images/tt-logo-new.png" height="72px">
      </picture>
    </a>
    <h1 align="center">Node.js SDK</h1>
</p>

[![npm](https://img.shields.io/npm/v/traveltime-api?style=for-the-badge&labelColor=000000)](https://www.npmjs.com/package/traveltime-api)
[![GitHub](https://img.shields.io/github/license/traveltime-dev/traveltime-sdk-nodejs?style=for-the-badge&labelColor=000000)](https://github.com/traveltime-dev/traveltime-sdk-nodejs/blob/master/LICENSE)

[Travel Time](https://docs.traveltime.com/api/overview/introduction) Node.js SDK helps users find locations by journey time rather than using ‘as the crow flies’ distance. Time-based searching gives users more opportunities for personalisation and delivers a more relevant search.

## Installation

[npm](https://www.npmjs.com/package/traveltime-api)


```
npm i traveltime-api
```

This package comes with TypeScript support.

## Usage

### Client Initialization

Before starting, the package needs to be configured with your account's application ID and Key, which can be found in the [TravelTime Developer Portal Dashboard](https://account.traveltime.com/dashboard).
To create an instance - you will need to create new `TravelTimeClient` class object with credentials you got from dashboard.

```typescript
import { TravelTimeClient } from 'traveltime-api';

const travelTimeClient = new TravelTimeClient({
  apiKey: 'YOUR_APP_KEY',
  applicationId: 'YOUR_APP_ID',
});
```

#### Advanced Options

You can apply additional optional parameters to client constructor’s second argument `parameters` object:
 - `baseURL` [string] - you can change base URL of client. Default value is `https://api.traveltimeapp.com/v4`.
 - `axiosInstance` [object] - if needed, you can pass your own axios instance.
 - `rateLimitSettings` [object] - in order to keep within [limits](https://docs.traveltime.com/api/overview/usage-limits) we suggest enabling this feature to reduce risk of receiving `HTTP 429 Too Many Requests` errors. When using rate limiter if the response status is `429` we will retry your request up to 3 times. This object accepts these arguments:
    - `enabled` [boolean] - pass `true` to enable rate limiter on this SDK instance. Default is set to `false`.
    - `hitsPerMinute` [number] - pass number that your plan supports. You can find what HPM your plan supports [here](https://docs.traveltime.com/api/overview/usage-limits#Hits-Per-Minute-HPM). If you are on custom plan and not sure of your limits feel free to contact us. Default value is `60`.
    - `retryCount` [number] - Determines how many times request should be repeated when API returns status `429`. Default is `3`.
    - `timeBetweenRetries` [number] - Determines how often retry should happen. Time units - `milliseconds`. Default is `1000`.

If you need to change any of these parameters you can call setter methods: `travelTimeClient.setBaseURL`, `travelTimeClient.setRateLimitSettings`.

---

Now you'll be able to call all TravelTime API endpoints from `travelTimeClient` instance.

Every instance function returns Object with type of `Promise<AxiosResponse<EndpointResponseType>>`.

#### Batch Processing

Most endpoints are available with batch processing: 

```typescript
const departure_search: TimeMapRequestDepartureSearch = {
  id: 'public transport from Trafalgar Square',
  departure_time: new Date().toISOString(),
  travel_time: 900,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'public_transport' },
  properties: ['is_only_walking'],
};

const searches = Array(100).fill({ departure_searches: [departure_search] });

travelTimeClient.timeMapBatch(searches, 'application/geo+json')
  .then((data) => {
    data.forEach((search) => console.log(search));
  })
  .catch((e) => console.error(e));
```

Batch processing endpoints always return the same amount of responses and does not crash on an invalid request. It is up to the user to inspect whether the response was a success. `isBatchError` utility function is provided to facilitate inspecting batch responses.

```typescript
const response: BatchResponse<any> = { type: 'error', error: new Error('') };

if (isBatchError(response)) {
  response.error; // handle error
} else {
  response.body; // handle success
}
```


### [Isochrones (Time Map)](https://traveltime.com/docs/api/reference/isochrones)
Given origin coordinates, find shapes of zones reachable within corresponding travel time.
Find unions/intersections between different searches.

Body attributes:
* departure_searches: Searches based on departure times. Leave departure location at no earlier than given time. You can define a maximum of 10 searches.
* arrival_searches: Searches based on arrival times. Arrive at destination location at no later than given time. You can define a maximum of 10 searches.
* unions: Define unions of shapes that are results of previously defined searches.
* intersections: Define intersections of shapes that are results of previously defined searches.
 
Function accepts object that matches API json spec.

```typescript
import {
  TimeMapRequestArrivalSearch,
  TimeMapRequestDepartureSearch,
  TimeMapRequestUnionOrIntersection,
} from 'traveltime-api';

const departure_search1: TimeMapRequestDepartureSearch = {
  id: 'public transport from Trafalgar Square',
  departure_time: new Date().toISOString(),
  travel_time: 900,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'public_transport' },
  properties: ['is_only_walking'],
};
const departure_search2: TimeMapRequestDepartureSearch = {
  id: 'driving from Trafalgar Square',
  departure_time: new Date().toISOString(),
  travel_time: 900,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'driving' },
};
const arrival_search: TimeMapRequestArrivalSearch = {
  id: 'public transport to Trafalgar Square',
  arrival_time: new Date().toISOString(),
  travel_time: 900,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'public_transport' },
  range: { enabled: true, width: 3600 },
};
const union: TimeMapRequestUnionOrIntersection = {
  id: 'union of driving and public transport',
  search_ids: ['driving from Trafalgar Square', 'public transport from Trafalgar Square'],
};
const intersection: TimeMapRequestUnionOrIntersection = {
  id: 'intersection of driving and public transport',
  search_ids: ['driving from Trafalgar Square', 'public transport from Trafalgar Square'],
};

travelTimeClient.timeMap({
  departure_searches: [departure_search1, departure_search2],
  arrival_searches: [arrival_search],
  unions: [union],
  intersections: [intersection],
}).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### [Isochrones (Time Map) Fast](https://docs.traveltime.com/api/reference/isochrones-fast)
A very fast version of Isochrone API. However, the request parameters are much more limited.

```typescript
import { TimeMapFastRequestSearch } from 'traveltime-api';

const arrival_search: TimeMapFastRequestSearch = {
  id: 'public transport to Trafalgar Square',
  arrival_time_period: 'weekday_morning',
  travel_time: 900,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'public_transport' },
};

travelTimeClient.timeMapFast({
  arrival_searches: {
    one_to_many: [arrival_search],
  },
}).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### [H3](https://docs.traveltime.com/api/reference/h3)

```typescript
import {
  TravelTimeClient,
  UnionOrIntersection,
  H3RequestArrivalSearch,
  H3RequestDepartureSearch,
} from 'traveltime-api';

const departureSearch: H3RequestDepartureSearch = {
  id: 'public transport from Trafalgar Square',
  coords: {
    lat: 51.507609,
    lng: -0.128315,
  },
  travel_time: 1800,
  transportation: {
    type: 'public_transport',
  },
  departure_time: new Date().toISOString(),
};

const arrivalSearch: H3RequestArrivalSearch = {
  id: 'driving to Trafalgar Square',
  coords: {
    lat: 51.507609,
    lng: -0.128315,
  },
  travel_time: 900,
  transportation: {
    type: 'driving',
  },
  arrival_time: new Date().toISOString(),
};

const union: UnionOrIntersection = {
  id: 'union of driving to and transit from Trafalgar Square',
  search_ids: [
    'public transport from Trafalgar Square',
    'driving to Trafalgar Square',
  ],
};

travelTimeClient.h3(
  {
    resolution: 7,
    properties: ['mean'],
    departure_searches: [departureSearch],
    arrival_searches: [arrivalSearch],
    unions: [union],
  },
).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### [H3 Fast](https://docs.traveltime.com/api/reference/h3-fast)
A very fast version of H3 API. However, the request parameters are much more limited.

```typescript
import {
  TravelTimeClient,
  UnionOrIntersection,
  H3FastRequestSearch,
} from 'traveltime-api';

const drivingSearch: H3FastRequestSearch = {
  id: 'driving to Trafalgar Square',
  travel_time: 300,
  coords: {
    lat: 51.507609,
    lng: -0.128315,
  },
  transportation: {
    type: 'driving',
  },
  arrival_time_period: 'weekday_morning',
};

const publicTransportSearch: H3FastRequestSearch = {
  id: 'public transit to Trafalgar Square',
  travel_time: 300,
  coords: {
    lat: 51.507609,
    lng: -0.128315,
  },
  transportation: {
    type: 'public_transport',
  },
  arrival_time_period: 'weekday_morning',
};

const intersection: UnionOrIntersection = {
  id: 'driving and public transport to Trafalgar Square',
  search_ids: [drivingSearch.id, publicTransportSearch.id],
};

travelTimeClient.h3Fast(
  {
    resolution: 8,
    properties: ['mean'],
    arrival_searches: {
      one_to_many: [
        drivingSearch,
        publicTransportSearch,
      ],
    },
    intersections: [intersection],
  },
).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### [Geohash](https://docs.traveltime.com/api/reference/geohash)

```typescript
import {
  TravelTimeClient,
  UnionOrIntersection,
  GeohashRequestArrivalSearch,
  GeohashRequestDepartureSearch,
} from 'traveltime-api';

const departureSearch: GeohashRequestDepartureSearch = {
  id: 'driving from Trafalgar Square',
  coords: {
    lat: 51.507609,
    lng: -0.128315,
  },
  travel_time: 600,
  transportation: {
    type: 'driving',
  },
  departure_time: new Date().toISOString(),
};

const arrivalSearch: GeohashRequestArrivalSearch = {
  id: 'public transport to Trafalgar Square',
  coords: {
    lat: 51.507609,
    lng: -0.128315,
  },
  travel_time: 900,
  transportation: {
    type: 'public_transport',
  },
  arrival_time: new Date().toISOString(),
};

const intersection: UnionOrIntersection = {
  id: 'intersection of driving and public transport near Trafalgar Square',
  search_ids: ['driving from Trafalgar Square', 'public transport to Trafalgar Square'],
};

travelTimeClient.geohash(
  {
    resolution: 6,
    properties: ['mean'],
    departure_searches: [departureSearch],
    arrival_searches: [arrivalSearch],
    intersections: [intersection],
  },
).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### [Geohash Fast](https://docs.traveltime.com/api/reference/geohash-fast)
A very fast version of Geohash API. However, the request parameters are much more limited.

```typescript
import {
  TravelTimeClient,
  UnionOrIntersection,
  GeohashFastRequestSearch,
} from 'traveltime-api';

const drivingSearch: GeohashFastRequestSearch = {
  id: 'driving to Trafalgar Square',
  travel_time: 360,
  coords: {
    lat: 51.507609,
    lng: -0.128315,
  },
  transportation: {
    type: 'public_transport',
  },
  arrival_time_period: 'weekday_morning',
};

const publicTransportSearch: GeohashFastRequestSearch = {
  id: 'public transport to Trafalgar Square',
  travel_time: 360,
  coords: {
    lat: 51.507609,
    lng: -0.128315,
  },
  transportation: {
    type: 'driving',
  },
  arrival_time_period: 'weekday_morning',
};

const union: UnionOrIntersection = {
  id: 'driving and public transport to Trafalgar Square',
  search_ids: [drivingSearch.id, publicTransportSearch.id],
};

travelTimeClient.geohashFast(
  {
    resolution: 6,
    properties: ['mean'],
    arrival_searches: {
      one_to_many: [
        drivingSearch,
        publicTransportSearch,
      ],
    },
    unions: [union],
  },
).then((data) => console.log(data))
  .catch((e) => console.error(e));

```

### Time Map Response Formats

Time Map and Time Map Fast endpoints support multiple response formats. [See full list](https://docs.traveltime.com/api/reference/isochrones#Response-Body). You may pass a `format` parameter alongside your payload to specify particular response format. 

```typescript
travelTimeClient.timeMap(
  {...payload},
  'application/geo+json'
).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

Requesting an unsupported response format will result in an error.

### [Distance Map](https://docs.traveltime.com/api/reference/distance-map)
Given origin coordinates, find shapes of zones reachable within corresponding travel distance.
Find unions/intersections between different searches.

Body attributes:
* departure_searches: Searches based on departure times. Leave departure location at no earlier than given time. You can define a maximum of 10 searches.
* arrival_searches: Searches based on arrival times. Arrive at destination location at no later than given time. You can define a maximum of 10 searches.
* unions: Define unions of shapes that are results of previously defined searches.
* intersections: Define intersections of shapes that are results of previously defined searches.
 
Function accepts object that matches API json spec.

```typescript
import {
  DistanceMapRequestArrivalSearch,
  DistanceMapRequestDepartureSearch,
  DistanceMapRequestUnionOrIntersection,
} from 'traveltime-api';

const departure_search1: DistanceMapRequestDepartureSearch = {
  id: 'cycling from Trafalgar Square',
  departure_time: new Date().toISOString(),
  travel_distance: 900,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'driving' },
};
const departure_search2: DistanceMapRequestDepartureSearch = {
  id: 'driving from Trafalgar Square',
  departure_time: new Date().toISOString(),
  travel_distance: 900,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'driving' },
};
const arrival_search: DistanceMapRequestArrivalSearch = {
  id: 'cycling to Trafalgar Square',
  arrival_time: new Date().toISOString(),
  travel_distance: 900,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'cycling' },
};
const union: DistanceMapRequestUnionOrIntersection = {
  id: 'union of driving and cycling',
  search_ids: ['driving from Trafalgar Square', 'cycling from Trafalgar Square'],
};
const intersection: DistanceMapRequestUnionOrIntersection = {
  id: 'intersection of driving and cycling',
  search_ids: ['driving from Trafalgar Square', 'cycling from Trafalgar Square'],
};

travelTimeClient.distanceMap({
  departure_searches: [departure_search1, departure_search2],
  arrival_searches: [arrival_search],
  unions: [union],
  intersections: [intersection],
}).then((data) => console.log(data))
  .catch((e) => console.error(e));

```
### [Distance Matrix (Time Filter)](https://traveltime.com/docs/api/reference/distance-matrix)
Given origin and destination points filter out points that cannot be reached within specified time limit.
Find out travel times, distances and costs between an origin and up to 2,000 destination points.

Function accepts object that matches API json spec.

Body attributes:
* locations: Locations to use. Each location requires an id and lat/lng values.
* departure_searches: Searches based on departure times. Leave departure location at no earlier than given time. You can define a maximum of 10 searches.
* arrival_searches: Searches based on arrival times. Arrive at destination location at no later than given time. You can define a maximum of 10 searches.

```ts
import {
  LocationRequest,
  TimeFilterRequestArrivalSearch,
  TimeFilterRequestDepartureSearch,
} from 'traveltime-api';

const locations: LocationRequest[] = [
  {
    id: 'London center',
    coords: {
      lat: 51.508930,
      lng: -0.131387,
    },
  },
  {
    id: 'Hyde Park',
    coords: {
      lat: 51.508824,
      lng: -0.167093,
    },
  },
  {
    id: 'ZSL London Zoo',
    coords: {
      lat: 51.536067,
      lng: -0.153596,
    },
  },
];

const departure_search: TimeFilterRequestDepartureSearch = {
  id: 'forward search example',
  departure_location_id: 'London center',
  arrival_location_ids: ['Hyde Park', 'ZSL London Zoo'],
  transportation: { type: 'bus' },
  departure_time: new Date().toISOString(),
  travel_time: 1800,
  properties: ['travel_time'],
  range: { enabled: true, max_results: 3, width: 600 },
};

const arrival_search: TimeFilterRequestArrivalSearch = {
  id: 'backward search example',
  departure_location_ids: ['Hyde Park', 'ZSL London Zoo'],
  arrival_location_id: 'London center',
  transportation: { type: 'public_transport' },
  arrival_time: new Date().toISOString(),
  travel_time: 1800,
  properties: ['travel_time', 'distance', 'distance_breakdown', 'fares'],
};

travelTimeClient.timeFilter({
  locations,
  departure_searches: [departure_search],
  arrival_searches: [arrival_search],
}).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### Time Filter Many to Many Utility

This utility function leverages `travelTimeClient.timeFilter` (as described in the previous section) to efficiently construct Many-to-Many matrices in batches.


```ts
const matrix = await travelTimeClient.manyToManyMatrix({
    coordsFrom: [
      { lat: 51.5055, lng: -0.0754 },
      { lat: 51.5171, lng: -0.1062 },
      { lat: 51.5309, lng: -0.1215 },
      { lat: 51.5022, lng: -0.1149 },
      { lat: 51.5144, lng: -0.1427 },
    ],
    coordsTo: [
      { lat: 51.5055, lng: -0.0754 },
      { lat: 51.5171, lng: -0.1062 },
      { lat: 51.5309, lng: -0.1215 },
      { lat: 51.5022, lng: -0.1149 },
      { lat: 51.5144, lng: -0.1427 },
    ],
    transportation: { type: 'driving' },
    properties: ['travel_time', 'distance'],
    travelTime: 1800,
    leaveTime: new Date().toISOString(),
  });
```

The response will be in the following format:

```json
{
  "travelTimes":[
    [0,1637,-1,1516,-1],
    [1689,0,956,991,-1],
    [-1,815,0,1193,1178],
    [1550,1072,1522,0,1748],
    [-1,1702,1414,1556,0]
  ],
  "distances":[
    [0,1637,-1,1516,-1],
    [1689,0,956,991,-1],
    [-1,815,0,1193,1178],
    [1550,1072,1522,0,1748],
    [-1,1702,1414,1556,0]
  ],
  "errors":[]
}
```

The `travelTimes` and `distances` arrays are structured so that you can access specific values using `response.travelTimes[indexOfLocationFrom][indexOfLocationTo]`. Unreachable destinations are represented by `-1`. If there was an error while fetching the response, those entries will be marked as `null`. You can view all errors in the `response.errors` field.

### [Time Filter (Fast)](https://traveltime.com/docs/api/reference/time-filter-fast)
A very fast version of `time_filter()`.
However, the request parameters are much more limited.

Function accepts object that matches API json spec.

```ts
import {
  LocationRequest,
  TimeFilterFastRequestArrivalManyToOneSearch,
  TimeFilterFastRequestArrivalOneToManySearch,
} from 'traveltime-api';

const locations: LocationRequest[] = [
  { id: 'London center', coords: { lat: 51.508930, lng: -0.131387 } },
  { id: 'Hyde Park', coords: { lat: 51.508824, lng: -0.167093 } },
  { id: 'ZSL London Zoo', coords: { lat: 51.536067, lng: -0.153596 } },
];

const arrival_many_to_one: TimeFilterFastRequestArrivalManyToOneSearch = {
  id: 'arrive-at many-to-one search example',
  departure_location_ids: ['Hyde Park', 'ZSL London Zoo'],
  arrival_location_id: 'London center',
  transportation: { type: 'public_transport' },
  arrival_time_period: 'weekday_morning',
  travel_time: 1900,
  properties: ['travel_time', 'fares'],
};
const arrival_one_to_many: TimeFilterFastRequestArrivalOneToManySearch = {
  id: 'arrive-at one-to-many search example',
  arrival_location_ids: ['Hyde Park', 'ZSL London Zoo'],
  departure_location_id: 'London center',
  transportation: { type: 'public_transport' },
  arrival_time_period: 'weekday_morning',
  travel_time: 1900,
  properties: ['travel_time', 'fares'],
};

travelTimeClient.timeFilterFast({
  locations,
  arrival_searches: {
    many_to_one: [arrival_many_to_one],
    one_to_many: [arrival_one_to_many],
  },
}).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### Time Filter Fast Many to Many Utility

This utility function leverages `travelTimeClient.timeFilterFast` (as described in the previous section) to efficiently construct Many-to-Many matrices in batches.


```ts
const matrix = await travelTimeClient.manyToManyMatrixFast({
    coordsFrom: [
      { lat: 51.5055, lng: -0.0754 },
      { lat: 51.5171, lng: -0.1062 },
      { lat: 51.5309, lng: -0.1215 },
      { lat: 51.5022, lng: -0.1149 },
      { lat: 51.5144, lng: -0.1427 },
    ],
    coordsTo: [
      { lat: 51.5055, lng: -0.0754 },
      { lat: 51.5171, lng: -0.1062 },
      { lat: 51.5309, lng: -0.1215 },
      { lat: 51.5022, lng: -0.1149 },
      { lat: 51.5144, lng: -0.1427 },
    ],
    transportation: { type: 'driving' },
    properties: ['travel_time', 'distance'],
    travelTime: 1800,
  });
```

The response will be in the following format:

```json
{
  "travelTimes":[
    [0,1143,-1,1472,-1],
    [1254,0,949,1080,1733],
    [-1,997,0,1629,1462],
    [1522,953,1285,0,1638],
    [-1,-1,1249,-1,0]
  ],
  "distances":[
    [0,1143,-1,1472,-1],
    [1254,0,949,1080,1733],
    [-1,997,0,1629,1462],
    [1522,953,1285,0,1638],
    [-1,-1,1249,-1,0]
  ],
  "errors":[]
}
```

The `travelTimes` and `distances` arrays are structured so that you can access specific values using `response.travelTimes[indexOfLocationFrom][indexOfLocationTo]`. Unreachable destinations are represented by `-1`. If there was an error while fetching the response, those entries will be marked as `null`. You can view all errors in the `response.errors` field.

### [Time Filter Fast (Proto)](https://traveltime.com/docs/api/reference/travel-time-distance-matrix-proto)
A fast version of time filter communicating using [protocol buffers](https://github.com/protocolbuffers/protobuf).

The request parameters are much more limited and only travel time is returned. In addition, the results are only approximately correct (95% of the results are guaranteed to be within 5% of the routes returned by regular time filter).

This inflexibility comes with a benefit of faster response times (Over 5x faster compared to regular time filter) and larger limits on the amount of destination points.

Body attributes:
* country: Return the results that are within the specified country.
* departureLocation: Point of departure.
* destinationCoordinates: Destination points. Cannot be more than 200,000.
* transportation: Transportation type.
* transportationDetails: Additional transportation details available for "pt" and "driving+pt" transportation types.
* travelTime: Time limit.

#### Advanced Options

You can apply additional optional parameters to client constructor’s second argument `parameters` object:
 - `rateLimitSettings` [object] - in order to keep within [limits](https://docs.traveltime.com/api/overview/usage-limits) we suggest enabling this feature to reduce risk of receiving `HTTP 429 Too Many Requests` errors. This object accepts these arguments:
    - `enabled` [boolean] - pass `true` to enable rate limiter on this SDK instance. Default is set to `false`.
    - `hitsPerMinute` [number] - pass number that your plan supports. You can find what HPM your plan supports [here](https://docs.traveltime.com/api/overview/usage-limits#Hits-Per-Minute-HPM). If you are on custom plan and not sure of your limits feel free to contact us. Default value is `60`.
    - `retryCount` [number] - Determines how many times request should be repeated when API returns status `429`. Default is `3`.
    - `timeBetweenRetries` [number] - Determines how often retry should happen. Time units - `milliseconds`. Default is `1000`.

If you need to change any of these parameters you can call setter methods: `travelTimeClient.setRateLimitSettings`.

```ts
import { TravelTimeProtoClient, TimeFilterFastProtoRequest } from 'traveltime-api';

const travelTimeProtoClient = new TravelTimeProtoClient({
  apiKey: 'YOUR_APP_KEY',
  applicationId: 'YOUR_APP_ID',
});

const requestData: TimeFilterFastProtoRequest = {
  country: 'uk',
  departureLocation: {
    lat: 51.508930,
    lng: -0.131387,
  },
  destinationCoordinates: [{
    lat: 51.508824,
    lng: -0.167093,
  }],
  transportation: 'driving+pt',
  transportationDetails: { // only available for 'driving+pt` and 'pt'
    drivingAndPublicTransport: { // for 'pt' use 'publicTransport' instead
      walkingTimeToStation: 1800,
      drivingTimeToStation: 1800,
      parkingTime: 900
    }
  },
  travelTime: 7200
};

travelTimeProtoClient.timeFilterFast(requestData)
  .then((data) => console.log(data))
  .catch((e) => {
    if (e.response && e.response.headers) {
      const errorCode = e.response.headers['x-error-code'];
      const errorDetails = e.response.headers['x-error-details'];
      const errorMessage = e.response.headers['x-error-message'];

      console.error(`Travel Time API proto request failed with error code: ${e.response.status}`);
      console.error(`X-ERROR-CODE: ${errorCode || 'Not provided'}`);
      console.error(`X-ERROR-DETAILS: ${errorDetails || 'Not provided'}`);
      console.error(`X-ERROR-MESSAGE: ${errorMessage || 'Not provided'}`);
    } else {
      console.error(e);
    }
  });
```

### [Routes](https://traveltime.com/docs/api/reference/routes)
Returns routing information between source and destinations.

Function accepts object that matches API json spec.

Body attributes:
* locations: Locations to use. Each location requires an id and lat/lng values.
* departure_searches: Searches based on departure times. Leave departure location at no earlier than given time. You can define a maximum of 10 searches.
* arrival_searches: Searches based on arrival times. Arrive at destination location at no later than given time. You can define a maximum of 10 searches.

```ts
import {
  LocationRequest,
  RoutesRequestArrivalSearch,
  RoutesRequestDepartureSearch,
} from 'traveltime-api';

const locations: LocationRequest[] = [
  { id: 'London center', coords: { lat: 51.508930, lng: -0.131387 } },
  { id: 'Hyde Park', coords: { lat: 51.508824, lng: -0.167093 } },
  { id: 'ZSL London Zoo', coords: { lat: 51.536067, lng: -0.153596 } },
];

const departure_search: RoutesRequestDepartureSearch = {
  id: 'departure search example',
  departure_location_id: 'London center',
  arrival_location_ids: ['Hyde Park', 'ZSL London Zoo'],
  transportation: { type: 'driving' },
  departure_time: new Date().toISOString(),
  properties: ['travel_time', 'distance', 'route'],
};

const arrival_search: RoutesRequestArrivalSearch = {
  id: 'arrival  search example',
  departure_location_ids: ['Hyde Park', 'ZSL London Zoo'],
  arrival_location_id: 'London center',
  transportation: { type: 'public_transport' },
  arrival_time: new Date().toISOString(),
  properties: ['travel_time', 'distance', 'route', 'fares'],
  range: { enabled: true, max_results: 1, width: 1800 },
};

travelTimeClient.routes({
  locations,
  departure_searches: [departure_search],
  arrival_searches: [arrival_search],
}).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### [Geocoding (Search)](https://traveltime.com/docs/api/reference/geocoding-search) 
Match a query string to geographic coordinates.

Function accepts object that might has these properties:
 * `acceptLanguage` - [Request geocoding results to be in specific language if it is available.](https://docs.traveltime.com/api/reference/geocoding-search#Accept-Language)
 * `params` -  object that matches API json spec.

```ts
travelTimeClient.geocoding('Parliament square').then((data) => console.log(data))
  .catch((e) => console.error(e));
```
### [Reverse Geocoding](https://traveltime.com/docs/api/reference/geocoding-reverse)
Attempt to match a latitude, longitude pair to an address.

Function accepts object that might has these properties:
 * `coords` - lat, lng pair to try and match
 * `acceptLanguage` - [Request geocoding results to be in specific language if it is available.](https://docs.traveltime.com/api/reference/geocoding-search#Accept-Language)

```ts
travelTimeClient.geocodingReverse({
  lat: 51.507281, lng: -0.132120,
}).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### [Time Filter (Postcodes)](https://traveltime.com/docs/api/reference/postcode-search)
Find districts that have a certain coverage from origin (or to destination) and get statistics about postcodes within such districts.
Currently only supports United Kingdom.

Function accepts object that matches API json spec.

```ts
import {
  TimeFilterPostcodesRequestArrivalSearch,
  TimeFilterPostcodesRequestDepartureSearch,
} from 'traveltime-api';

const departure_search: TimeFilterPostcodesRequestDepartureSearch = {
  id: 'public transport from Trafalgar Square',
  departure_time: new Date().toISOString(),
  travel_time: 1800,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'public_transport' },
  properties: ['travel_time', 'distance'],
};
const arrival_search: TimeFilterPostcodesRequestArrivalSearch = {
  id: 'public transport to Trafalgar Square',
  arrival_time: new Date().toISOString(),
  travel_time: 1800,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'public_transport' },
  properties: ['travel_time', 'distance'],
};

travelTimeClient.timeFilterPostcodes({
  departure_searches: [departure_search],
  arrival_searches: [arrival_search],
}).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### [Time Filter (Postcode Districts)](https://traveltime.com/docs/api/reference/postcode-district-filter)
Find districts that have a certain coverage from origin (or to destination) and get statistics about postcodes within such districts.
Currently only supports United Kingdom.

Function accepts object that matches API json spec.

```ts
import {
  TimeFilterPostcodeDistrictsRequestArrivalSearch,
  TimeFilterPostcodeDistrictsRequestDepartureSearch,
} from 'traveltime-api';

const departure_search: TimeFilterPostcodeDistrictsRequestDepartureSearch = {
  id: 'public transport from Trafalgar Square',
  departure_time: new Date().toISOString(),
  travel_time: 1800,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'public_transport' },
  properties: ['coverage', 'travel_time_reachable', 'travel_time_all'],
  reachable_postcodes_threshold: 0.1,
};
const arrival_search: TimeFilterPostcodeDistrictsRequestArrivalSearch = {
  id: 'public transport to Trafalgar Square',
  arrival_time: new Date().toISOString(),
  travel_time: 1800,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'public_transport' },
  properties: ['coverage', 'travel_time_reachable', 'travel_time_all'],
  reachable_postcodes_threshold: 0.1,
};

travelTimeClient.timeFilterPostcodeDistricts({
  departure_searches: [departure_search],
  arrival_searches: [arrival_search],
}).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### [Time Filter (Postcode Sectors)](https://traveltime.com/docs/api/reference/postcode-sector-filter)
Find sectors that have a certain coverage from origin (or to destination) and get statistics about postcodes within such sectors.
Currently only supports United Kingdom.

Function accepts object that matches API json spec.

```ts
import {
  TimeFilterPostcodeSectorsRequestArrivalSearch,
  TimeFilterPostcodeSectorsRequestDepartureSearch,
} from 'traveltime-api';

const departure_search: TimeFilterPostcodeSectorsRequestDepartureSearch = {
  id: 'public transport from Trafalgar Square',
  departure_time: new Date().toISOString(),
  travel_time: 1800,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'public_transport' },
  properties: ['coverage', 'travel_time_reachable', 'travel_time_all'],
  reachable_postcodes_threshold: 0.1,
};
const arrival_search: TimeFilterPostcodeSectorsRequestArrivalSearch = {
  id: 'public transport to Trafalgar Square',
  arrival_time: new Date().toISOString(),
  travel_time: 1800,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'public_transport' },
  properties: ['coverage', 'travel_time_reachable', 'travel_time_all'],
  reachable_postcodes_threshold: 0.1,
};

travelTimeClient.timeFilterPostcodeSectors({
  departure_searches: [departure_search],
  arrival_searches: [arrival_search],
}).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### [Map Info](https://traveltime.com/docs/api/reference/map-info)
Get information about currently supported countries.

```ts
travelTimeClient.mapInfo()
  .then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### [Supported Locations](https://traveltime.com/docs/api/reference/supported-locations)
Find out what points are supported by the api.

Function accepts object that matches API json spec.

```ts
import {
  SupportedLocationsRequestLocation,
} from 'traveltime-api';

const locations: SupportedLocationsRequestLocation[] = [
  { id: 'Kaunas', coords: { lat: 54.900008, lng: 23.957734 } },
  { id: 'London', coords: { lat: 51.506756, lng: -0.128050 } },
  { id: 'Bangkok', coords: { lat: 13.761866, lng: 100.544818 } },
  { id: 'Lisbon', coords: { lat: 38.721869, lng: -9.138549 } },
];

travelTimeClient.supportedLocations({
  locations,
}).then((data) => console.log(data))
  .catch((e) => console.error(e));
```

### [TravelTime Error Response](https://docs.traveltime.com/api/reference/error-response)
If an error occurred in TravelTime api you can use TravelTimeError object to check and destructure error into a standard format.

```ts
import { TravelTimeError } from 'traveltime-api';

travelTimeClient.mapInfo()
  .then((data) => console.log(data))
  .catch((e) => {
      if(TravelTimeError.isTravelTimeError(e)) {
      // your error handling logic
    }
  });
```
