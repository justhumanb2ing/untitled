export const MAP_DEFAULT_LAT = 37.550263;
export const MAP_DEFAULT_LNG = 126.9970831;
export const MAP_DEFAULT_CENTER: [number, number] = [
  MAP_DEFAULT_LNG,
  MAP_DEFAULT_LAT,
];
export const MAP_DEFAULT_ZOOM = 13;

export function buildGoogleMapsHref(lat: number, lng: number, zoom: number) {
  return `https://www.google.com/maps/@${lat},${lng},${zoom}z`;
}
