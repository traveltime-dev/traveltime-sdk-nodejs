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
 - `rateLimitSettings` [object] - in order to keep within [limits](https://docs.traveltime.com/api/overview/usage-limits) we suggest enabling this feature to reduce risk of receiving `HTTP 429 Too Many Requests` errors. When using rate limiter if the response status is `429` we will retry your request up to 3 times. This object accepts these arguments:
    - `enabled` [boolean] - pass `true` to enable rate limiter on this SDK instance. Default is set to `false`.
    - `hitsPerMinute` [number] - pass number that your plan supports. You can find what HPM your plan supports [here](https://docs.traveltime.com/api/overview/usage-limits#Hits-Per-Minute-HPM). If you are on custom plan and not sure of your limits feel free to contact us. Default value is `60`.

If you need to change any of these parameters you can call setter methods: `travelTimeClient.setBaseURL`, `travelTimeClient.setRateLimitSettings`.

---

Now you'll be able to call all TravelTime API endpoints from `travelTimeClient` instance.

Every instance function returns Object with type of `Promise<AxiosResponse<EndpointResponseType>>`.

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
import {
  TimeMapFastRequestArrivalSearch,
} from 'traveltime-api';

const arrival_search: TimeMapRequestArrivalSearch = {
  id: 'public transport to Trafalgar Square',
  arrival_time: new Date().toISOString(),
  travel_time: 900,
  coords: { lat: 51.507609, lng: -0.128315 },
  transportation: { type: 'public_transport' },
  range: { enabled: true, width: 3600 },
};

travelTimeClient.timeMapFast({
  arrival_searches: {
    one_to_many: [arrival_search]
  }
}).then((data) => console.log(data))
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

### [Time Filter (Fast)](https://traveltime.com/docs/api/reference/time-filter-fast)
A very fast version of `time_filter()`.
However, the request parameters are much more limited.
Currently only supports UK and Ireland.

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

### [Time Filter Fast (Proto)](https://traveltime.com/docs/api/reference/travel-time-distance-matrix-proto)
A fast version of time filter communicating using [protocol buffers](https://github.com/protocolbuffers/protobuf).

The request parameters are much more limited and only travel time is returned. In addition, the results are only approximately correct (95% of the results are guaranteed to be within 5% of the routes returned by regular time filter).

This inflexibility comes with a benefit of faster response times (Over 5x faster compared to regular time filter) and larger limits on the amount of destination points.

Body attributes:
* country: Return the results that are within the specified country.
* departureLocation: Point of departure.
* destinationCoordinates: Destination points. Cannot be more than 200,000.
* transportation: Transportation type.
* travelTime: Time limit.

#### Advanced Options

You can apply additional optional parameters to client constructor’s second argument `parameters` object:
 - `rateLimitSettings` [object] - in order to keep within [limits](https://docs.traveltime.com/api/overview/usage-limits) we suggest enabling this feature to reduce risk of receiving `HTTP 429 Too Many Requests` errors. This object accepts these arguments:
    - `enabled` [boolean] - pass `true` to enable rate limiter on this SDK instance. Default is set to `false`.
    - `hitsPerMinute` [number] - pass number that your plan supports. You can find what HPM your plan supports [here](https://docs.traveltime.com/api/overview/usage-limits#Hits-Per-Minute-HPM). If you are on custom plan and not sure of your limits feel free to contact us. Default value is `60`.

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
  transportation: 'driving+ferry',
  travelTime: 7200
};

travelTimeProtoClient.timeFilterFast(requestData)
  .then((data) => console.log(data))
  .catch((e) => console.error(e));
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
Find reachable postcodes from origin (or to destination) and get statistics about such postcodes.
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
