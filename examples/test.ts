import { Coords, TimeMapRequestDepartureSearch, TravelTimeClient } from '../src';

const travelTimeClient = new TravelTimeClient({
  apiKey: 'I will keep your secrets',
  applicationId: 'Donatas',
});

function generateNearbyCoordinates(baseCoords: Coords, count: number, distance: number): Coords[] {
  const nearbyCoordinates: Coords[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * 360) * (Math.PI / 180);
    const latOffset = Math.sin(angle) * distance;
    const lngOffset = Math.cos(angle) * distance;

    const newCoords: Coords = {
      lat: baseCoords.lat + latOffset,
      lng: baseCoords.lng + lngOffset,
    };

    nearbyCoordinates.push(newCoords);
  }

  return nearbyCoordinates;
}

function getSearch(coord: Coords): TimeMapRequestDepartureSearch {
  return {
    id: (`public transport from ${coord.lat}`),
    departure_time: new Date().toISOString(),
    travel_time: 600,
    coords: coord,
    transportation: { type: 'driving' },
    properties: ['is_only_walking'],
  };
}

const baseCoordinate: Coords = { lat: 51.507609, lng: -0.128315 };
const searches: TimeMapRequestDepartureSearch[] = generateNearbyCoordinates(baseCoordinate, 50, 0.1).map(getSearch);


console.time('myOperation'); // Start the timer

travelTimeClient.timeMapBatch(searches)
  .then((r) => console.log(r))
  .then((_) => console.timeEnd('myOperation'));
