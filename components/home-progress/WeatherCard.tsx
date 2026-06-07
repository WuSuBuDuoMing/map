"use client";

import { useEffect, useMemo, useState, type SVGProps } from "react";
import { RefreshCw } from "lucide-react";
import { cities } from "@/data/cities";
import {
  appSettingsUpdatedEvent,
  defaultWeatherCityIds,
  readAppSettings,
  type AppSettings,
} from "@/data/appSettings";

const weatherFallbackTemp = 24;

// Reads the user's local settings and stays in sync when they change them
// from the settings page (same tab via custom event, other tabs via storage).
function useAppSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>({});

  useEffect(() => {
    const sync = () => setSettings(readAppSettings());
    sync();
    window.addEventListener(appSettingsUpdatedEvent, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(appSettingsUpdatedEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return settings;
}

export type WeatherKind =
  | "sunny"
  | "partly"
  | "cloudy"
  | "rain"
  | "light-rain"
  | "moderate-rain"
  | "heavy-rain"
  | "thunder"
  | "snow"
  | "moderate-snow"
  | "heavy-snow"
  | "sleet"
  | "fog"
  | "wind"
  | "night-clear"
  | "night-partly";

type WeatherInfo = {
  cityId: string;
  temp: number;
  kind: WeatherKind;
  label: string;
};

type OpenMeteoCurrent = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    is_day?: number;
  };
};

function getWeatherKind(code: number, windSpeed: number, isDay: boolean): { kind: WeatherKind; label: string } {
  if (windSpeed >= 38) return { kind: "wind", label: "大风" };
  if (code === 0) return isDay ? { kind: "sunny", label: "晴" } : { kind: "night-clear", label: "夜晴" };
  if (code === 1 || code === 2) {
    return isDay ? { kind: "partly", label: "多云" } : { kind: "night-partly", label: "夜多云" };
  }
  if (code === 3) return { kind: "cloudy", label: "阴" };
  if (code === 45 || code === 48) return { kind: "fog", label: "大雾" };
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) {
    return { kind: "light-rain", label: "小雨" };
  }
  if (code === 61) return { kind: "light-rain", label: "小雨" };
  if (code === 63) return { kind: "moderate-rain", label: "中雨" };
  if (code === 65) return { kind: "heavy-rain", label: "大雨" };
  if (code === 66 || code === 67) return { kind: "sleet", label: "雨夹雪" };
  if (code === 71 || code === 77) return { kind: "snow", label: "小雪" };
  if (code === 73) return { kind: "moderate-snow", label: "中雪" };
  if (code === 75) return { kind: "heavy-snow", label: "大雪" };
  if (code === 80) return { kind: "light-rain", label: "小雨" };
  if (code === 81) return { kind: "moderate-rain", label: "中雨" };
  if (code === 82) return { kind: "heavy-rain", label: "大雨" };
  if (code === 85) return { kind: "snow", label: "小雪" };
  if (code === 86) return { kind: "heavy-snow", label: "大雪" };
  if (code === 95 || code === 96 || code === 99) return { kind: "thunder", label: "雷雨" };

  return { kind: "rain", label: "阵雨" };
}

function buildWeatherUrl(lat: number, lng: number) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: "temperature_2m,weather_code,wind_speed_10m,is_day",
    timezone: "Asia/Shanghai",
  });

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export function WeatherPixelIcon({
  kind,
  className,
}: Readonly<{ kind: WeatherKind; className?: string }>) {
  const isNight = kind === "night-clear" || kind === "night-partly";
  const hasSun = kind === "sunny" || kind === "partly";
  const hasCloud = !["sunny", "night-clear", "fog", "wind"].includes(kind);
  const hasRain = ["rain", "light-rain", "moderate-rain", "heavy-rain", "thunder", "sleet"].includes(kind);
  const hasSnow = ["snow", "moderate-snow", "heavy-snow", "sleet"].includes(kind);
  const rainDrops = kind === "heavy-rain" ? 6 : kind === "moderate-rain" ? 5 : hasRain ? 3 : 0;
  const snowDrops = kind === "heavy-snow" ? 6 : kind === "moderate-snow" ? 5 : hasSnow ? 3 : 0;

  return (
    <svg className={`pixelated ${className ?? ""}`} viewBox="0 0 64 64" aria-hidden="true" shapeRendering="crispEdges">
      <g>
        {hasSun && (
          <>
            <rect x="14" y="7" width="6" height="6" fill="#FFB24A" />
            <rect x="6" y="22" width="6" height="6" fill="#FFB24A" />
            <rect x="28" y="22" width="6" height="6" fill="#FFB24A" />
            <rect x="14" y="36" width="6" height="6" fill="#FFB24A" />
            <rect x="12" y="17" width="16" height="16" fill="#FFCC63" />
            <rect x="16" y="13" width="8" height="24" fill="#FFE6A1" />
            <rect x="16" y="25" width="4" height="4" fill="#6D7382" />
            <rect x="24" y="25" width="4" height="4" fill="#6D7382" />
            <rect x="20" y="31" width="4" height="4" fill="#E8B8C2" />
          </>
        )}
        {isNight && (
          <>
            <rect x="14" y="11" width="24" height="24" fill="#828BC4" />
            <rect x="22" y="7" width="18" height="28" fill="#FFE08B" />
            <rect x="30" y="7" width="12" height="20" fill="#828BC4" />
            <rect x="10" y="10" width="4" height="4" fill="#FFD37A" />
            <rect x="42" y="17" width="4" height="4" fill="#F5DCE0" />
            <rect x="18" y="32" width="4" height="4" fill="#E8B8C2" />
          </>
        )}
        {kind === "fog" && (
          <>
            <rect x="8" y="18" width="34" height="5" fill="#CFD6E1" />
            <rect x="20" y="27" width="34" height="5" fill="#BAC5D4" />
            <rect x="8" y="36" width="40" height="5" fill="#D8DEE8" />
            <rect x="16" y="45" width="26" height="5" fill="#BAC5D4" />
            <rect x="49" y="13" width="4" height="4" fill="#F2A6C0" />
            <rect x="53" y="17" width="4" height="4" fill="#F2A6C0" />
          </>
        )}
        {kind === "wind" && (
          <>
            <rect x="10" y="22" width="31" height="4" fill="#AFC4EA" />
            <rect x="10" y="34" width="23" height="4" fill="#AFC4EA" />
            <rect x="18" y="46" width="32" height="4" fill="#AFC4EA" />
            <rect x="41" y="18" width="9" height="4" fill="#7A8FC5" />
            <rect x="33" y="30" width="13" height="4" fill="#7A8FC5" />
            <rect x="50" y="42" width="5" height="4" fill="#7A8FC5" />
            <rect x="51" y="13" width="4" height="4" fill="#F2A6C0" />
            <rect x="55" y="17" width="4" height="4" fill="#F2A6C0" />
          </>
        )}
        {hasCloud && (
          <>
            <rect x="14" y="25" width="38" height="18" fill={kind === "cloudy" || kind === "thunder" ? "#B9C1D3" : "#E9F3FF"} />
            <rect x="20" y="17" width="24" height="12" fill={kind === "cloudy" || kind === "thunder" ? "#C9D0DF" : "#F7FBFF"} />
            <rect x="10" y="31" width="46" height="12" fill={kind === "cloudy" || kind === "thunder" ? "#AEB7CB" : "#CFE4FF"} />
            <rect x="16" y="29" width="34" height="10" fill={kind === "cloudy" || kind === "thunder" ? "#D3D8E5" : "#FFFFFF"} />
            <rect x="11" y="41" width="44" height="4" fill="#5F82C3" opacity="0.65" />
          </>
        )}
        {Array.from({ length: rainDrops }).map((_, index) => (
          <rect
            key={`rain-${index}`}
            x={18 + (index % 3) * 12 + (index > 2 ? 4 : 0)}
            y={48 + Math.floor(index / 3) * 8}
            width="4"
            height="8"
            fill="#4D8ED8"
          />
        ))}
        {Array.from({ length: snowDrops }).map((_, index) => (
          <g key={`snow-${index}`} transform={`translate(${16 + (index % 3) * 14 + (index > 2 ? 3 : 0)} ${49 + Math.floor(index / 3) * 7})`}>
            <rect x="3" y="0" width="3" height="9" fill="#7FA4D8" />
            <rect x="0" y="3" width="9" height="3" fill="#7FA4D8" />
          </g>
        ))}
        {kind === "thunder" && (
          <>
            <rect x="31" y="43" width="7" height="11" fill="#FFB24A" />
            <rect x="25" y="52" width="13" height="5" fill="#FFB24A" />
            <rect x="29" y="57" width="5" height="7" fill="#D8663D" />
          </>
        )}
      </g>
    </svg>
  );
}

export function WeatherFrame(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 128 8" aria-hidden="true" {...props}>
      <rect x="0" y="3" width="128" height="2" fill="#D8DDD8" opacity="0.45" />
      <rect x="14" y="2" width="14" height="4" fill="#F5DCE0" opacity="0.72" />
      <rect x="88" y="2" width="8" height="4" fill="#D6E8F0" opacity="0.82" />
    </svg>
  );
}

export function WeatherCard() {
  const [weather, setWeather] = useState<Record<string, WeatherInfo>>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const settings = useAppSettings();

  const locationCities = useMemo(
    () =>
      (settings.weatherCityIds ?? defaultWeatherCityIds)
        .map((cityId) => {
          const city = cities.find((item) => item.id === cityId);
          return city ? { cityId, fallbackTemp: weatherFallbackTemp, city } : null;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [settings.weatherCityIds],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      setIsLoading(true);
      const entries = await Promise.all(
        locationCities.map(async ({ city, fallbackTemp }) => {
          const response = await fetch(buildWeatherUrl(city.lat, city.lng)).catch(() => null);
          const data = response?.ok ? ((await response.json().catch(() => null)) as OpenMeteoCurrent | null) : null;
          const current = data?.current;
          const temp = Math.round(current?.temperature_2m ?? fallbackTemp);
          const weatherCode = current?.weather_code ?? 0;
          const windSpeed = current?.wind_speed_10m ?? 0;
          const mapped = getWeatherKind(weatherCode, windSpeed, (current?.is_day ?? 1) === 1);

          return [
            city.id,
            {
              cityId: city.id,
              temp,
              ...mapped,
            },
          ] as const;
        }),
      );

      if (!cancelled) {
        setWeather(Object.fromEntries(entries));
        setUpdatedAt(new Date());
        setIsLoading(false);
      }
    }

    loadWeather();
    const interval = window.setInterval(loadWeather, 30 * 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [locationCities]);

  const formatClock = (value: Date) =>
    new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(value);

  return (
    <div className="mb-4 rounded-[8px] border border-[#D8DDD8]/70 bg-[#FAFBF7]/66 p-3 text-[#5A6670] shadow-[0_10px_24px_rgba(90,102,112,0.05)] backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-semibold text-[#5A6670]/58">沿途天气</p>
          <p className="text-[11px] text-[#5A6670]/42">
            {updatedAt ? `${formatClock(updatedAt)} 更新` : "正在匹配"}
          </p>
        </div>
        <RefreshCw className={`h-4 w-4 text-[#A8C8DC] ${isLoading ? "animate-spin" : ""}`} />
      </div>
      <WeatherFrame className="mb-2 h-2 w-full" />
      <div className="grid grid-cols-3 gap-2">
        {locationCities.map(({ city, fallbackTemp }) => {
          const item = weather[city.id] ?? {
            cityId: city.id,
            temp: fallbackTemp,
            kind: "partly" as const,
            label: "多云",
          };

          return (
            <div
              key={city.id}
              className="min-w-0 rounded-[8px] border border-[#D8DDD8]/56 bg-white/36 px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
            >
              <p className="truncate text-[11px] font-semibold leading-none text-[#5A6670]/70">{city.name}</p>
              <WeatherPixelIcon kind={item.kind} className="mx-auto mt-1 h-10 w-10" />
              <div className="mt-1 flex items-end justify-center gap-0.5 leading-none">
                <span className="text-lg font-semibold text-[#5A6670]">{item.temp}</span>
                <span className="pb-0.5 text-xs font-semibold text-[#5A6670]/52">°</span>
              </div>
              <p className="mt-1 truncate text-[11px] font-semibold text-[#A8C8DC]">{item.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
