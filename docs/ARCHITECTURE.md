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
- **ChinaMapData** -- 中国地图 SSR 包装组件，在 RSC 中调用 `geo-server.ts` 预计算地图路径后传递给 ChinaMap
- **ProvinceMap** -- 省份详情地图，城市标记，回忆卡片，照片查看器，添加/编辑/删除回忆
- **MemoryTools** -- 设置页入口组件，重导出 `settings/` 子模块
- **MemoryNav** -- 顶部导航栏壳，提供页面布局和导航
- **EntryExperience** -- 入口引导页，展示地图预览和天气
- **HomeProgress** -- 首页进度组件，重导出 `home-progress/` 子模块（天气卡片、统计卡片）
- **MemoryArchive** -- 回忆归档页组件
- **LocalPrivacyImage** -- 隐私模式下的图像占位组件

### 组件子目录

经过拆分，以下大组件被拆分为职责更单一的子模块：

```text
components/province-map/          省份地图子模块
  ProvinceMap.tsx                   省份详情页核心组件
  markerLayouts.ts                  城市标记布局配置（坐标、尺寸）
  imageCompression.ts               客户端图片压缩（Canvas 缩放 + JPEG 编码）
  utils.ts                          共享常量、类型定义、图片工具函数
  index.ts                          统一导出

components/home-progress/         首页进度子模块
  WeatherCard.tsx                   天气卡片组件（像素图标 + 天气框架）
  StatsCards.tsx                    统计卡片（纪念日倒计时、在一起天数、相册进度、Logo）
  index.ts                          统一导出

components/settings/              设置页子模块
  SettingsPage.tsx                  设置页主组件
  PasswordSection.tsx               密码管理区域
  BackupSection.tsx                 备份导入导出区域
  LoginPhotoSection.tsx             登录页照片管理区域
  shared.ts                         设置页共享类型和工具函数（StoredItem、图片压缩、日期计算）
  index.ts                          统一导出
```

### 组件间通信

组件间不直接通信，通过以下机制同步状态：

- **CustomEvent**: `mapofus:memories-updated`、`mapofus:admin-mode-updated`、`mapofus:settings-updated`、`mapofus:login-photos-updated`
- **自定义 Hook**: `useLocalMemories`（基于 `useSyncExternalStore`）和 `useAdminMode` 封装状态订阅逻辑
- **API 路由**: 所有数据变更通过 REST API，组件通过 fetch 获取最新数据
- **URL 路由**: 页面间通过 Next.js router 导航

## 共享模块依赖关系

```text
data/provinces.ts  <--------+
data/cities.ts     <-----+  |
                          |  |
data/cities-index.ts <---+  |
  (城市轻量索引)          |  |
                          |  |
data/memories.ts          |  |
  (Memory 类型)           |  |
       |                  |  |
       v                  |  |
data/progress.ts  --------+--+
  (已去城市/省份)         |
  (LocalMemoryStore)     |
       |                  |
       v                  |
data/provinceCityPlaces.ts-+
  (省份城市索引)          |
                          |
data/memoryUtils.ts       |
  (回忆合并去重)          |
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
data/loginPhotoSlots.ts   |
  (照片九宫格槽位)        |
                          |
lib/geo.ts  <-------------+
  (D3 投影, 客户端)        |
       |                  |
       v                  |
components/ChinaMap.tsx   |
components/ProvinceMap.tsx|
                          |
lib/geo-server.ts <-------+
  (D3 投影, 服务端 SSR)   |
       |                  |
       v                  |
components/ChinaMapData.tsx
  (SSR 预计算地图路径)    |
                          |
lib/mapColors.ts  <-------+
  (地图共享色板)           |
                          |
lib/typeGuards.ts <-------+
  (isRecord 类型守卫)     |
                          |
lib/imageUtils.ts <-------+
  (图片 URL 类型判断)     |
                          |
lib/dateUtils.ts  <-------+
  (日期规范化)            |
                          |
hooks/useLocalMemories.ts
  (记忆数据 useSyncExternalStore)
                          |
hooks/useAdminMode.ts
  (管理员模式 Hook)       |
                          |
lib/server/auth.ts  <----- 独立模块，被所有 API Route 使用
lib/server/supabase.ts <--- 独立模块，被所有 API Route 使用
lib/server/dataDir.ts <---- 独立模块，被所有 API Route 使用
lib/server/createJsonStore.ts <--- 原子写入存储，API Route 使用
lib/server/shutdown.ts <--- 进程退出 Hook，Electron 和 createJsonStore 使用
lib/server/validation.ts <- 请求校验，被 API Route 使用
lib/localPrivacy.ts <------ 独立模块，被 API Route 和组件使用
```

## 存储层核心：createJsonStore

`lib/server/createJsonStore.ts` 是本地文件存储的核心抽象，替代了直接的 `fs.readFile` / `fs.writeFile` 调用：

```text
createJsonStore({ filePath, fallback, validate })
  |
  +-- read()        读取数据（内存缓存，首次命中磁盘）
  +-- write(data)   原子写入（互斥锁序列化）
  +-- update(fn)    读-改-写原子操作
  +-- drain()       等待所有挂起写入完成
```

关键特性：

- **互斥锁**：Promise 链互斥锁确保并发写入严格串行化
- **原子写入**：先写 `.tmp.{pid}` 临时文件，再 rename 覆盖目标文件；Windows 下 fallback 为直接写入
- **COW 备份**：每次写入前复制 `.bak` 备份，成功后删除
- **崩溃恢复**：`recoverDataFiles()` 在启动时扫描并修复残留的 `.tmp` 和 `.bak` 文件
- **内存缓存**：读取结果缓存在内存中，避免重复磁盘 IO

## 进程退出：shutdown hooks

`lib/server/shutdown.ts` 提供进程退出时的异步排空机制：

```text
registerShutdownHook(name, fn, timeoutMs)  -- 注册清理函数
drainShutdownHooks()                       -- 执行所有注册的 hook
```

Electron 主进程通过 `globalThis.__MAP_OF_US_SHUTDOWN_DRAIN__` 调用排空，在退出前等待所有挂起的磁盘写入完成。每个 hook 有独立的超时限制（默认 5 秒）。

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

## 测试架构

测试使用 Vitest 运行，覆盖所有 API 端点和关键服务端模块。

### 测试目录结构

```text
__tests__/
  setup.ts                      全局测试配置（mock fs、supabase、环境变量）
  api/
    auth-login.test.ts          登录 API（5 个用例）
    auth-password.test.ts       密码修改 API（4 个用例）
    memories.test.ts            回忆 CRUD（14 个用例）
    city-assets.test.ts         城市地标（8 个用例）
    login-photos.test.ts        登录照片（8 个用例）
  lib/server/
    auth.test.ts                认证工具函数
    createJsonStore.test.ts     原子写入存储（读写、互斥锁、崩溃恢复）
    shutdown.test.ts            进程退出 Hook 排空
    validation.test.ts          请求校验工具
  data/
    progress.test.ts            已去城市/省份计算
  helpers/
    factories.ts                测试数据工厂（创建测试用 Memory、设置等）
    auth-utils.ts               认证测试工具（创建测试 token、Cookie）
  perf-verification.test.ts     性能验证（排除在默认运行外）
```

### 测试策略

- 所有测试强制使用本地文件存储模式（`MAP_OF_US_STORAGE_MODE=local`）
- 使用临时目录（`os.tmpdir()`）隔离测试数据
- API 测试通过 mock HTTP 请求覆盖完整请求-响应生命周期
- `createJsonStore` 测试覆盖并发写入、崩溃恢复、缓存一致性
- 超时设置 10 秒，适配 Windows 文件系统

### 覆盖率

V8 覆盖率默认覆盖 `app/api/**/*.ts` 和 `lib/server/` 下的认证、Supabase 模块。运行 `npm run test:coverage` 生成覆盖率报告。
