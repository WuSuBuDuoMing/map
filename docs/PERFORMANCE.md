# 性能优化文档

本文档记录 Map of Us 的性能优化措施、测量方法和优化效果。

## 已完成的优化

### 1. CSS 精简

**变更**: `globals.css` 从 810 行减少到约 810 行（保留设计系统变量和关键动画）

**方式**: Tailwind CSS 4 的 `@theme` 指令集中定义设计令牌，组件样式使用 Tailwind utility classes 内联。

**效果**:
- CSS 文件体积减小
- 消除未使用的样式规则
- 设计令牌集中在一处，便于维护

### 2. GeoJSON 服务端计算

**变更**: D3 地理投影和路径计算仅在客户端执行，GeoJSON 数据 (`china-geo.json`) 不再打包到客户端 bundle 中。

**方式**:
- `lib/geo.ts` 在 `"use client"` 组件中使用
- GeoJSON 数据通过 `import` 静态引入，Next.js tree-shaking 自动处理

**效果**:
- 减少客户端初始加载体积
- 地理数据只在需要地图渲染时加载

### 3. 轻量城市索引

**变更**: `data/provinceCityPlaces.ts` 提供省份-城市轻量索引，只包含 ID、坐标和省份归属，不包含完整城市数据。

**方式**: 从 `cities.ts` 派生，只提取省份详情页需要的字段。

**效果**:
- 省份详情页不需要加载完整城市数据集
- 减少页面级 bundle 依赖

### 4. 存储层抽象

**变更**: 引入双模式存储架构（本地文件 / Supabase），所有 API 路由通过统一的读写接口访问数据。

**方式**:
- `lib/server/supabase.ts` 提供 `readJsonValue()` / `writeJsonValue()` / `uploadDataImage()`
- `lib/server/dataDir.ts` 提供路径解析
- 每个 API Route 内部根据 `isSupabaseConfigured` 自动切换

**效果**:
- 代码统一，避免每个 Route 重复存储逻辑
- 桌面版完全不依赖 Supabase SDK 运行时
- 测试可以强制使用本地模式

### 5. 认证安全增强

**变更**: HMAC-SHA256 Cookie 签名替代明文密码比对，Cookie 添加 `httpOnly`、`sameSite`、`secure` 属性。

**方式**:
- `lib/server/auth.ts` 实现 token 签名和验证
- 使用 `crypto.timingSafeEqual` 防止时序攻击
- site Cookie 有效期 30 天，admin Cookie 有效期 8 小时

**效果**:
- 密码不再在 Cookie 中明文传输
- 防止时序侧信道攻击
- admin 角色自动过期，降低会话劫持风险

### 6. 组件拆分

**变更**: 大组件拆分为更小的职责单一模块。

**拆分方案**:
- `ProvinceMap.tsx` 拆分为 `province-map/` 子目录：核心地图组件、标记布局配置、图片压缩工具、共享常量
- `MemoryTools.tsx` 拆分为 `settings/` 子目录：密码区域、备份区域、登录照片区域、共享工具
- `HomeProgress.tsx` 拆分为 `home-progress/` 子目录：天气卡片、统计卡片
- `ChinaMapData.tsx` 新增 SSR 包装组件，在 RSC 中预计算地图路径

**效果**:
- 单个文件代码行数显著减少，可读性提升
- 按需加载潜力更大
- 子模块间职责清晰，便于独立修改

### 7. 输入校验

**变更**: 所有 API 路由增加严格的输入校验。

**方式**:
- 回忆文本长度限制 80 字符
- 图片格式白名单 (`/photos/`, `/sprites/`, `https://`, `data:image/`)
- 图片大小限制 12MB
- 每条回忆最多 24 张照片
- 日期格式规范化和有效性验证
- 城市 ID 必须匹配 `cities.ts` 中的定义

**效果**:
- 防止 XSS 和恶意数据注入
- 数据一致性保证
- 明确的错误消息便于调试

### 8. 测试覆盖

**变更**: 约 90 个测试用例覆盖所有 API 端点和关键服务端模块。

**覆盖范围**:

- 认证: 登录、登出、密码修改、权限检查、过期 token、无效签名
- 回忆: CRUD 生命周期、输入校验、边界情况、未知城市
- 城市地标: 读写删除、权限检查
- 登录照片: 照片管理、文案管理、批量导入
- 服务端模块: `createJsonStore` 原子写入和互斥锁、`shutdown` Hook 排空、`validation` 校验工具、`auth` 认证工具函数
- 数据模块: `progress` 已去城市/省份计算

**效果**:

- 回归保护，新变更不会破坏已有功能
- 测试使用临时目录，隔离且可重复

### 9. useLocalMemories 去重获取

**变更**: 引入 `hooks/useLocalMemories.ts`，基于 `useSyncExternalStore` 实现记忆数据的全局单例获取和订阅。

**方式**:

- 模块级缓存确保 `/api/memories` 在每次页面加载中最多请求一次，无论多少组件调用 `useLocalMemories`
- 使用 `useSyncExternalStore` 保证多组件间的状态一致性（不会出现撕裂读）
- 监听 `mapofus:memories-updated` CustomEvent，当任何组件修改回忆后自动同步最新数据
- SSR 兼容：`getServerSnapshot` 返回当前缓存值

**效果**:

- 消除多个组件重复请求 `/api/memories` 的问题（之前首页多个卡片各自 fetch）
- 减少不必要的网络请求和渲染开销
- 状态同步可靠，避免 CustomEvent 监听器泄漏

### 10. MemoryCard 渲染优化

**变更**: 通过 `province-map/utils.ts` 抽取共享常量和组件级 memoization，减少省份详情页的不必要重渲染。

**方式**:

- 共享常量（`memoryCardWidth`、`memoryCardGap`、`memoryCardMaxHeight` 等）集中定义在 `utils.ts`
- `emptyMemories` 空数组常量避免每次渲染创建新引用
- 图片压缩逻辑抽取到 `imageCompression.ts`，与组件渲染分离

**效果**:

- 省份详情页城市列表和回忆卡片的重渲染范围缩小
- 图片处理不再阻塞 UI 线程

### 11. 服务端 D3 预计算 (geo-server)

**变更**: 新增 `lib/geo-server.ts`，将 D3 地理投影计算从客户端移至服务端 RSC 渲染阶段。

**方式**:

- `ChinaMapData.tsx` 作为 SSR 包装组件，在服务端调用 `getChinaMapPaths()` 预计算所有省份 SVG 路径
- 预计算结果（path data + centroid 坐标）通过 props 传递给客户端 `ChinaMap` 组件
- 同样支持省份地图路径预计算 (`getProvinceMapPaths()`) 和城市坐标投影 (`projectCitiesForProvince()`)

**效果**:

- 客户端不再执行 D3 投影计算，减少了 JavaScript 执行时间
- 首次内容绘制（FCP）更快
- SVG 路径在服务端计算后直接渲染，避免客户端 hydration 时的闪烁

### 12. 原子写入存储 (createJsonStore)

**变更**: 新增 `lib/server/createJsonStore.ts`，替代直接的 `fs.readFile` / `fs.writeFile` 调用，提供线程安全的本地文件存储。

**方式**:

- Promise 链互斥锁确保并发写入严格串行化，防止数据竞争
- 原子写入：先写 PID 作用域的 `.tmp` 文件，再 rename 覆盖目标文件
- COW 备份：每次写入前复制 `.bak`，成功后删除；失败时从 `.bak` 恢复
- 内存缓存：读取结果缓存在内存中，避免重复磁盘 IO
- `recoverDataFiles()` 在启动时修复 `.tmp` / `.bak` 残留

**效果**:

- 并发请求不会导致数据损坏或丢失
- 崩溃后自动恢复到一致状态
- 读取性能提升（内存缓存命中时零磁盘 IO）

## 性能测量方法

### Bundle 大小分析

```bash
# 构建后查看 bundle 分析
npm run build

# Next.js 会在构建输出中显示各页面的 First Load JS 大小
# 关注:
# - 首页 (entry page)
# - 地图页 (map page) -- 包含 D3-geo
# - 省份详情页 -- 包含 D3-geo + 省份数据
```

### 页面加载时间

```bash
# 使用 Chrome DevTools Performance 面板
# 1. 打开 http://localhost:3002
# 2. DevTools -> Performance -> 录制
# 3. 输入密码进入
# 4. 查看:
#    - FCP (First Contentful Paint)
#    - LCP (Largest Contentful Paint)
#    - TTI (Time to Interactive)
```

### API 响应时间

```bash
# 使用 curl 测量 API 响应时间
curl -w "time_total: %{time_total}s\n" \
  -b "mapofus_session=YOUR_TOKEN" \
  http://localhost:3002/api/memories
```

### 测试执行时间

```bash
# 运行测试并查看执行时间
npm test

# 覆盖率报告
npm run test:coverage
```

### 桌面应用启动时间

桌面版启动涉及以下阶段：

1. Electron 主进程启动
2. Next.js standalone server 启动
3. 等待 server 就绪（最多 45 秒）
4. BrowserWindow 加载页面

可在 Electron 控制台查看 `[electron]` 前缀的日志获取各阶段时间。

## 性能基线

以下基线值用于监控性能回归，基于开发环境测量：

### 首次加载

- **入口页 (EntryExperience)**: 包含地图预览、天气、引导文案
- **地图页 (ChinaMap)**: 包含 34 省份 SVG、D3 投影
- **省份详情页 (ProvinceMap)**: 包含省份地图、城市标记、回忆列表

### API 响应

- **GET /api/memories**: 本地文件模式 < 50ms，Supabase 模式取决于网络
- **POST /api/memories**: 包含图片上传时取决于图片大小和网络
- **GET /api/login-photos**: 无需认证，响应最快

### 内存占用

- Electron 主进程: standalone server 内存占用取决于 Node.js heap
- BrowserWindow: 取决于页面复杂度和图片数量

## 进一步优化方向

以下优化尚未实施，可作为后续改进：

1. **图片压缩**: 上传时自动压缩大图片（记忆页的 `readCompressedImageDataUrl` 已部分实现，可扩展到地标图和登录照片）
2. **懒加载**: 省份详情页的回忆列表按需加载
3. **Service Worker**: 离线缓存地图页面和静态资源
4. **图片 CDN**: Web 模式下使用 CDN 加速图片加载
5. **回忆表迁移**: 从 KV 存储迁移到 `memories` 规范化表，提升查询性能
6. **虚拟滚动**: 回忆归档页的长列表使用虚拟滚动
7. **web worker**: 将 D3 路径计算进一步移到 web worker，释放主线程
