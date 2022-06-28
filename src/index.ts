import axios, { AxiosInstance } from 'axios';
import {
  MapInfoResponse,
  GeocodingResponse,
  GeocodingReverseRequest,
  GeocodingSearchRequest,
  RoutesRequest,
  RoutesResponse,
  SupportedLocationsResponse,
  SupportedLocationsRequest,
  TimeMapRequest,
  TimeMapResponse,
  TimeFilterRequest,
  TimeFilterResponse,
  TimeFilterFastRequest,
  TimeFilterFastResponse,
  TimeFilterPostcodesRequest,
  TimeFilterPostcodesResponse,
  TimeFilterPostcodeDistrictsRequest,
  TimeFilterPostcodeDistrictsResponse,
  TimeFilterPostcodeSectorsRequest,
  TimeFilterPostcodeSectorsResponse,
} from './types';

export * from './types';

export class TravelTimeClient {
  private apiKey: string;
  private applicationId: string;
  private axiosInstance: AxiosInstance;

  constructor(
    credentials: { apiKey: string, applicationId: string },
  ) {
    if (!(credentials.applicationId && credentials.apiKey)) throw new Error('Credentials must be valid');
    this.applicationId = credentials.applicationId;
    this.apiKey = credentials.apiKey;
    this.axiosInstance = axios.create({
      baseURL: 'https://api.traveltimeapp.com/v4',
      headers: {
        'Content-Type': 'application/json',
        'X-Application-Id': this.applicationId,
        'X-Api-Key': this.apiKey,
      },
    });
  }

  geocoding({ acceptLanguage, params }: GeocodingSearchRequest) {
    const headers = acceptLanguage ? { 'Accept-Language': acceptLanguage } : undefined;
    return this.axiosInstance.get<GeocodingResponse>('/geocoding/search', { params, headers });
  }

  geocodingReverse({ acceptLanguage, params }: GeocodingReverseRequest) {
    const headers = acceptLanguage ? { 'Accept-Language': acceptLanguage } : undefined;
    return this.axiosInstance.get<GeocodingResponse>('/geocoding/reverse', { params, headers });
  }

  mapInfo() {
    return this.axiosInstance.get<MapInfoResponse>('/map-info');
  }

  routes(data: RoutesRequest) {
    return this.axiosInstance.post<RoutesResponse>('/routes', data);
  }

  supportedLocations(data: SupportedLocationsRequest) {
    return this.axiosInstance.post<SupportedLocationsResponse>('/supported-locations', data);
  }

  timeFilter(data: TimeFilterRequest) {
    return this.axiosInstance.post<TimeFilterResponse>('/time-filter', data);
  }

  timeFilterFast(data: TimeFilterFastRequest) {
    return this.axiosInstance.post<TimeFilterFastResponse>('/time-filter/fast', data);
  }

  timeFilterPostcodeDistricts(data: TimeFilterPostcodeDistrictsRequest) {
    return this.axiosInstance.post<TimeFilterPostcodeDistrictsResponse>('/time-filter/postcode-districts', data);
  }

  timeFilterPostcodeSectors(data: TimeFilterPostcodeSectorsRequest) {
    return this.axiosInstance.post<TimeFilterPostcodeSectorsResponse>('/time-filter/postcode-sectors', data);
  }

  timeFilterPostcodes(data: TimeFilterPostcodesRequest) {
    return this.axiosInstance.post<TimeFilterPostcodesResponse>('/time-filter/postcodes', data);
  }

  timeMap(data: TimeMapRequest) {
    return this.axiosInstance.post<TimeMapResponse>('/time-map', data);
  }
}
