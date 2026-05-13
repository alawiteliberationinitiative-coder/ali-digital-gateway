export interface GeoStamp {
  ip: string;
  country: string;
  city: string;
  region: string;
  lat: number;
  lon: number;
  org: string;
  tz: string;
  ts: string;
}

export async function captureGeo(): Promise<GeoStamp | null> {
  try {
    const r = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!r.ok) return null;
    const d = await r.json();
    return {
      ip:      d.ip            ?? "",
      country: d.country_code  ?? "",
      city:    d.city          ?? "",
      region:  d.region        ?? "",
      lat:     d.latitude      ?? 0,
      lon:     d.longitude     ?? 0,
      org:     d.org           ?? "",
      tz:      d.timezone      ?? "",
      ts:      new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
