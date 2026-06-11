/** localStorage key for app settings. */
export const appSettingsStorageKey = "mapofus:settings";
/** Custom event name dispatched when settings are written. */
export const appSettingsUpdatedEvent = "mapofus:settings-updated";

export type { LoginPhotoText } from "@/data/loginPhotoSlots";
import type { LoginPhotoText } from "@/data/loginPhotoSlots";

/** Persistent app settings stored in localStorage. */
export type AppSettings = {
  /** Login page 3x3 grid photo data URLs keyed by slot index. */
  loginPhotos?: Record<string, string>;
  /** Login page photo caption texts keyed by slot index. */
  loginPhotoTexts?: Record<string, LoginPhotoText>;
  /** Anniversary date in "YYYY.MM.DD" format. */
  anniversaryDate?: string;
  /** Anniversary display label (e.g. "我们在一起"). */
  anniversaryLabel?: string;
  /** Up to 3 city IDs for weather display on the home page. */
  weatherCityIds?: string[];
  /** Data URL or path for the couple logo in the bottom-right corner. */
  coupleLogo?: string;
};

// Neutral defaults so a fresh copy never shows the original author's personal
// settings. Each user overrides these from the in-app settings page.
export const defaultAnniversaryDate = "2025.01.01";
export const defaultAnniversaryLabel = "我们在一起";
export const defaultWeatherCityIds = ["beijing", "shanghai", "guangzhou"];
/** Default maximum number of weather cities. */
export const maxWeatherCities = 3;
export const defaultCoupleLogo = "/logo/couple-logo-placeholder.svg";

const isValidLogo = (value: unknown): value is string =>
  typeof value === "string" && (value.startsWith("data:image/") || value.startsWith("/"));

export const defaultAppSettings: AppSettings = {};

const datePattern = /^\d{4}\.\d{1,2}\.\d{1,2}$/;

const cleanString = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
};

/** Read and validate app settings from localStorage. Returns defaults if unavailable or invalid. */
export const readAppSettings = (): AppSettings => {
  if (typeof window === "undefined") return defaultAppSettings;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(appSettingsStorageKey) ?? "{}") as unknown;

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return defaultAppSettings;
    }

    const settings = parsed as AppSettings & { loginCoverImage?: string };
    const loginPhotos =
      settings.loginPhotos && typeof settings.loginPhotos === "object" && !Array.isArray(settings.loginPhotos)
        ? Object.fromEntries(
            Object.entries(settings.loginPhotos).filter(
              ([, value]) => typeof value === "string" && value.startsWith("data:image/"),
            ),
          )
        : {};
    const loginPhotoTexts =
      settings.loginPhotoTexts && typeof settings.loginPhotoTexts === "object" && !Array.isArray(settings.loginPhotoTexts)
        ? Object.fromEntries(
            Object.entries(settings.loginPhotoTexts).map(([key, value]) => {
              if (typeof value !== "object" || value === null || Array.isArray(value)) return [key, {}];
              const item = value as LoginPhotoText;

              return [
                key,
                {
                  city: typeof item.city === "string" ? item.city : undefined,
                  label: typeof item.label === "string" ? item.label : undefined,
                },
              ];
            }),
          )
        : {};

    const anniversaryDate = cleanString(settings.anniversaryDate, 12);
    const weatherCityIds = Array.isArray(settings.weatherCityIds)
      ? settings.weatherCityIds
          .filter((id): id is string => typeof id === "string" && id.length > 0)
          .slice(0, maxWeatherCities)
      : undefined;

    return {
      loginPhotos,
      loginPhotoTexts,
      anniversaryDate: anniversaryDate && datePattern.test(anniversaryDate) ? anniversaryDate : undefined,
      anniversaryLabel: cleanString(settings.anniversaryLabel, 40),
      weatherCityIds: weatherCityIds && weatherCityIds.length > 0 ? weatherCityIds : undefined,
      coupleLogo: isValidLogo(settings.coupleLogo) ? settings.coupleLogo : undefined,
    };
  } catch {
    return defaultAppSettings;
  }
};

/** Write app settings to localStorage and dispatch an update event. */
export const writeAppSettings = (settings: AppSettings) => {
  window.localStorage.setItem(appSettingsStorageKey, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent<AppSettings>(appSettingsUpdatedEvent, { detail: settings }));
};
