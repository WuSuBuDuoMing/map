import type { LoginPhotoText } from "@/data/loginPhotoSlots";
import { loginPhotoSlots } from "@/data/loginPhotoSlots";
import type { AppSettings } from "@/data/appSettings";

export type StoredItem = {
  id: string;
  title: string;
  date?: string;
  note: string;
  cityId?: string;
};

export type CityAssetStore = Record<string, string>;

export const readItems = (key: string): StoredItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;

    return Array.isArray(parsed) ? parsed.filter((item): item is StoredItem => typeof item === "object" && item !== null && "id" in item) : [];
  } catch {
    return [];
  }
};

export const writeItems = (key: string, items: StoredItem[]) => {
  window.localStorage.setItem(key, JSON.stringify(items));
};

export const readJsonArray = (key: string) => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const imageFileToSettingImage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Invalid image"));
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new window.Image();

    image.addEventListener("load", () => {
      const maxSize = 1800;
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      URL.revokeObjectURL(url);

      if (!context) {
        reject(new Error("Canvas unavailable"));
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    });

    image.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image read failed"));
    });

    image.src = url;
  });

export const normalizeAppSettings = (value: unknown): Partial<AppSettings> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};

  const settings = value as AppSettings & { loginCoverImage?: string };
  const loginPhotos =
    settings.loginPhotos && typeof settings.loginPhotos === "object" && !Array.isArray(settings.loginPhotos)
      ? Object.fromEntries(
          Object.entries(settings.loginPhotos).filter(
            ([key, photo]) =>
              loginPhotoSlots.some((slot) => slot.id === key) &&
              typeof photo === "string" &&
              photo.startsWith("data:image/"),
          ),
        )
      : {};
  const loginPhotoTexts =
    settings.loginPhotoTexts && typeof settings.loginPhotoTexts === "object" && !Array.isArray(settings.loginPhotoTexts)
      ? Object.fromEntries(
          Object.entries(settings.loginPhotoTexts)
            .filter(([key]) => loginPhotoSlots.some((slot) => slot.id === key))
            .map(([key, val]) => {
              if (typeof val !== "object" || val === null || Array.isArray(val)) return [key, {}];
              const item = val as LoginPhotoText;

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

  if (
    Object.keys(loginPhotos).length === 0 &&
    typeof settings.loginCoverImage === "string" &&
    settings.loginCoverImage.startsWith("data:image/")
  ) {
    return { loginPhotos: { hangzhou: settings.loginCoverImage }, loginPhotoTexts };
  }

  return { loginPhotos, loginPhotoTexts };
};

export const daysUntil = (value?: string) => {
  if (!value || !/^\d{4}\.\d{2}\.\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split(".").map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
};

export const auxiliaryStorageKeys = ["mapofus:favorites", "mapofus:anniversaries", "mapofus:capsules"] as const;
