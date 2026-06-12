export interface PublicLiveSession {
  publicSessionId: string;
  displayName: string;
  profileImageUrl?: string;
  startedAt: string;
  currentSnapshot?: PublicLiveSnapshot;
  routePoints?: RoutePoint[];
}

export interface PublicLiveSnapshot {
  timestampUtc: string;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters?: number;
  speedKmh?: number;
  distanceCompletedMeters: number;
  distanceRemainingMeters?: number;
  routeProgressPercent?: number;
  heartRateBpm?: number;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  elevationMeters?: number;
}
