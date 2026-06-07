import { type ChangeEvent } from "react";
import { Trash2, Upload } from "lucide-react";
import { LocalPrivacyImage } from "@/components/LocalPrivacyImage";
import type { LoginPhotoText } from "@/data/loginPhotoSlots";
import { loginPhotoSlots } from "@/data/loginPhotoSlots";
import { deleteLoginPhoto, deleteLoginPhotoText, readLoginPhotos, writeLoginPhoto, writeLoginPhotoText } from "@/data/loginPhotoStore";
import { imageFileToSettingImage } from "./shared";

type LoginPhotoSectionProps = {
  isAdmin: boolean;
  isWorking: boolean;
  setIsWorking: (v: boolean) => void;
  status: string;
  setStatus: (v: string) => void;
  loginPhotos: Record<string, string>;
  setLoginPhotos: (v: Record<string, string>) => void;
  appSettings: Record<string, unknown>;
  setAppSettings: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
};

export function LoginPhotoSection({
  isAdmin,
  isWorking,
  setIsWorking,
  setStatus,
  loginPhotos,
  setLoginPhotos,
  appSettings,
  setAppSettings,
}: LoginPhotoSectionProps) {
  const updateLoginPhoto = async (slotId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!isAdmin) {
      setStatus("请先进入管理员模式");
      event.target.value = "";
      return;
    }
    if (!file || isWorking) return;

    setIsWorking(true);
    setStatus("");

    try {
      const image = await imageFileToSettingImage(file);
      await writeLoginPhoto(slotId, image);
      setLoginPhotos(await readLoginPhotos());
      setStatus("登录照片已更新");
    } catch {
      setStatus("登录照片更新失败，请选择一张图片");
    } finally {
      setIsWorking(false);
      event.target.value = "";
    }
  };

  const resetLoginPhoto = (slotId: string) => {
    if (!isAdmin) {
      setStatus("请先进入管理员模式");
      return;
    }

    void deleteLoginPhoto(slotId)
      .then(async () => {
        setLoginPhotos(await readLoginPhotos());
        setStatus("登录照片已恢复默认");
      })
      .catch(() => setStatus("登录照片恢复失败，请稍后再试"));
  };

  const updateLoginPhotoText = (slotId: string, field: keyof LoginPhotoText, value: string) => {
    if (!isAdmin) {
      setStatus("请先进入管理员模式");
      return;
    }

    const settingsLoginPhotoTexts = (appSettings as { loginPhotoTexts?: Record<string, LoginPhotoText> }).loginPhotoTexts ?? {};
    const nextText = {
      ...(settingsLoginPhotoTexts[slotId] ?? {}),
      [field]: value,
    };
    const nextSettings = {
      ...appSettings,
      loginPhotoTexts: {
        ...settingsLoginPhotoTexts,
        [slotId]: nextText,
      },
    };

    setAppSettings(nextSettings);
    void writeLoginPhotoText(slotId, nextText)
      .then(() => setStatus("登录文字已更新"))
      .catch(() => setStatus("登录文字更新失败，请稍后再试"));
  };

  const resetLoginPhotoText = (slotId: string) => {
    if (!isAdmin) {
      setStatus("请先进入管理员模式");
      return;
    }

    const settingsLoginPhotoTexts = (appSettings as { loginPhotoTexts?: Record<string, LoginPhotoText> }).loginPhotoTexts ?? {};
    const nextTexts = { ...settingsLoginPhotoTexts };
    delete nextTexts[slotId];

    setAppSettings({ ...appSettings, loginPhotoTexts: nextTexts });
    void deleteLoginPhotoText(slotId)
      .then(() => setStatus("登录文字已恢复默认"))
      .catch(() => setStatus("登录文字更新失败，请稍后再试"));
  };

  return (
    <div className="rounded-[8px] border border-[#D8DDD8]/78 bg-[#FAFBF7]/76 p-5 shadow-[0_12px_28px_rgba(90,102,112,0.06)] md:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#5A6670]">登录照片</p>
          <p className="mt-2 text-sm leading-6 text-[#5A6670]/62">
            对应登录界面底部的 9 张照片。替换某一格后，大背景、相框和缩略图都会同步使用这一张。
          </p>
        </div>
        <p className="text-xs font-semibold text-[#5A6670]/42">
          已自定义 {Object.keys(loginPhotos).length} / {loginPhotoSlots.length}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loginPhotoSlots.map((slot) => {
          const customPhoto = loginPhotos[slot.id];
          const settingsLoginPhotoTexts = (appSettings as { loginPhotoTexts?: Record<string, LoginPhotoText> }).loginPhotoTexts ?? {};
          const customText = settingsLoginPhotoTexts[slot.id];
          const src = customPhoto ?? slot.fallback;
          const titleValue = customText?.city ?? slot.city;
          const labelValue = customText?.label ?? slot.label;

          return (
            <div
              className="rounded-[8px] border border-[#D8DDD8]/70 bg-white/34 p-3"
              key={slot.id}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[7px] bg-[#D6E8F0]/24">
                <LocalPrivacyImage
                  className="h-full w-full object-cover"
                  src={src}
                  alt={`${slot.city} 登录照片预览`}
                  fill
                  sizes="(max-width: 768px) 50vw, 260px"
                />
              </div>
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[#5A6670]/48">标题</span>
                  <input
                    className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm font-semibold text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                    value={titleValue}
                    onChange={(event) => updateLoginPhotoText(slot.id, "city", event.target.value)}
                    disabled={!isAdmin}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[#5A6670]/48">副标题</span>
                  <input
                    className="min-h-10 rounded-[7px] border border-[#D8DDD8]/80 bg-[#FAFBF7]/70 px-3 text-sm text-[#5A6670] outline-none transition focus:border-[#A8C8DC] focus:bg-white"
                    value={labelValue}
                    onChange={(event) => updateLoginPhotoText(slot.id, "label", event.target.value)}
                    disabled={!isAdmin}
                  />
                </label>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-[#5A6670]/44">
                  {customPhoto || customText ? "已自定义" : "默认内容"}
                </p>
                <div className="flex shrink-0 gap-2">
                  <label
                    className={`grid h-9 w-9 place-items-center rounded-[7px] border border-[#A8C8DC] text-[#A8C8DC] transition hover:bg-[#D6E8F0]/36 ${
                      isWorking || !isAdmin ? "pointer-events-none opacity-45" : ""
                    }`}
                    title={`更换${slot.city}登录照片`}
                  >
                    <Upload className="h-4 w-4" />
                    <input
                      className="hidden"
                      type="file"
                      accept="image/*"
                      onChange={(event) => updateLoginPhoto(slot.id, event)}
                      disabled={isWorking || !isAdmin}
                    />
                  </label>
                  <button
                    className="grid h-9 w-9 place-items-center rounded-[7px] border border-[#D8DDD8] text-[#5A6670]/58 transition hover:bg-white/68 disabled:opacity-35"
                    type="button"
                    onClick={() => resetLoginPhoto(slot.id)}
                    disabled={isWorking || !isAdmin || !customPhoto}
                    title={`恢复${slot.city}默认照片`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-[7px] border border-[#D8DDD8] px-3 text-xs font-semibold text-[#5A6670]/58 transition hover:bg-white/68 disabled:opacity-35"
                    type="button"
                    onClick={() => resetLoginPhotoText(slot.id)}
                    disabled={isWorking || !isAdmin || !customText}
                  >
                    文字
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
