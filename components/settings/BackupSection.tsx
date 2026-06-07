import { type ChangeEvent, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import type { LocalMemoryStore } from "@/data/progress";
import { memoryStoreUpdatedEvent } from "@/data/progress";
import { readAppSettings, writeAppSettings } from "@/data/appSettings";
import { writeLoginPhoto, readLoginPhotos, readLoginPhotoTexts, writeLoginPhotoText } from "@/data/loginPhotoStore";
import { auxiliaryStorageKeys, readJsonArray, normalizeAppSettings } from "./shared";
import type { CityAssetStore } from "./shared";

type BackupSectionProps = {
  isAdmin: boolean;
  isWorking: boolean;
  setIsWorking: (v: boolean) => void;
  status: string;
  setStatus: (v: string) => void;
  setMemoryCount: (v: number | ((prev: number) => number)) => void;
  setAppSettings: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  setLoginPhotos: (v: Record<string, string>) => void;
  loadMemoryCount: () => Promise<Record<string, unknown>>;
  importInputRef: React.RefObject<HTMLInputElement | null>;
};

export function BackupSection({
  isAdmin,
  isWorking,
  setIsWorking,
  setStatus,
  setMemoryCount,
  setAppSettings,
  setLoginPhotos,
  loadMemoryCount,
  importInputRef,
}: BackupSectionProps) {
  const exportLocalData = async () => {
    if (!isAdmin) {
      setStatus("请先进入管理员模式");
      return;
    }

    setIsWorking(true);
    setStatus("");

    const memories = await loadMemoryCount();
    const assetResponse = await fetch("/api/city-assets", { cache: "no-store" }).catch(() => null);
    const assetData = (await assetResponse?.json().catch(() => null)) as { assets?: CityAssetStore } | null;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      memories,
      cityAssets: assetData?.assets ?? {},
      auxiliary: Object.fromEntries(auxiliaryStorageKeys.map((key) => [key, readJsonArray(key)])),
      settings: {
        ...readAppSettings(),
        loginPhotos: await readLoginPhotos(),
        loginPhotoTexts: await readLoginPhotoTexts(),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.href = url;
    link.download = `map-of-us-backup-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("已导出完整备份");
    setIsWorking(false);
  };

  const importLocalData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!isAdmin) {
      setStatus("请先进入管理员模式");
      if (importInputRef.current) importInputRef.current.value = "";
      return;
    }
    if (!file || isWorking) return;

    setIsWorking(true);
    setStatus("");

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Invalid backup");
      }

      const payload = parsed as {
        memories?: unknown;
        cityAssets?: unknown;
        auxiliary?: Record<string, unknown>;
        settings?: unknown;
      };
      const [memoryResponse, assetResponse] = await Promise.all([
        fetch("/api/memories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memories: payload.memories ?? {} }),
        }),
        fetch("/api/city-assets", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assets: payload.cityAssets ?? {} }),
        }),
      ]);

      if (!memoryResponse.ok || !assetResponse.ok) throw new Error("Import failed");

      const data = (await memoryResponse.json()) as { memories: LocalMemoryStore };
      auxiliaryStorageKeys.forEach((key) => {
        const value = payload.auxiliary?.[key];
        if (Array.isArray(value)) window.localStorage.setItem(key, JSON.stringify(value));
      });
      if (payload.settings) {
        const nextSettings = normalizeAppSettings(payload.settings);
        await Promise.all(
          Object.entries(nextSettings.loginPhotos ?? {}).map(([slotId, image]) => writeLoginPhoto(slotId, image as string)),
        );
        await Promise.all(
          Object.entries(nextSettings.loginPhotoTexts ?? {}).map(([slotId, text]) => writeLoginPhotoText(slotId, text as import("@/data/loginPhotoSlots").LoginPhotoText)),
        );
        const settingsWithoutPhotos = { ...nextSettings, loginPhotos: undefined };
        writeAppSettings(settingsWithoutPhotos as import("@/data/appSettings").AppSettings);
        setAppSettings(settingsWithoutPhotos as Record<string, unknown>);
        setLoginPhotos(await readLoginPhotos());
      }
      window.dispatchEvent(new CustomEvent(memoryStoreUpdatedEvent, { detail: data.memories }));
      setMemoryCount(Object.values(data.memories).flat().length);
      setStatus("导入完成，地图和回忆记录已刷新");
    } catch {
      setStatus("导入失败，请确认选择的是 Map of Us 备份文件");
    } finally {
      setIsWorking(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)]">
        <p className="text-sm font-semibold text-[#5A6670]">完整备份</p>
        <p className="mt-2 text-sm leading-6 text-[#5A6670]/62">
          导出城市回忆、城市地标图、地点收藏、纪念日和时光宝盒。换电脑前先备份一下。
        </p>
        <button
          className="mt-4 flex items-center gap-2 rounded-[7px] border border-[#A8C8DC] px-4 py-2 text-sm font-semibold text-[#A8C8DC] transition hover:bg-[#D6E8F0]/36"
          type="button"
          onClick={exportLocalData}
          disabled={isWorking || !isAdmin}
        >
          <Download className="h-4 w-4" />
          导出备份
        </button>
      </div>
      <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)]">
        <p className="text-sm font-semibold text-[#5A6670]">导入恢复</p>
        <p className="mt-2 text-sm leading-6 text-[#5A6670]/62">
          选择之前导出的备份文件，会覆盖当前城市回忆，并恢复辅助页面数据。
        </p>
        <input
          ref={importInputRef}
          className="hidden"
          type="file"
          accept="application/json,.json"
          onChange={importLocalData}
          disabled={!isAdmin}
        />
        <button
          className="mt-4 flex items-center gap-2 rounded-[7px] border border-[#E8B8C2] px-4 py-2 text-sm font-semibold text-[#E8B8C2] transition hover:bg-[#F5DCE0]/42 disabled:opacity-45"
          type="button"
          onClick={() => importInputRef.current?.click()}
          disabled={isWorking || !isAdmin}
        >
          <Upload className="h-4 w-4" />
          导入备份
        </button>
      </div>
    </>
  );
}
