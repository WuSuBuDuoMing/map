# Map of Us

> 一个本地优先的情侣记忆地图桌面应用 -- 用地图标记你们一起走过的每一个城市。

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![Electron](https://img.shields.io/badge/Electron-42-47848f)](https://www.electronjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 为什么需要这个

市面上的地图应用只能标记位置，却无法承载回忆。Map of Us 把中国地图变成你们的私人记忆画布 -- 每个去过的地方都可以添加照片、文字和日期。数据全部保存在你自己的设备上，不需要联网，不需要注册账号。

## 功能特性

- **密码保护** -- 站点密码 + 管理员密码双层认证，Cookie HMAC 签名
- **中国地图** -- 34 省份 SVG 地图，已去过省份自动点亮，支持缩放和平移
- **省份详情** -- 点击省份进入详情页，查看该省所有城市和回忆
- **城市回忆** -- 每个城市可添加多条回忆，支持多图封面、编辑和删除
- **设置管理** -- 纪念日、沿途天气城市、情侣 Logo、登录页九宫格照片
- **完整备份** -- 导出 / 导入完整备份文件，一键恢复所有数据
- **桌面应用** -- Electron 打包，数据写入 `userData` 目录，安装包只读
- **Web 部署** -- 同一套代码可部署到服务器（需配置 Supabase）

## 技术栈

- **框架**: Next.js 16 App Router (RSC)
- **UI**: React 19 + Tailwind CSS 4 + Framer Motion
- **地图**: D3-geo 投影 + 自定义 SVG 渲染
- **桌面**: Electron 42 + Next.js standalone
- **存储**: 本地 JSON 文件 (桌面) / Supabase (Web)
- **认证**: HMAC-SHA256 Cookie 签名 + 速率限制
- **测试**: Vitest + V8 Coverage

## 快速开始

### 前置条件

- Node.js 18+
- npm 9+

### Web 开发模式

```bash
# 克隆仓库
git clone https://github.com/yourname/map-of-us.git
cd map-of-us

# 安装依赖
npm install

# 复制环境变量（可选，本地开发可跳过）
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:3002`，输入站点密码即可进入。

### Electron 桌面模式

```bash
# 启动桌面开发模式（会同时启动 Next.js dev server 和 Electron 窗口）
npm run desktop
```

### 初始密码

首次安装的默认密码：

```text
进入密码：1234
管理员密码：admin1234
```

进入后请尽快在 **设置 -> 密码设置** 中修改（需先用管理员密码开启管理员模式）。

技术说明：桌面版首次启动时会在 `userData` 目录创建 `auth.local.json`，保存密码和随机生成的 `AUTH_COOKIE_SECRET`。若显式设置了环境变量，环境变量优先。

## 安装与首次打开（给使用者）

本应用未做苹果付费签名和公证，首次打开需要手动放行，**只需做一次**。

### macOS

1. 双击 `.dmg` 文件，将 **Map of Us** 拖进「应用程序」
2. **右键 -> 打开**，弹窗中再次点击 **打开**
3. 若没有「打开」选项：**系统设置 -> 隐私与安全性**，找到 Map of Us 提示，点 **仍要打开**
4. 若提示「已损坏」：终端运行 `xattr -cr "/Applications/Map of Us.app"`

### Windows

1. 运行 `-Setup.exe` 安装
2. 若出现 SmartScreen 提示：点 **更多信息 -> 仍要运行**

## 开发指南

### 项目结构

```text
app/                        App Router 页面和 API
  api/
    auth/login/             登录/登出 API
    auth/password/          修改密码 API
    memories/               回忆 CRUD API
    city-assets/            城市地标图 API
    login-photos/           登录页照片 API
  map/                      主地图页
  province/[id]/            省份详情页
  settings/                 设置页
  anniversaries/            纪念日页
  favorites/                收藏页
  time-capsule/             时光宝盒页
  demo/                     演示体验页

components/                 UI 组件
  ChinaMap.tsx              中国地图（SVG + 缩放）
  ProvinceMap.tsx           省份详情地图
  MemoryTools.tsx           设置页完整功能
  MemoryNav.tsx             导航栏壳
  EntryExperience.tsx       入口引导页
  ...

data/                       数据定义和浏览器侧工具
  provinces.ts              34 省份定义
  cities.ts                 城市数据（含地标、坐标）
  memories.ts               Memory 类型定义
  progress.ts               已去城市/省份计算
  appSettings.ts            应用设置读写
  adminMode.ts              管理员模式状态
  loginPhotoStore.ts        登录页照片客户端存储
  provinceCityPlaces.ts     省份城市索引

lib/                        核心库
  geo.ts                    D3 地理投影和路径计算
  localPrivacy.ts           隐私模式图像替换
  server/
    auth.ts                 HMAC Cookie 认证
    supabase.ts             Supabase 客户端 + 读写
    dataDir.ts              数据目录路径解析

electron/                   Electron 主进程
  main.js                   窗口管理、Next.js 服务启动、认证配置

scripts/                    构建脚本
  prepare-standalone.mjs    准备 standalone 产物
  dev-keepalive.sh          开发服务器保活
  start-dev-daemon.sh       开发守护进程

__tests__/                  Vitest 测试套件
  api/                      API 端点测试
  helpers/                  测试工具（请求构造、数据工厂）
  setup.ts                  全局测试配置
```

### 共享模块说明

- **`data/provinces.ts`** -- 34 省份 ID、adcode、中英文名、是否已点亮
- **`data/cities.ts`** -- 城市数据：坐标、省份归属、地标、精灵图
- **`data/memories.ts`** -- `Memory` 接口定义和时间排序工具
- **`data/progress.ts`** -- 根据回忆数据计算已去城市和已去省份
- **`data/appSettings.ts`** -- 应用设置的 localStorage 读写和校验
- **`data/adminMode.ts`** -- 管理员模式的 sessionStorage 读写
- **`data/loginPhotoStore.ts`** -- 登录页照片的 API 读写 + 旧版迁移
- **`data/provinceCityPlaces.ts`** -- 省份-城市索引，用于省份详情页
- **`lib/geo.ts`** -- GeoJSON 加载、D3 投影、路径生成
- **`lib/server/auth.ts`** -- HMAC-SHA256 Cookie 签名和验证

### 数据存储架构

应用采用双模式存储，根据环境自动切换：

```text
请求 -> API Route -> 判断存储模式
                      |
                      +-> MAP_OF_US_STORAGE_MODE=local  -> 本地 JSON 文件
                      |
                      +-> Supabase 已配置                 -> Supabase DB + Storage
```

本地文件存储路径：

```text
开发模式：  data/localMemories.private.json
桌面打包：  [userData]/data/localMemories.private.json
```

### 认证流程

```text
用户输入密码
    |
    v
POST /api/auth/login
    |
    +-> verifyPassword() -- timing-safe 比较
    +-> setAuthCookies() -- HMAC-SHA256 签名 Cookie
    |
    v
后续请求携带 Cookie
    |
    +-> getAuthRole() -- 验证签名和过期时间
    +-> requireSiteSession() / requireAdminSession()
```

## 测试指南

```bash
# 运行全部测试
npm test

# 监听模式（文件变更自动重跑）
npm run test:watch

# 运行测试并生成覆盖率报告
npm run test:coverage
```

测试套件覆盖：

- 认证 API：登录、登出、密码修改
- 回忆 API：完整 CRUD 生命周期 + 输入校验
- 城市地标 API：读写删除 + 权限检查
- 登录照片 API：照片和文字管理 + 迁移逻辑

测试使用独立的临时目录，不会影响项目数据文件。所有测试强制使用本地文件存储模式，不连接 Supabase。

## 环境变量

- **`SITE_PASSWORD`** -- 站点进入密码（桌面版可选，默认 `1234`）
- **`ADMIN_PASSWORD`** -- 管理员密码（桌面版可选，默认 `admin1234`）
- **`AUTH_COOKIE_SECRET`** -- Cookie 签名密钥（桌面版可选，自动生成）
- **`SUPABASE_URL`** -- Supabase 项目 URL（Web 部署必填）
- **`SUPABASE_SERVICE_ROLE_KEY`** -- Supabase Service Role Key（Web 部署必填）
- **`SUPABASE_STORAGE_BUCKET`** -- Supabase Storage Bucket 名称，默认 `map-of-us`
- **`MAP_OF_US_STORAGE_MODE`** -- 设为 `local` 强制使用本地文件存储
- **`MAP_OF_US_DATA_DIR`** -- 自定义数据文件目录
- **`MAP_OF_US_DESKTOP`** -- 设为 `1` 标识 Electron 桌面环境

桌面版的认证环境变量自动从 `auth.local.json` 读取，无需手动配置 `.env.local`。

## 部署指南

### Web 部署

1. 配置 Supabase：在 Supabase SQL Editor 中运行 `docs/supabase-schema.sql`
2. 配置环境变量：填写 `.env.local` 中的 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
3. 构建和启动：

```bash
npm run build
npm start
```

### 桌面打包

```bash
# 1. 生成 Next.js standalone 产物
npm run desktop:prepare

# 2. 生成安装包
npm run dist:mac    # macOS DMG
npm run dist:win    # Windows NSIS 安装包

# 快速验证（不打包 DMG/EXE）
npm run dist:dir
```

产物输出到 `dist/` 目录。在 macOS 上可交叉编译 Windows 安装包，但最终发布前建议在目标平台验证。

当前打包未配置正式应用图标和开发者签名，公开分发前需要配置证书和公证。

## 数据保存位置

- **浏览器开发**: `data/localMemories.private.json` 等
- **桌面打包 (macOS)**: `~/Library/Application Support/Map of Us/data`
- **桌面打包 (Windows)**: `%APPDATA%/Map of Us/data`

## 备份与迁移

1. 进入设置页，用管理员密码开启管理员模式
2. 点击「导出备份」保存完整备份文件
3. 换电脑或重装后，在设置页「导入备份」恢复

导入会恢复：回忆、城市地标、登录照片、纪念日、天气城市、Logo 等全部数据。

## 可自定义内容

在设置页开启管理员模式后可自定义：

- 纪念日名称和日期
- 首页「沿途天气」城市（最多 3 个）
- 右下角情侣 Logo
- 登录页九宫格照片及文案
- 城市地标图

## 架构概览

```text
                    +------------------+
                    |   Electron 壳    |
                    |  (main.js)       |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Next.js Server  |
                    |  (standalone)    |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +--------v--------+
     |   App Router    |          |   API Routes    |
     |  (RSC Pages)    |          |  (REST API)     |
     +--------+--------+          +--------+--------+
              |                             |
     +--------v--------+          +--------v--------+
     |  React 组件     |          |  认证中间件      |
     |  ChinaMap        |          |  速率限制        |
     |  ProvinceMap     |          |  输入校验        |
     |  MemoryTools     |          +--------+--------+
     +-----------------+                    |
                                   +--------v--------+
                                   |  存储层          |
                                   |  本地文件 /      |
                                   |  Supabase        |
                                   +-----------------+
```

## CI/CD

项目使用 GitHub Actions 实现持续集成和发布自动化。

**每次 push / PR 到 main 分支时**，CI 流水线自动执行：

```text
checkout -> Node 20 -> npm ci -> tsc --noEmit -> lint -> test -> build
```

**推送 `v*` tag 时**，Release 流水线自动构建 macOS 和 Windows 安装包，并创建 GitHub Release（draft）。

```bash
# 触发发布
git tag v0.2.0
git push origin v0.2.0
```

## 许可证

MIT
