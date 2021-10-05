# traveltimeJS: Travel Time NodeJS SDK

traveltimeJS is a NodeJS SDK for Travel Time API (https://traveltime.com/).  
Travel Time API helps users find locations by journey time rather than using ‘as the crow flies’ distance.  
Time-based searching gives users more opportunities for personalisation and delivers a more relevant search.

Dependencies:

* axios

## Installation

```
    npm install git+https://github.com/traveltime-dev/traveltime-sdk-nodejs
```

## Usage
All functions return API response bodies as promises.  
On invalid request functions will return [API error response](https://traveltime.com/docs/api/reference/error-response).  
As input all functions (except `map_info`, `geocoding` and `geocoding_reverse`) expect a `body` object.
This object must contain a valid request body. Check indvidual function documentation or API documention for information on how to construct it.


### Authentication
In order to authenticate with Travel Time API, you will have to supply the Application Id and Api Key. 

```js
    const traveltimejs = require('traveltimejs');
    //store your credentials in an environment variable
    process.env['TRAVELTIME_ID'] = 'YOUR_API_ID';
    process.env['TRAVELTIME_KEY'] = 'YOUR_API_KEY';
```

### [Isochrones (Time Map)](https://traveltime.com/docs/api/reference/isochrones)
Given origin coordinates, find shapes of zones reachable within corresponding travel time.
Find unions/intersections between different searches
 
Body attributes:
* departure_searches ( optional): Searches based on departure times.
Leave departure location at no earlier than given time. You can define a maximum of 10 searches
* arrival_searches ( optional): Searches based on arrival times.
Arrive at destination location at no later than given time. You can define a maximum of 10 searches
* unions ( optional): Define unions of shapes that are results of previously defined searches.
* intersections ( optional): Define intersections of shapes that are results of previously defined searches.

```js
    let departure_search1 = {
        'id': "public transport from Trafalgar Square",
        'departure_time': new Date,
        'travel_time': 900,
        'coords': { 'lat': 51.507609, 'lng': -0.128315 },
        'transportation': { 'type': "public_transport" },
        'properties': ['is_only_walking']
    }
    let departure_search2 = {
        'id': "driving from Trafalgar Square",
        'departure_time': new Date,
        'travel_time': 900,
        'coords': { 'lat': 51.507609, 'lng': -0.128315 },
        'transportation': { 'type': "driving" }
    }
    let arrival_search = {
        'id': "public transport to Trafalgar Square",
        'arrival_time': new Date,
        'travel_time': 900,
        'coords': { 'lat': 51.507609, 'lng': -0.128315 },
        'transportation': { 'type': "public_transport" },
        'range': { 'enabled': true, 'width': 3600 }
    }
    let union = {
        'id': "union of driving and public transport",
        'search_ids': ['driving from Trafalgar Square', 'public transport from Trafalgar Square']
    }
    let intersection = {
        'id': "intersection of driving and public transport",
        'search_ids': ['driving from Trafalgar Square', 'public transport from Trafalgar Square']
    }

    traveltimejs.time_map({
        departure_searches: [departure_search1, departure_search2],
        arrival_searches: [arrival_search],
        unions: [union],
        intersections: [intersection]
    }).then(out => console.log(out)).catch(e => console.log(e))
```

### [Distance Matrix (Time Filter)](https://traveltime.com/docs/api/reference/distance-matrix)
Given origin and destination points filter out points that cannot be reached within specified time limit.
Find out travel times, distances and costs between an origin and up to 2,000 destination points.

Body attributes:
* locations (Array of Objects): Locations to use. Each location requires an id and lat/lng values
* departure_searches (Array of Objects, optional): Searches based on departure times.
Leave departure location at no earlier than given time. You can define a maximum of 10 searches
* arrival_searches (Array of Objects, optional): Searches based on arrival times.
Arrive at destination location at no later than given time. You can define a maximum of 10 searches

```js
    let locations = [
        { "id": "London center", "coords": { "lat": 51.508930, "lng": -0.131387 } },
        { "id": "Hyde Park", "coords": { "lat": 51.508824, "lng": -0.167093 } },
        { "id": "ZSL London Zoo", "coords": { "lat": 51.536067, "lng": -0.153596 } }
    ]

    let departure_search = {
        "id": "forward search example",
        "departure_location_id": "London center",
        "arrival_location_ids": ["Hyde Park", "ZSL London Zoo"],
        "transportation": { "type": "bus" },
        "departure_time": new Date,
        "travel_time": 1800,
        "properties": ["travel_time"],
        "range": { "enabled": true, "max_results": 3, "width": 600 }
    }

    let arrival_search = {
        "id": "backward search example",
        "departure_location_ids": ["Hyde Park", "ZSL London Zoo"],
        "arrival_location_id": "London center",
        "transportation": { "type": "public_transport" },
        "arrival_time": new Date,
        "travel_time": 1900,
        "properties": ["travel_time", "distance", "distance_breakdown", "fares"]
    }


    traveltimejs.time_filter({
        locations: locations,
        departure_searches: [departure_search],
        arrival_searches: [arrival_search]
    }).then(out => console.log(out)).catch(e => console.log(e))
```

### [Routes](https://traveltime.com/docs/api/reference/routes)
Returns routing information between source and destinations.

Body attributes:
* locations (Array of Objects): Locations to use. Each location requires an id and lat/lng values
* departure_searches (Array of Objects, optional): Searches based on departure times.
Leave departure location at no earlier than given time. You can define a maximum of 10 searches
* arrival_searches (Array of Objects, optional): Searches based on arrival times.
Arrive at destination location at no later than given time. You can define a maximum of 10 searches

```js
    let locations = [
        { "id": "London center", "coords": { "lat": 51.508930, "lng": -0.131387 } },
        { "id": "Hyde Park", "coords": { "lat": 51.508824, "lng": -0.167093 } },
        { "id": "ZSL London Zoo", "coords": { "lat": 51.536067, "lng": -0.153596 } }
    ]

    let departure_search = {
        "id": "departure search example",
        "departure_location_id": "London center",
        "arrival_location_ids": ["Hyde Park", "ZSL London Zoo"],
        "transportation": { "type": "driving" },
        "departure_time": new Date,
        "properties": ["travel_time", "distance", "route"]
    }

    let arrival_search = {
        "id": "arrival  search example",
        "departure_location_ids": ["Hyde Park", "ZSL London Zoo"],
        "arrival_location_id": "London center",
        "transportation": { "type": "public_transport" },
        "arrival_time": new Date,
        "properties": ["travel_time", "distance", "route", "fares"],
        "range": { "enabled": true, "max_results": 1, "width": 1800 }
    }


    traveltimejs.routes({
        locations: locations,
        departure_searches: [departure_search],
        arrival_searches: [arrival_search]
    }).then(out => console.log(out)).catch(e => console.log(e)).catch(e => console.log(e))
```

### [Time Filter (Fast)](https://traveltime.com/docs/api/reference/time-filter-fast)
A very fast version of time_filter().
However, the request parameters are much more limited.
Currently only supports UK and Ireland.

Body attributes:
* locations (Array of Objects): Locations to use. Each location requires an id and lat/lng values
* arrival_searches.many_to_one (Array of Objects, optional): Specify a single arrival location and multiple departure locations. Max 10.
* arrival_searches.one_to_many (Array of Objects, optional): Specify a single departure location and multiple arrival locations. Max 10.

```js
    let locations = [
        { "id": "London center", "coords": { "lat": 51.508930, "lng": -0.131387 } },
        { "id": "Hyde Park", "coords": { "lat": 51.508824, "lng": -0.167093 } },
        { "id": "ZSL London Zoo", "coords": { "lat": 51.536067, "lng": -0.153596 } }
    ]

    let arrival_many_to_one = {
        "id": "arrive-at many-to-one search example",
        "departure_location_ids": ["Hyde Park", "ZSL London Zoo"],
        "arrival_location_id": "London center",
        "transportation": { "type": "public_transport" },
        "arrival_time_period": "weekday_morning",
        "travel_time": 1900,
        "properties": ["travel_time", "fares"]
    }
    let arrival_one_to_many = {
        "id": "arrive-at one-to-many search example",
        "arrival_location_ids": ["Hyde Park", "ZSL London Zoo"],
        "departure_location_id": "London center",
        "transportation": { "type": "public_transport" },
        "arrival_time_period": "weekday_morning",
        "travel_time": 1900,
        "properties": ["travel_time", "fares"]
    }


    traveltimejs.time_filter_fast({
        locations: locations,
        arrival_searches: {
            many_to_one: [arrival_many_to_one],
            one_to_many: [arrival_one_to_many]
        }
    }).then(out => console.log(out)).catch(e => console.log(e))
```

### [Time Filter (Postcode Districts)](https://traveltime.com/docs/api/reference/postcode-district-filter)
Find districts that have a certain coverage from origin (or to destination) and get statistics about postcodes within such districts.
Currently only supports United Kingdom.

Body attributes:
* departure_searches (Array of Objects, optional): Searches based on departure times.
Leave departure location at no earlier than given time. You can define a maximum of 10 searches
* arrival_searches (Array of Objects, optional): Searches based on arrival times.
Arrive at destination location at no later than given time. You can define a maximum of 10 searches

```js
    let departure_search = {
        'id': "public transport from Trafalgar Square",
        'departure_time': new Date,
        'travel_time': 1800,
        'coords': { 'lat': 51.507609, 'lng': -0.128315 },
        'transportation': { 'type': "public_transport" },
        'properties': ["coverage", "travel_time_reachable", "travel_time_all"],
        "reachable_postcodes_threshold": 0.1
    }
    let arrival_search = {
        'id': "public transport to Trafalgar Square",
        'arrival_time': new Date,
        'travel_time': 1800,
        'coords': { 'lat': 51.507609, 'lng': -0.128315 },
        'transportation': { 'type': "public_transport" },
        'properties': ["coverage", "travel_time_reachable", "travel_time_all"],
        "reachable_postcodes_threshold": 0.1
    }

    traveltimejs.time_filter_postcode_districts({
        departure_searches: [departure_search],
        arrival_searches: [arrival_search]
    }).then(out => console.log(out)).catch(e => console.log(e))
```

### [Time Filter (Postcode Sectors)](https://traveltime.com/docs/api/reference/postcode-sector-filter)
Find sectors that have a certain coverage from origin (or to destination) and get statistics about postcodes within such sectors.
Currently only supports United Kingdom.

Body attributes:
* departure_searches (Array of Objects, optional): Searches based on departure times.
 Leave departure location at no earlier than given time. You can define a maximum of 10 searches
* arrival_searches (Array of Objects, optional): Searches based on arrival times.
 Arrive at destination location at no later than given time. You can define a maximum of 10 searches

```js
    let departure_search = {
        'id': "public transport from Trafalgar Square",
        'departure_time': new Date,
        'travel_time': 1800,
        'coords': { 'lat': 51.507609, 'lng': -0.128315 },
        'transportation': { 'type': "public_transport" },
        'properties': ["coverage", "travel_time_reachable", "travel_time_all"],
        "reachable_postcodes_threshold": 0.1
    }
    let arrival_search = {
        'id': "public transport to Trafalgar Square",
        'arrival_time': new Date,
        'travel_time': 1800,
        'coords': { 'lat': 51.507609, 'lng': -0.128315 },
        'transportation': { 'type': "public_transport" },
        'properties': ["coverage", "travel_time_reachable", "travel_time_all"],
        "reachable_postcodes_threshold": 0.1
    }

    traveltimejs.time_filter_postcode_sectors({
        departure_searches: [departure_search],
        arrival_searches: [arrival_search]
    }).then(out => console.log(out)).catch(e => console.log(e))
```

### [Time Filter (Postcodes)](https://traveltime.com/docs/api/reference/postcode-search)
Find reachable postcodes from origin (or to destination) and get statistics about such postcodes.
Currently only supports United Kingdom.

Body attributes:
* departure_searches (Array of Objects, optional): Searches based on departure times.
 Leave departure location at no earlier than given time. You can define a maximum of 10 searches
* arrival_searches (Array of Objects, optional): Searches based on arrival times.
 Arrive at destination location at no later than given time. You can define a maximum of 10 searches

```js
    let departure_search = {
        'id': "public transport from Trafalgar Square",
        'departure_time': new Date,
        'travel_time': 1800,
        'coords': { 'lat': 51.507609, 'lng': -0.128315 },
        'transportation': { 'type': "public_transport" },
        'properties': ["travel_time", "distance"]
    }
    let arrival_search = {
        'id': "public transport to Trafalgar Square",
        'arrival_time': new Date,
        'travel_time': 1800,
        'coords': { 'lat': 51.507609, 'lng': -0.128315 },
        'transportation': { 'type': "public_transport" },
        'properties': ["travel_time", "distance"]
    }

    traveltimejs.time_filter_postcodes({
        departure_searches: [departure_search],
        arrival_searches: [arrival_search]
    }).then(out => console.log(out)).catch(e => console.log(e))
```

### [Geocoding (Search)](https://traveltime.com/docs/api/reference/geocoding-search) 
Match a query string to geographic coordinates.

Body attributes:
* query (String): A query to geocode. Can be an address, a postcode or a venue.
* within_country (String, optional): Only return the results that are within the specified country.
 If no results are found it will return the country itself. Format:ISO 3166-1 alpha-2 or alpha-3
* exclude_location_types (String, optional): Exclude location types from results. Available values: "country".

```js
    traveltimejs.geocoding({ query: 'Parliament square' }).then((out) => { console.log(out) }).catch((e) => { console.log(e) })
```
### [Reverse Geocoding](https://traveltime.com/docs/api/reference/geocoding-reverse)
Attempt to match a latitude, longitude pair to an address.

Body attributes:
* lat (Number): Latitude of the point to reverse geocode.
* lng (Number): Longitude of the point to reverse geocode.
* within_country (String, optional): Only return the results that are within the specified country.
 If no results are found it will return the country itself. Format:ISO 3166-1 alpha-2 or alpha-3
* exclude_location_types (String, optional): Exclude location types from results. Available values: "country".

```js
    traveltimejs.geocoding_reverse({ lat: 51.507281, lng: -0.132120 }).then((out) => { console.log(out) }).catch((e) => { console.log(e) })
```

### [Map Info](https://traveltime.com/docs/api/reference/map-info) and [Supported Locations](https://traveltime.com/docs/api/reference/supported-locations)
Get information about currently supported countries and find out what points are supported by the api.

Supported Locations Body attributes:
* locations (Array of Objects): Locations to use. Each location requires an id and lat/lng values

```js
    traveltimejs.map_info().then(out => console.log(out)).catch(e => console.log(e))
    ////
    let locations = [
        {"id": "Kaunas", "coords": {"lat": 54.900008, "lng": 23.957734}},
        {"id": "London", "coords": {"lat": 51.506756, "lng": -0.128050}},
        {"id": "Bangkok", "coords": {"lat": 13.761866, "lng": 100.544818}},
        {"id": "Lisbon", "coords": {"lat": 38.721869, "lng": -9.138549}}
    ]
    traveltimejs.supported_locations({ locations }).then(out => console.log(out)).catch(e => console.log(e))
```