"use client";

import { useMemo, useState, useEffect, type ReactNode } from "react";
import { Heart } from "lucide-react";
import { cities } from "@/data/cities";
import {
  getLitCityIds,
} from "@/data/progress";
import { TOTAL_PROVINCES } from "@/data/provinces";
import {
  appSettingsUpdatedEvent,
  readAppSettings,
  type AppSettings,
} from "@/data/appSettings";
import { useLocalMemories } from "@/hooks/useLocalMemories";

// Re-export sub-module components
export {
  WeatherPixelIcon,
  WeatherFrame,
  WeatherCard,
} from "@/components/home-progress/WeatherCard";

export {
  DateTimeCard,
  TogetherDaysCard,
  AlbumProgressCard,
  CoupleLogo,
  useProgress,
} from "@/components/home-progress/StatsCards";

// Also import directly for use in this file's components
import {
  DateTimeCard,
  TogetherDaysCard,
  AlbumProgressCard,
  CoupleLogo,
  useProgress,
} from "@/components/home-progress/StatsCards";
import { WeatherCard } from "@/components/home-progress/WeatherCard";

export function useAppSettings(): AppSettings {
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

export function ProgressBadge() {
  const progress = useProgress();

  return (
    <div className="ml-5 hidden items-center gap-2 rounded-[8px] border border-[#D8DDD8]/90 bg-[#FAFBF7]/70 px-4 py-2.5 text-sm text-[#5A6670]/76 shadow-[0_8px_24px_rgba(90,102,112,0.08)] backdrop-blur sm:flex">
      <Heart className="h-4 w-4 fill-[#F5DCE0] text-[#E8B8C2]" />
      <span>已点亮</span>
      <strong className="font-semibold text-[#E8B8C2]">{progress.provinceCount}</strong>
      <span>/ {TOTAL_PROVINCES} 省份</span>
    </div>
  );
}

export function LegendProgress() {
  const progress = useProgress();

  return (
    <div className="flex w-fit items-center gap-3 rounded-[8px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-5 py-3 text-sm text-[#5A6670]/80 shadow-[0_10px_28px_rgba(90,102,112,0.08)] backdrop-blur">
      <Heart className="h-4 w-4 fill-[#F5DCE0] text-[#E8B8C2]" />
      <span>
        <strong className="font-semibold text-[#5A6670]">{progress.provinceCount}</strong> /{" "}
        {TOTAL_PROVINCES} provinces explored
      </span>
    </div>
  );
}

export function StatsPanel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <aside className="hidden h-full w-[310px] shrink-0 flex-col overflow-y-auto border-l border-dashed border-[#D8DDD8] px-7 py-7 lg:flex">
      <DateTimeCard />
      <WeatherCard />
      {children}
      <TogetherDaysCard />
      <AlbumProgressCard />
      <CoupleLogo />
    </aside>
  );
}

export function ProvinceProgressBadge({
  provinceId,
  total,
}: Readonly<{
  provinceId: string;
  total: number;
}>) {
  const localMemories = useLocalMemories();

  const count = useMemo(() => {
    const litCityIds = getLitCityIds(localMemories);

    return cities.filter((city) => city.provinceId === provinceId && litCityIds.has(city.id))
      .length;
  }, [localMemories, provinceId]);

  return (
    <div className="hidden items-center gap-2 rounded-[8px] border border-[#D8DDD8]/90 bg-[#FAFBF7]/70 px-4 py-2.5 text-sm text-[#5A6670]/76 shadow-[0_8px_24px_rgba(90,102,112,0.08)] backdrop-blur sm:flex">
      <Heart className="h-4 w-4 fill-[#F5DCE0] text-[#E8B8C2]" />
      <strong className="font-semibold text-[#E8B8C2]">{count}</strong>
      <span>/ {total} cities</span>
    </div>
  );
}
