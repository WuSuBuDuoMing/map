"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  Heart,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { cities } from "@/data/cities";
import { MemoryPageShell, type MemoryNavKey } from "@/components/MemoryNav";
import { useAdminMode } from "@/hooks/useAdminMode";

// Re-export from new location
export { SettingsPage } from "@/components/settings/SettingsPage";

type StoredItem = {
  id: string;
  title: string;
  date?: string;
  note: string;
  cityId?: string;
};

type ToolConfig = {
  active: MemoryNavKey;
  icon: typeof Heart;
  title: string;
  subtitle: string;
  storageKey: string;
  kind: "favorite" | "anniversary" | "capsule";
};

const configs = {
  favorite: {
    active: "favorites",
    icon: Heart,
    title: "地点收藏",
    subtitle: "先收好想一起去的地方，不点亮地图。",
    storageKey: "mapofus:favorites",
    kind: "favorite",
  },
  anniversary: {
    active: "anniversaries",
    icon: CalendarDays,
    title: "纪念日",
    subtitle: "把重要的日子放在这里，慢慢倒数。",
    storageKey: "mapofus:anniversaries",
    kind: "anniversary",
  },
  capsule: {
    active: "capsule",
    icon: Archive,
    title: "时光宝盒",
    subtitle: "存放不一定属于某座城市的小秘密。",
    storageKey: "mapofus:capsules",
    kind: "capsule",
  },
} satisfies Record<string, ToolConfig>;

const readItems = (key: string): StoredItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;

    return Array.isArray(parsed) ? parsed.filter((item): item is StoredItem => typeof item === "object" && item !== null && "id" in item) : [];
  } catch {
    return [];
  }
};

const writeItems = (key: string, items: StoredItem[]) => {
  window.localStorage.setItem(key, JSON.stringify(items));
};

const daysUntil = (value?: string) => {
  if (!value || !/^\d{4}\.\d{2}\.\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split(".").map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
};

function MemoryToolPage({ config }: Readonly<{ config: ToolConfig }>) {
  const Icon = config.icon;
  const isAdmin = useAdminMode();
  const [items, setItems] = useState<StoredItem[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [cityId, setCityId] = useState(cities[0]?.id ?? "");
  const [editingId, setEditingId] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setItems(readItems(config.storageKey));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [config.storageKey]);

  const cityOptions = useMemo(() => cities.slice().sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN")), []);
  const canSave = title.trim().length > 0;

  const resetForm = () => {
    setTitle("");
    setDate("");
    setNote("");
    setEditingId("");
  };

  const save = () => {
    if (!isAdmin) return;
    if (!canSave) return;

    const item = {
      id: editingId || `${config.kind}-${Date.now()}`,
      title: title.trim(),
      date: date.trim(),
      note: note.trim(),
      cityId: config.kind === "favorite" ? cityId : undefined,
    };
    const nextItems = editingId
      ? items.map((current) => (current.id === editingId ? item : current))
      : [item, ...items];

    setItems(nextItems);
    writeItems(config.storageKey, nextItems);
    resetForm();
  };

  const startEdit = (item: StoredItem) => {
    if (!isAdmin) return;
    setEditingId(item.id);
    setTitle(item.title);
    setDate(item.date ?? "");
    setNote(item.note);
    if (item.cityId) setCityId(item.cityId);
  };

  const remove = (id: string) => {
    if (!isAdmin) return;
    const nextItems = items.filter((item) => item.id !== id);
    setItems(nextItems);
    writeItems(config.storageKey, nextItems);
    if (editingId === id) resetForm();
  };

  return (
    <MemoryPageShell active={config.active}>
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <Icon className="h-8 w-8 fill-[#F5DCE0] text-[#E8B8C2]" />
            <h1 className="text-[34px] font-semibold leading-tight text-[#5A6670]">{config.title}</h1>
          </div>
          <p className="mt-2 text-sm font-medium text-[#5A6670]/58">{config.subtitle}</p>
        </div>
        <div className="rounded-[8px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/72 px-4 py-2 text-sm font-semibold text-[#5A6670]/62 shadow-[0_8px_24px_rgba(90,102,112,0.08)] backdrop-blur">
          {items.length} 条
        </div>
      </header>

      <section className="mt-10 grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="h-fit rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#5A6670]">{editingId ? "编辑" : "新增"}</p>
            {!isAdmin && <span className="text-xs font-semibold text-[#5A6670]/42">管理员锁定</span>}
          </div>
          <input
            className="mt-4 w-full rounded-[7px] border border-[#D8DDD8] bg-[#FAFBF7] px-3 py-2 text-sm outline-none transition focus:border-[#E8B8C2]"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={config.kind === "favorite" ? "想去的地方" : "标题"}
            disabled={!isAdmin}
          />
          {config.kind === "favorite" && (
            <select
              className="mt-3 w-full rounded-[7px] border border-[#D8DDD8] bg-[#FAFBF7] px-3 py-2 text-sm outline-none transition focus:border-[#E8B8C2]"
              value={cityId}
              onChange={(event) => setCityId(event.target.value)}
              disabled={!isAdmin}
              aria-label="选择城市"
            >
              {cityOptions.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          )}
          {config.kind !== "favorite" && (
            <input
              className="mt-3 w-full rounded-[7px] border border-[#D8DDD8] bg-[#FAFBF7] px-3 py-2 text-sm outline-none transition focus:border-[#E8B8C2]"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              placeholder="2026.05.20"
              maxLength={10}
              disabled={!isAdmin}
            />
          )}
          <textarea
            className="mt-3 w-full resize-none rounded-[7px] border border-[#D8DDD8] bg-[#FAFBF7] px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#E8B8C2]"
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="写一点备注……"
            disabled={!isAdmin}
          />
          <button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[7px] bg-[#F5DCE0] px-4 py-2.5 text-sm font-semibold text-[#E8B8C2] transition hover:bg-[#E8B8C2] hover:text-[#FAFBF7] disabled:opacity-45"
            type="button"
            onClick={save}
            disabled={!isAdmin || !canSave}
          >
            <Plus className="h-4 w-4" />
            {editingId ? "保存修改" : "保存"}
          </button>
          {editingId && (
            <button
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-[7px] px-4 py-2 text-sm font-semibold text-[#5A6670]/56 transition hover:bg-[#D8DDD8]/28 hover:text-[#5A6670]"
              type="button"
              onClick={resetForm}
            >
              取消编辑
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const city = cities.find((candidate) => candidate.id === item.cityId);
            const leftDays = daysUntil(item.date);

            return (
              <article
                key={item.id}
                className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)] backdrop-blur"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#5A6670]">{item.title}</h2>
                    {city && <p className="mt-1 text-sm text-[#A8C8DC]">{city.name}</p>}
                    {item.date && <p className="mt-1 text-sm text-[#5A6670]/54">{item.date}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="grid h-8 w-8 place-items-center rounded-[6px] text-[#5A6670]/42 transition hover:bg-[#D6E8F0]/34 hover:text-[#A8C8DC]"
                      type="button"
                      onClick={() => startEdit(item)}
                      aria-label="编辑"
                      disabled={!isAdmin}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="grid h-8 w-8 place-items-center rounded-[6px] text-[#5A6670]/42 transition hover:bg-[#F5DCE0]/45 hover:text-[#E8B8C2]"
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label="删除"
                      disabled={!isAdmin}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {leftDays !== null && (
                  <p className="mt-3 text-sm font-semibold text-[#E8B8C2]">
                    {leftDays >= 0 ? `还有 ${leftDays} 天` : `已经过去 ${Math.abs(leftDays)} 天`}
                  </p>
                )}
                {item.note && <p className="mt-3 text-sm leading-6 text-[#5A6670]/68">{item.note}</p>}
              </article>
            );
          })}
          {items.length === 0 && (
            <div className="rounded-[8px] border border-dashed border-[#D8DDD8] px-6 py-12 text-center text-sm text-[#5A6670]/54 md:col-span-2">
              这里还空着，先放下第一条吧。
            </div>
          )}
        </div>
      </section>
    </MemoryPageShell>
  );
}

export function FavoritesPage() {
  return <MemoryToolPage config={configs.favorite} />;
}

export function AnniversariesPage() {
  return <MemoryToolPage config={configs.anniversary} />;
}

export function TimeCapsulePage() {
  return <MemoryToolPage config={configs.capsule} />;
}
