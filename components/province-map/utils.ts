import { cityFallbackSprite, type City } from "@/data/cities";
import type { Memory } from "@/data/memories";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type BrowserTimeout = ReturnType<Window["setTimeout"]>;

export type PhotoDraft = {
  previewUrl: string;
  dataUrl: string | null;
  name: string;
};

export type CardAnchor = {
  x: number;
  y: number;
  side: "left" | "right";
};

export type MapCamera = {
  scale: number;
  x: number;
  y: number;
};

export type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startCamera: MapCamera;
};

export type MemoryPanelTab = "memory" | "gallery" | "history";

export type CityAssetStore = Record<string, string>;

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

export const spring = { type: "spring" as const, stiffness: 100, damping: 20 };
export const memoryTextMaxLength = 80;
export const maxPhotosPerMemory = 24;
export const memoryPhotoMaxDimension = 900;
export const memoryPhotoQuality = 0.52;
export const landmarkPhotoMaxDimension = 1280;
export const landmarkPhotoQuality = 0.76;
export const memoryCardWidth = 292;
export const memoryCardGap = 26;
export const memoryCardMaxHeight = 620;
export const cityListPanelWidth = 250;
export const emptyMemories: Memory[] = [];

/* -------------------------------------------------------------------------- */
/*  Object-url helpers                                                        */
/* -------------------------------------------------------------------------- */

export const isObjectUrl = (url?: string | null): url is string =>
  typeof url === "string" && url.startsWith("blob:");

export const revokeObjectUrl = (url?: string | null) => {
  if (isObjectUrl(url)) URL.revokeObjectURL(url);
};

export const isDataImageUrl = (url?: string | null): url is string =>
  typeof url === "string" && url.startsWith("data:image/");

/* -------------------------------------------------------------------------- */
/*  Marker layout                                                             */
/* -------------------------------------------------------------------------- */

export const markerLayoutByCity: Record<
  string,
  {
    width: number;
    height: number;
    iconSize: number;
    iconX: number;
    iconY: number;
    labelX: number;
    labelY: number;
  }
> = {
  zhengzhou: {
    width: 214,
    height: 156,
    iconSize: 112,
    iconX: -56,
    iconY: -116,
    labelX: -34,
    labelY: -22,
  },
  jinan: {
    width: 208,
    height: 142,
    iconSize: 102,
    iconX: -52,
    iconY: -106,
    labelX: -28,
    labelY: -18,
  },
  qingdao: {
    width: 208,
    height: 142,
    iconSize: 102,
    iconX: -52,
    iconY: -106,
    labelX: -28,
    labelY: -18,
  },
  shanghai: {
    width: 214,
    height: 156,
    iconSize: 114,
    iconX: -57,
    iconY: -116,
    labelX: -34,
    labelY: -22,
  },
  hangzhou: {
    width: 208,
    height: 144,
    iconSize: 104,
    iconX: -52,
    iconY: -108,
    labelX: -30,
    labelY: -18,
  },
  guangzhou: {
    width: 214,
    height: 150,
    iconSize: 106,
    iconX: -42,
    iconY: -104,
    labelX: -16,
    labelY: -34,
  },
  zhuhai: {
    width: 214,
    height: 142,
    iconSize: 110,
    iconX: -48,
    iconY: -76,
    labelX: -6,
    labelY: 4,
  },
  hongkong: {
    width: 236,
    height: 142,
    iconSize: 124,
    iconX: -62,
    iconY: -94,
    labelX: -28,
    labelY: -10,
  },
  macau: {
    width: 214,
    height: 146,
    iconSize: 102,
    iconX: -51,
    iconY: -98,
    labelX: -26,
    labelY: -10,
  },
};

export const defaultMarkerLayout = {
  width: 192,
  height: 140,
  iconSize: 96,
  iconX: -48,
  iconY: -104,
  labelX: -50,
  labelY: -18,
};

export const compactMarkerLayout = {
  width: 86,
  height: 54,
  iconSize: 18,
  iconX: -9,
  iconY: -9,
  labelX: 8,
  labelY: -15,
};

export const previewMarkerLayout = {
  width: 92,
  height: 86,
  iconSize: 46,
  iconX: -23,
  iconY: -43,
  labelX: -30,
  labelY: 12,
};

export const getMarkerLayout = (city: City, selected: boolean) => {
  if (city.sprite === cityFallbackSprite) return compactMarkerLayout;
  if (!selected) return previewMarkerLayout;

  return markerLayoutByCity[city.id] ?? defaultMarkerLayout;
};

/* -------------------------------------------------------------------------- */
/*  Math / zoom                                                               */
/* -------------------------------------------------------------------------- */

export const clampZoom = (value: number) => Math.min(Math.max(value, 1), 2.4);

/* -------------------------------------------------------------------------- */
/*  Image helpers                                                             */
/* -------------------------------------------------------------------------- */

export const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Image read failed"));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Image read failed")));
    reader.readAsDataURL(blob);
  });

export const readFileAsDataUrl = (file: File) => readBlobAsDataUrl(file);

export const loadImageFile = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.addEventListener(
      "load",
      () => {
        URL.revokeObjectURL(imageUrl);
        resolve(image);
      },
      { once: true },
    );
    image.addEventListener(
      "error",
      () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error("Image load failed"));
      },
      { once: true },
    );
    image.src = imageUrl;
  });

export async function readCompressedImageDataUrl(
  file: File,
  {
    maxDimension,
    quality,
  }: Readonly<{
    maxDimension: number;
    quality: number;
  }>,
) {
  if (file.type === "image/svg+xml") return readFileAsDataUrl(file);

  const image = await loadImageFile(file);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return readFileAsDataUrl(file);

  context.fillStyle = "#FAFBF7";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });

  if (!blob) return readFileAsDataUrl(file);

  return readBlobAsDataUrl(blob);
}

export const revokePhotoDrafts = (photos: PhotoDraft[]) => {
  photos.forEach((photo) => revokeObjectUrl(photo.previewUrl));
};

export const photosOfMemory = (memory?: Memory) => {
  if (!memory) return [];

  return memory.photos?.length ? memory.photos : [memory.image];
};
