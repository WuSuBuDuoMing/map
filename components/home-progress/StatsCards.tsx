"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Heart, Images } from "lucide-react";
import { LocalPrivacyImage } from "@/components/LocalPrivacyImage";
import { cities } from "@/data/cities";
import {
  getLitCityIds,
  getLitProvinceIds,
} from "@/data/progress";
import { TOTAL_PROVINCES } from "@/data/provinces";
import {
  appSettingsUpdatedEvent,
  defaultAnniversaryDate,
  defaultAnniversaryLabel,
  defaultCoupleLogo,
  readAppSettings,
  type AppSettings,
} from "@/data/appSettings";
import { useLocalMemories } from "@/hooks/useLocalMemories";

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

export function useProgress() {
  const localMemories = useLocalMemories();

  return useMemo(() => {
    const litCityIds = getLitCityIds(localMemories);
    const litProvinceIds = getLitProvinceIds(litCityIds);

    return {
      cityCount: litCityIds.size,
      provinceCount: litProvinceIds.size,
    };
  }, [localMemories]);
}

const daysTogether = (date?: string) => {
  if (!date || !/^\d{4}\.\d{2}\.\d{2}$/.test(date)) return null;

  const [year, month, day] = date.split(".").map(Number);
  const start = new Date(year, month - 1, day);
  const today = new Date();

  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86_400_000));
};

const formatClock = (value: Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
  }).format(value);

const formatWeekday = (value: Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    weekday: "long",
  }).format(value);

export function DateTimeCard() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const firstTick = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 30_000);

    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="mb-4 rounded-[8px] border border-[#D8DDD8]/70 bg-[#FAFBF7]/62 px-4 py-3 text-[#5A6670] shadow-[0_10px_24px_rgba(90,102,112,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold leading-none text-[#5A6670]/54">今天</p>
          <p className="mt-1 text-2xl font-semibold leading-none text-[#A8C8DC]">
            {now ? formatClock(now) : "--:--"}
          </p>
        </div>
        <div className="text-right">
          <CalendarDays className="ml-auto h-4 w-4 text-[#E8B8C2]" />
          <p className="mt-2 text-xs font-semibold text-[#5A6670]/64">
            {now ? `${formatDate(now)} ${formatWeekday(now)}` : "加载中"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TogetherDaysCard() {
  const settings = useAppSettings();
  const startDate = settings.anniversaryDate ?? defaultAnniversaryDate;
  const label = settings.anniversaryLabel ?? defaultAnniversaryLabel;
  const days = daysTogether(startDate);

  return (
    <div className="mt-3 rounded-[8px] border border-[#D8DDD8]/70 bg-[#FAFBF7]/62 px-4 py-3 text-[#5A6670] shadow-[0_10px_24px_rgba(90,102,112,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#5A6670]/58">纪念日</p>
          <p className="mt-1 text-sm font-semibold text-[#5A6670]">{label}</p>
        </div>
        <div className="flex items-end gap-1.5">
          <span className="text-2xl font-semibold leading-none text-[#E8B8C2]">{days}</span>
          <span className="pb-0.5 text-sm font-semibold text-[#5A6670]/56">天</span>
        </div>
      </div>
      <p className="mt-1 truncate text-xs text-[#5A6670]/45">从 {startDate} 开始</p>
    </div>
  );
}

export function AlbumProgressCard() {
  const progress = useProgress();
  const provincePercent = Math.round((progress.provinceCount / TOTAL_PROVINCES) * 100);
  const cityPercent = Math.round((progress.cityCount / cities.length) * 100);

  return (
    <Link
      className="group mt-3 block rounded-[8px] border border-[#D8DDD8]/70 bg-[#FAFBF7]/62 px-4 py-3 text-[#5A6670] shadow-[0_10px_24px_rgba(90,102,112,0.05)] transition hover:-translate-y-0.5 hover:border-[#F5DCE0] hover:bg-white/72"
      href="/memories"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-[#F5DCE0]/80 bg-[#F5DCE0]/42 text-[#E8B8C2] transition group-hover:bg-[#F5DCE0]/68">
            <Images className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">回忆相册</span>
            <span className="mt-0.5 block truncate text-xs text-[#5A6670]/48">看全部照片</span>
          </span>
        </span>
        <span className="text-lg leading-none text-[#5A6670]/34 transition group-hover:translate-x-0.5 group-hover:text-[#E8B8C2]">
          →
        </span>
      </div>

      <div className="mt-4 border-t border-[#D8DDD8]/54 pt-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#5A6670]">我们的进度</p>
            <p className="mt-0.5 text-xs text-[#5A6670]/52">Map of Us</p>
          </div>
          <Heart className="h-5 w-5 fill-[#F5DCE0] text-[#E8B8C2]" />
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-end justify-between gap-3">
              <div className="text-sm text-[#5A6670]/68">已点亮省份</div>
              <div className="text-sm font-semibold text-[#5A6670]">
                <span className="text-xl text-[#E8B8C2]">{progress.provinceCount}</span>
                <span className="ml-1 text-[#5A6670]/46">/ {TOTAL_PROVINCES}</span>
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#D8DDD8]/48">
              <div
                className="h-full rounded-full bg-[#E8B8C2] shadow-[0_0_12px_rgba(232,184,194,0.45)]"
                style={{ width: `${provincePercent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3">
              <div className="text-sm text-[#5A6670]/68">已留下回忆城市</div>
              <div className="text-sm font-semibold text-[#5A6670]">
                <span className="text-xl text-[#A8C8DC]">{progress.cityCount}</span>
                <span className="ml-1 text-[#5A6670]/46">/ {cities.length}</span>
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#D8DDD8]/48">
              <div
                className="h-full rounded-full bg-[#A8C8DC] shadow-[0_0_12px_rgba(168,200,220,0.45)]"
                style={{ width: `${cityPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function CoupleLogo() {
  const [activeHead, setActiveHead] = useState<"left" | "right" | null>(null);
  const settings = useAppSettings();
  const logoSrc = settings.coupleLogo ?? defaultCoupleLogo;

  const popHead = (side: "left" | "right") => {
    setActiveHead(side);
    window.setTimeout(() => setActiveHead(null), 260);
  };

  return (
    <div className="mt-auto flex justify-center">
      <div className="relative aspect-[1106/849] w-52">
        <LocalPrivacyImage
          src={logoSrc}
          alt="我们的拼图头像 logo"
          fill
          sizes="208px"
          className={`object-contain transition-transform duration-300 ease-out ${
            activeHead === "left"
              ? "scale-[1.08] origin-[33%_47%]"
              : activeHead === "right"
                ? "scale-[1.08] origin-[69%_45%]"
                : "scale-100"
          }`}
        />
        <button
          className="absolute left-[15%] top-[23%] h-[42%] w-[31%] rounded-full outline-none transition hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-[#A8C8DC]/70 active:scale-[1.08]"
          type="button"
          aria-label="放大左边头像"
          onClick={() => popHead("left")}
        />
        <button
          className="absolute right-[11%] top-[21%] h-[45%] w-[34%] rounded-full outline-none transition hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-[#E8B8C2]/70 active:scale-[1.08]"
          type="button"
          aria-label="放大右边头像"
          onClick={() => popHead("right")}
        />
      </div>
    </div>
  );
}
