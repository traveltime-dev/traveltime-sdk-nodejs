const axios = require('axios');

exports.map_info = function () {
  return traveltime_api(['map-info']);
}

exports.supported_locations = function (body) {
  return traveltime_api(['supported-locations'], body)
}

exports.geocoding = function ({ query, within_country = undefined, exclude_location_types = undefined }) {

  queryFull = {
    'query': query,
    'within.country': within_country,
    'exclude.location.types': exclude_location_types
  }

  return traveltime_api(['geocoding', 'search'], undefined, queryFull)
}

exports.geocoding_reverse = function ({ lat, lng, within_country = undefined, exclude_location_types = undefined }) {

  queryFull = {
    'lat': lat,
    'lng': lng,
    'within.country': within_country,
    'exclude.location.types': exclude_location_types
  }

  return traveltime_api(['geocoding', 'reverse'], undefined, queryFull)
}


exports.time_map = function (body) {

  if (body.departure_searches === undefined && body.arrival_searches === undefined) {
    throw new Error("At least one of arrival_searches/departure_searches required!");
  }

  return traveltime_api(['time-map'], body)
}

exports.routes = function (body) {

  if (body.departure_searches === undefined && body.arrival_searches === undefined) {
    throw new Error("At least one of arrival_searches/departure_searches required!");
  }

  return traveltime_api(['routes'], body)
}

exports.time_filter = function (body) {

  if (body.departure_searches === undefined && body.arrival_searches === undefined) {
    throw new Error("At least one of arrival_searches/departure_searches required!");
  }

  return traveltime_api(['time-filter'], body)
}

exports.time_filter_fast = function (body) {

  if (body.arrival_searches.many_to_one  === undefined && body.arrival_searches.one_to_many === undefined) {
    throw new Error("At least one of arrival_searches.many_to_one/arrival_searches.one_to_many required!");
  }

  return traveltime_api(['time-filter', 'fast'], body)
}

exports.time_filter_postcodes = function (body) {

  if (body.departure_searches === undefined && body.arrival_searches === undefined) {
    throw new Error("At least one of arrival_searches/departure_searches required!");
  }

  return traveltime_api(['time-filter', 'postcodes'], body)
}

exports.time_filter_postcode_districts = function (body) {

  if (body.departure_searches === undefined && body.arrival_searches === undefined) {
    throw new Error("At least one of arrival_searches/departure_searches required!");
  }

  return traveltime_api(['time-filter', 'postcode-districts'], body)
}

exports.time_filter_postcode_sectors = function (body) {

  if (body.departure_searches === undefined && body.arrival_searches === undefined) {
    throw new Error("At least one of arrival_searches/departure_searches required!");
  }

  return traveltime_api(['time-filter', 'postcode-sectors'], body)
}

function get_api_headers() {

  let ttid = process.env['TRAVELTIME_ID'];
  let ttkey = process.env['TRAVELTIME_KEY'];

  if (ttid === undefined) {
    throw new Error("Please set env var TRAVELTIME_ID to your Travel Time Application Id");
  }
  if (ttkey === undefined) {
    throw new Error("Please set env var TRAVELTIME_KEY to your Travel Time Api Ke");
  }

  return { 'X-Application-Id': ttid, 'X-Api-Key': ttkey, 'User-Agent': 'Travel Time NodeJS SDK' }
}

function traveltime_api(path, body, query) {

  opts = {
    url: 'https://api.traveltimeapp.com/v4/' + path.join("/"),
    headers: get_api_headers()
  };

  if (body === undefined) {
    opts.method = 'GET';
  } else {
    opts.method = 'POST';
    opts.data = body;
  }

  if (query !== undefined) {
    opts.params = query;
  }

  return axios(opts).then(succ => succ.data,
     err => {
       throw err.response.data
  })
}