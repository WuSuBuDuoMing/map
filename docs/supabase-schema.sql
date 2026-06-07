-- Map of Us - Supabase Schema
-- 在 Supabase SQL Editor 中运行此脚本来初始化数据库。
-- 适用于 Web 部署模式（需要 Supabase 的场景）。
-- 桌面版使用本地 JSON 文件，不需要运行此脚本。

-- ============================================================
-- 1. 键值存储表（通用 JSON 存储）
-- ============================================================
-- 存储回忆、城市地标、登录页照片等所有 JSON 数据。
-- 每条记录是一个 key-value 对，value 为 JSONB 类型。

CREATE TABLE IF NOT EXISTS public.map_of_us_store (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.map_of_us_store IS 'Map of Us 通用 JSON 键值存储';
COMMENT ON COLUMN public.map_of_us_store.key IS '存储键名，如 memories、city-assets、login-photos';
COMMENT ON COLUMN public.map_of_us_store.value IS 'JSON 数据，结构取决于 key';

-- 当前版本不启用行级安全（单租户应用，认证在应用层完成）
ALTER TABLE public.map_of_us_store DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. memories 表（独立回忆记录，可选的规范化存储）
-- ============================================================
-- 作为 map_of_us_store 中 memories 键的补充/替代方案，
-- 提供行级查询能力。当前 API 仍使用 map_of_us_store，
-- 此表为未来扩展预留。

CREATE TABLE IF NOT EXISTS public.memories (
  id          TEXT PRIMARY KEY,
  city_id     TEXT NOT NULL,
  city        TEXT NOT NULL,
  city_en     TEXT NOT NULL,
  date        TEXT NOT NULL,
  image       TEXT NOT NULL DEFAULT '',
  photos      JSONB NOT NULL DEFAULT '[]'::jsonb,
  text        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.memories IS 'Map of Us 回忆记录';
COMMENT ON COLUMN public.memories.id IS '回忆唯一 ID，格式: {cityId}-{timestamp}';
COMMENT ON COLUMN public.memories.city_id IS '城市 ID，对应 cities.ts 中的定义';
COMMENT ON COLUMN public.memories.date IS '回忆日期，格式: YYYY.MM.DD';
COMMENT ON COLUMN public.memories.photos IS '照片 URL 数组，JSONB 数组类型';

-- 索引：按城市查询（省份详情页）
CREATE INDEX IF NOT EXISTS idx_memories_city_id
  ON public.memories (city_id);

-- 索引：按日期倒序（时间线展示）
CREATE INDEX IF NOT EXISTS idx_memories_date_desc
  ON public.memories (date DESC);

-- 索引：按创建时间倒序（最近回忆）
CREATE INDEX IF NOT EXISTS idx_memories_created_at_desc
  ON public.memories (created_at DESC);

-- 当前版本不启用行级安全
ALTER TABLE public.memories DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Supabase Storage Bucket（图片存储）
-- ============================================================
-- 用于存储回忆照片、城市地标图、登录页照片等图片资源。
-- 当客户端上传 data:image/ base64 图片时，服务端会自动
-- 上传到此 bucket 并替换为公共 URL。

INSERT INTO storage.buckets (id, name, public)
VALUES ('map-of-us', 'map-of-us', true)
ON CONFLICT (id) DO UPDATE SET public = excluded.public;

-- Storage 访问策略：允许公开读取
CREATE POLICY "Map of Us public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'map-of-us');

-- ============================================================
-- 4. 存储键名约定
-- ============================================================
-- map_of_us_store 表中的 key 列使用以下固定值：
--
--   'memories'       -> value 为 { [cityId]: Memory[] }
--   'city-assets'    -> value 为 { [cityId]: imageUrl }
--   'login-photos'   -> value 为 { photos: {...}, texts: {...} }
--
-- Storage bucket 中的路径约定：
--
--   memories/{cityId}/{memoryId}/photo-{n}.{ext}
--   city-assets/{cityId}/landmark.{ext}
--   login-photos/{slotId}/cover.{ext}
