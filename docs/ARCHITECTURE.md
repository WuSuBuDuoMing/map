# 架构文档

本文档描述 Map of Us 的系统架构、数据流和关键设计决策。

## 系统架构总览

Map of Us 支持两种运行模式：**Web 模式** 和 **Electron 桌面模式**。两种模式共享同一套 Next.js 代码，差异在于存储层和认证配置。

### Web 模式

```text
浏览器
  |
  v
Next.js Server (Node.js)
  |
  +-> App Router (RSC) -> React 组件渲染
  +-> API Routes       -> 认证 + 存储
                           |
                           v
                       Supabase
                       +-- PostgreSQL (map_of_us_store)
                       +-- Storage (图片)
```

### Electron 桌面模式

```text
Electron Shell (main.js)
  |
  +-> BrowserWindow
  |     |
  |     v
  |   Next.js Server (standalone, in-process)
  |     |
  |     +-> App Router (RSC)
  |     +-> API Routes -> 本地 JSON 文件
  |
  +-> auth.local.json (密码 + Cookie Secret)
  +-> userData/data/  (回忆、地标、照片)
```

桌面模式下，Next.js standalone server 直接在 Electron 主进程中运行（不是子进程），避免 macOS 出现两个 Dock 图标。

## 数据流

### 回忆读取流程

```text
客户端 GET /api/memories
  |
  v
requireSiteSession(request)
  |-- 检查 Cookie 中的 HMAC 签名
  |-- 签名无效 -> 401
  |-- 签名有效 -> 继续
  |
  v
readMemoryStore()
  |-- isSupabaseConfigured?
  |     yes -> readJsonValue('memories') -> Supabase 查询
  |     no  -> readFile(memoryStorePath) -> 本地 JSON 文件
  |            如果文件不存在 -> 读取 seedMemoryStorePath (只读种子数据)
  |
  v
normalizeMemoryStore()
  |-- 校验每条回忆的字段
  |-- 补充缺失的 city/cityEn/image
  |
  v
返回 { memories: { [cityId]: Memory[] } }
```

### 回忆写入流程

```text
客户端 POST /api/memories
  |
  v
requireAdminSession(request)  -- 需要管理员权限
  |
  v
assertWritableStorageConfigured()
  |-- 生产模式 + 未配置 Supabase -> 503
  |
  v
parseMemoryPayload(body)
  |-- 校验 cityId, date, text, image
  |-- 日期规范化: 2025.1.3 -> 2025.01.03
  |-- 文本长度限制: 80 字符
  |-- 图片格式白名单
  |
  v
uploadMemoryImages(memory)
  |-- data:image/ base64 -> Supabase Storage 上传 -> 替换为公共 URL
  |-- 非 base64 图片 -> 保持原样
  |
  v
readMemoryStore() + 合并新回忆 -> writeMemoryStore()
```

## 存储层架构

### 双模式存储

存储层根据环境变量自动选择后端：

```text
                    +-------------------+
                    |   API Route       |
                    +--------+----------+
                             |
                    +--------v----------+
                    | Storage 模式判断   |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
   MAP_OF_US_STORAGE_MODE=local       Supabase 已配置
              |                             |
   +----------v----------+    +------------v------------+
   |  本地 JSON 文件      |    |  Supabase PostgreSQL    |
   |  fs.readFile/write   |    |  + Storage              |
   +---------------------+    +-------------------------+
```

### 本地文件存储

所有本地存储使用相同的模式：

- **文件路径**: 由 `lib/server/dataDir.ts` 的 `getPrivateDataFilePath()` 决定
- **读取**: `fs.readFile` -> `JSON.parse` -> normalize -> 返回
- **写入**: `fs.mkdir` (recursive) -> `fs.writeFile` (覆盖写入)
- **种子数据**: 首次启动如果 `*.private.json` 不存在，从 `*.json` 种子文件读取

数据文件清单：

```text
localMemories.private.json   -> { [cityId]: Memory[] }
cityAssets.private.json      -> { [cityId]: imageUrl }
loginPhotos.private.json     -> { photos: {...}, texts: {...} }
```

### Supabase 存储

- **KV 表**: `map_of_us_store`，所有 JSON 数据以 key-value 形式存储
- **Storage Bucket**: `map-of-us`，存储图片资源
- **图片上传**: base64 data URL -> Buffer -> Supabase Storage upload -> 公共 URL

## 认证架构

### 认证模型

```text
角色:
  site  -> 可以查看地图和回忆
  admin -> 可以创建、编辑、删除回忆和修改设置
```

### Cookie 签名机制

```text
Token = base64url({ role, exp }) + '.' + HMAC-SHA256(secret, payload)

Cookie 名称:
  mapofus_session  -> site 角色，有效期 30 天
  mapofus_admin    -> admin 角色，有效期 8 小时

Cookie 属性:
  httpOnly: true
  sameSite: lax
  secure: true (生产模式 + 非桌面环境)
  path: /
```

### 密码验证

使用 `crypto.timingSafeEqual` 进行时间安全的密码比较，防止时序攻击。

### 桌面版认证配置

```text
首次启动 -> electron/main.js -> readOrCreateAuthConfig()
  |
  +-> 检查 userData/auth.local.json 是否存在
  |     存在 -> 读取
  |     不存在 -> 创建默认配置:
  |       sitePassword: "1234"
  |       adminPassword: "admin1234"
  |       cookieSecret: crypto.randomBytes(32).toString("base64url")
  |
  +-> 设置进程环境变量 -> Next.js server 使用
```

密码修改时，`/api/auth/password` 同时更新 `process.env` 和 `auth.local.json` 文件，确保当前会话和重启后都生效。

### 速率限制

Next.js 16 proxy/middleware 层实现速率限制，防止暴力破解。

## 组件层级

### 页面路由

```text
app/
  page.tsx                  -> EntryExperience (入口引导页)
  map/page.tsx              -> ChinaMap (主地图)
  province/[id]/page.tsx    -> ProvinceMap (省份详情)
  settings/page.tsx         -> MemoryTools (设置)
  memories/page.tsx         -> MemoryArchive (回忆归档)
  anniversaries/page.tsx    -> 纪念日
  favorites/page.tsx        -> 收藏
  time-capsule/page.tsx     -> 时光宝盒
  demo/page.tsx             -> DemoExperience (演示)
```

### 组件职责

- **ChinaMap** -- 中国地图 SVG 渲染，省份点亮/未点亮，缩放平移，南海诸岛插图
- **ProvinceMap** -- 省份详情地图，城市标记，回忆卡片，照片查看器，添加/编辑/删除回忆
- **MemoryTools** -- 设置页全功能：密码修改、纪念日、天气城市、Logo、登录照片、备份导入导出
- **MemoryNav** -- 顶部导航栏壳，提供页面布局和导航
- **EntryExperience** -- 入口引导页，展示地图预览和天气
- **LocalPrivacyImage** -- 隐私模式下的图像占位组件

### 组件间通信

组件间不直接通信，通过以下机制同步状态：

- **CustomEvent**: `mapofus:memories-updated`、`mapofus:admin-mode-updated`、`mapofus:settings-updated`、`mapofus:login-photos-updated`
- **API 路由**: 所有数据变更通过 REST API，组件通过 fetch 获取最新数据
- **URL 路由**: 页面间通过 Next.js router 导航

## 共享模块依赖关系

```text
data/provinces.ts  <--------+
data/cities.ts     <-----+  |
                          |  |
data/memories.ts          |  |
  (Memory 类型)           |  |
       |                  |  |
       v                  |  |
data/progress.ts  --------+--+
  (已去城市/省份)         |
       |                  |
       v                  |
data/provinceCityPlaces.ts-+
  (省份城市索引)          |
                          |
data/appSettings.ts       |
  (应用设置)              |
                          |
data/adminMode.ts         |
  (管理员模式)            |
                          |
data/loginPhotoStore.ts   |
  (登录页照片)            |
                          |
lib/geo.ts  <-------------+
  (D3 投影)               |
       |                  |
       v                  |
components/ChinaMap.tsx
components/ProvinceMap.tsx

lib/server/auth.ts  <----- 独立模块，被所有 API Route 使用
lib/server/supabase.ts <--- 独立模块，被所有 API Route 使用
lib/server/dataDir.ts <---- 独立模块，被所有 API Route 使用
lib/localPrivacy.ts <------ 独立模块，被 API Route 和组件使用
```

## API 端点

### 认证

- `POST /api/auth/login` -- 登录（body: `{ password, mode }`）
- `DELETE /api/auth/login` -- 登出（body: `{ mode }`）
- `POST /api/auth/password` -- 修改密码（admin，body: `{ target, newPassword }`）

### 回忆

- `GET /api/memories` -- 获取所有回忆（site）
- `POST /api/memories` -- 创建回忆（admin）
- `PUT /api/memories` -- 导入/覆盖所有回忆（admin，备份恢复）
- `PATCH /api/memories` -- 编辑回忆或修改封面（admin）
- `DELETE /api/memories` -- 删除回忆（admin）

### 城市地标

- `GET /api/city-assets` -- 获取城市地标图（site）
- `PUT /api/city-assets` -- 上传城市地标图（admin）
- `PATCH /api/city-assets` -- 批量导入地标图（admin）
- `DELETE /api/city-assets` -- 删除城市地标图（admin）

### 登录页照片

- `GET /api/login-photos` -- 获取登录页照片和文案（无需认证）
- `PUT /api/login-photos` -- 上传照片或更新文案（admin）
- `PATCH /api/login-photos` -- 批量导入照片和文案（admin）
- `DELETE /api/login-photos` -- 删除照片或文案（admin）

## 技术约束

- **Next.js 16 App Router**: 使用 React Server Components，地图等交互组件标记 `"use client"`
- **Electron 42**: 桌面模式下 standalone server 在主进程内运行
- **Node.js 18+**: 使用 `crypto.timingSafeEqual`、`fs/promises` 等现代 API
- **Tailwind CSS 4**: 使用 `@theme` 指令定义设计令牌
- **D3-geo**: 仅在客户端使用（通过 `lib/geo.ts`），GeoJSON 数据不传输到客户端
