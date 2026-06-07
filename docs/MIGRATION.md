# 迁移指南

本文档帮助你从旧版本升级到当前版本。

## 版本变更摘要

当前版本（v0.1.x）相比早期版本的主要变更：

- **认证系统**: 从环境变量密码改为 HMAC-SHA256 Cookie 签名
- **数据存储**: 从纯客户端 localStorage/IndexedDB 迁移到服务端 API + JSON 文件/Supabase
- **登录页照片**: 从 IndexedDB 迁移到服务端 API 存储
- **应用设置**: 部分设置从 localStorage 迁移到服务端 API
- **CSS**: 从 810 行重构为 30 行 + 组件内联样式
- **GeoJSON**: 服务端计算，客户端不再加载 `china-geo.json`

## 桌面版升级步骤

### 从 v0.0.x 升级

1. **备份数据**（重要）

   升级前，在旧版本的设置页导出完整备份文件。

   备份文件会保存回忆、城市地标、登录照片、纪念日等所有数据。

2. **安装新版本**

   直接安装新版本安装包，覆盖旧版本。用户数据目录不受影响：

   - macOS: `~/Library/Application Support/Map of Us/data/`
   - Windows: `%APPDATA%/Map of Us/data/`

3. **首次启动**

   新版本首次启动会：

   - 自动创建 `auth.local.json`（如果不存在），默认密码为 `1234` / `admin1234`
   - 自动迁移登录页照片数据（从 IndexedDB 到服务端 API）
   - 读取已有的 `localMemories.private.json` 数据

4. **验证数据**

   启动后检查：
   - 地图上的已去省份是否正确点亮
   - 各城市的回忆是否完整
   - 登录页照片是否显示

5. **修改密码**

   进入设置页，用管理员密码 `admin1234` 开启管理员模式，然后修改进入密码和管理员密码。

### 从 v0.1.0 升级到 v0.1.1+

数据格式无变更，直接安装新版即可。`auth.local.json` 和数据文件保持兼容。

## Web 部署升级

### Supabase Schema 迁移

如果已有 Supabase 实例，按以下步骤迁移：

1. **备份 Supabase 数据**

   ```bash
   # 通过 Supabase Dashboard 导出，或使用 pg_dump
   ```

2. **运行新 Schema**

   在 Supabase SQL Editor 中运行 `docs/supabase-schema.sql`。

   该脚本使用 `CREATE TABLE IF NOT EXISTS` 和 `ON CONFLICT DO UPDATE`，安全可重入，不会覆盖已有数据。

3. **新增的 `memories` 表**

   当前 API 仍使用 `map_of_us_store` 键值表存储回忆数据。`memories` 规范化表已创建并建立索引，但尚未被 API 使用。未来版本可能迁移到此表以获得更好的查询性能。

   如果你想手动同步数据到 `memories` 表，可以运行：

   ```sql
   -- 从 map_of_us_store 提取回忆数据插入 memories 表
   INSERT INTO public.memories (id, city_id, city, city_en, date, image, photos, text, created_at)
   SELECT
     m->>'id',
     m->>'cityId',
     m->>'city',
     m->>'cityEn',
     m->>'date',
     m->>'image',
     COALESCE(m->'photos', '[]'::jsonb),
     m->>'text',
     COALESCE((m->>'createdAt')::timestamptz, now())
   FROM public.map_of_us_store s,
        jsonb_array_elements(s.value) m
   WHERE s.key = 'memories'
   ON CONFLICT (id) DO NOTHING;
   ```

4. **更新环境变量**

   确保 `.env.local` 包含所有必需变量（参见 README.md 的环境变量说明）。

## 数据格式兼容性

### 回忆数据格式

回忆数据格式保持向后兼容。API 在读取时自动执行 normalize：

- 缺少 `city` / `cityEn` 字段的旧数据会从 `cities.ts` 自动补充
- `image` 为空时自动使用 `photos[0]` 或城市精灵图
- 日期格式 `YYYY.M.D` 自动规范化为 `YYYY.MM.DD`

### 登录页照片迁移

旧版本登录页照片存储在浏览器 IndexedDB（`mapofus-media` 数据库）中。新版首次访问设置页时，`data/loginPhotoStore.ts` 会自动：

1. 读取 IndexedDB 中的照片
2. 上传到服务端 API (`/api/login-photos`)
3. 同步 localStorage 中的文案数据
4. 删除旧的 IndexedDB 数据库
5. 在 localStorage 中标记迁移完成

此迁移是幂等的，中断后下次访问会重试。

### 应用设置迁移

部分设置仍保留在 localStorage（纪念日、天气城市、Logo），登录页照片和文案已迁移到服务端 API。无需手动操作。

## 回滚方案

### 桌面版回滚

1. 卸载新版本
2. 安装旧版本
3. 如果新版本创建了 `auth.local.json`，删除它（旧版本不需要）
4. 使用升级前导出的备份文件恢复数据

数据文件路径不变，旧版本可以直接读取 `localMemories.private.json`。

### Web 部署回滚

1. 恢复旧版代码部署
2. Supabase 数据无需回滚 -- `map_of_us_store` 表的 schema 未变更
3. 新增的 `memories` 表可以保留或删除：

   ```sql
   DROP TABLE IF EXISTS public.memories;
   ```

## 常见问题

### 升级后地图上省份不亮

检查 `data/localMemories.private.json` 是否存在且内容完整。如果文件丢失，使用设置页的「导入备份」恢复。

### 升级后登录页照片消失

新版登录页照片存储在服务端。首次启动时 IndexedDB 迁移会自动执行。如果迁移失败：

1. 打开设置页，手动重新上传照片
2. 或者导入升级前的备份文件

### 桌面版密码重置

如果忘记密码，删除 `auth.local.json` 文件后重启应用，密码会重置为默认值：

- macOS: `~/Library/Application Support/Map of Us/auth.local.json`
- Windows: `%APPDATA%/Map of Us/auth.local.json`

### Supabase 环境切换

从 Web 模式切换到纯本地模式：设置 `MAP_OF_US_STORAGE_MODE=local`，API 将忽略 Supabase 配置并使用本地文件。
