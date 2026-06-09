# Contributing to Map of Us / 为 Map of Us 贡献

Thank you for your interest in contributing! This guide will help you get started.

感谢你的关注！本指南将帮助你快速上手贡献流程。

---

## Table of Contents / 目录

- [Dev Setup / 开发环境搭建](#dev-setup--开发环境搭建)
- [Coding Conventions / 编码规范](#coding-conventions--编码规范)
- [Commit Convention / 提交规范](#commit-convention--提交规范)
- [Pull Request Process / PR 流程](#pull-request-process--pr-流程)
- [Running Tests / 运行测试](#running-tests--运行测试)

---

## Dev Setup / 开发环境搭建

### Prerequisites / 前置条件

- Node.js >= 20.x
- npm >= 10.x
- Git

### Installation / 安装

```bash
# Clone the repo / 克隆仓库
git clone https://github.com/anthropics/map-of-us-template.git
cd map-of-us-template

# Install dependencies / 安装依赖
npm install

# Start development (web) / 启动 Web 开发服务
npm run dev

# Start development (Electron desktop) / 启动 Electron 桌面端
npm run desktop
```

The web app will be available at `http://localhost:3000`.  
Web 应用将在 `http://localhost:3000` 可用。

---

## Coding Conventions / 编码规范

### Language / 语言

- All source code must be written in **TypeScript**.  
  所有源代码必须使用 **TypeScript** 编写。
- Use strict type annotations; avoid `any` where possible.  
  使用严格的类型注解，尽量避免 `any`。

### React & Next.js Patterns / React 和 Next.js 模式

- Use **React 19** features (Server Components, `use()` hook, `useFormStatus`, etc.) where appropriate.  
  合理使用 **React 19** 特性（Server Components、`use()` hook、`useFormStatus` 等）。
- Follow **Next.js 16 App Router** conventions (`app/` directory, `layout.tsx`, `page.tsx`, `loading.tsx`).  
  遵循 **Next.js 16 App Router** 约定（`app/` 目录、`layout.tsx`、`page.tsx`、`loading.tsx`）。
- Prefer Server Components by default; use `'use client'` only when client interactivity is required.  
  默认使用 Server Components；仅在需要客户端交互时添加 `'use client'`。
- Keep API routes in `app/api/` following RESTful conventions.  
  API 路由放在 `app/api/` 下，遵循 RESTful 约定。

### Styling / 样式

- Use **Tailwind CSS 4** utility classes for styling.  
  使用 **Tailwind CSS 4** 工具类进行样式编写。
- Reuse components from `components/` before creating new ones.  
  创建新组件前，优先复用 `components/` 中已有的组件。

### File Organization / 文件组织

- Place shared utilities in `lib/`.  
  共享工具函数放在 `lib/`。
- Place custom hooks in `hooks/`.  
  自定义 Hooks 放在 `hooks/`。
- Place data access logic in `data/`.  
  数据访问逻辑放在 `data/`。
- Place Electron-specific code in `electron/`.  
  Electron 相关代码放在 `electron/`。
- Place tests in `__tests__/` mirroring the source structure.  
  测试文件放在 `__tests__/`，目录结构与源码保持一致。

### General / 通用规范

- Write meaningful variable and function names.  
  使用有意义的变量名和函数名。
- Add comments for complex logic; avoid obvious comments.  
  为复杂逻辑添加注释，避免无意义的注释。
- Keep functions small and focused.  
  保持函数职责单一、体积小。

---

## Commit Convention / 提交规范

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### Format / 格式

```
<type>(<scope>): <subject>
```

### Types / 类型

| Type | Description | 说明 |
|------|-------------|------|
| `feat` | New feature | 新功能 |
| `fix` | Bug fix | 修复 Bug |
| `docs` | Documentation | 文档更新 |
| `style` | Code style (formatting, semicolons, etc.) | 代码风格（格式、分号等） |
| `refactor` | Code refactor | 代码重构 |
| `perf` | Performance improvement | 性能优化 |
| `test` | Adding or updating tests | 测试相关 |
| `chore` | Build process, CI, tooling | 构建、CI、工具链 |
| `security` | Security fix | 安全修复 |

### Examples / 示例

```
feat(map): add tap-to-zoom on province SVG
fix(auth): resolve session timeout on Electron
perf(province): lazy load city images
test(backup): add round-trip export/import tests
```

### Scopes / 作用域

Use one of the module names: `map`, `province`, `settings`, `auth`, `backup`, `electron`, `api`, `components`, `data`, `lib`, `tests`, `ci`.

使用以下模块名之一：`map`、`province`、`settings`、`auth`、`backup`、`electron`、`api`、`components`、`data`、`lib`、`tests`、`ci`。

---

## Pull Request Process / PR 流程

1. **Fork** the repository and create your branch from `main`.  
   **Fork** 仓库，并从 `main` 分支创建你的开发分支。

2. **Branch naming** / 分支命名:
   ```
   feat/short-description
   fix/short-description
   perf/short-description
   ```

3. **Make your changes** following the coding conventions above.  
   按照上述编码规范进行修改。

4. **Write or update tests** for your changes.  
   为你的修改编写或更新测试。

5. **Run the full test suite** to make sure nothing is broken.  
   运行完整测试套件，确保没有破坏现有功能。

6. **Fill out the PR template** completely, including:  
   完整填写 PR 模板，包括：
   - Description of changes / 变更描述
   - Type of change / 变更类型
   - Modules affected / 影响的模块
   - Testing checklist / 测试清单

7. **Request a review** from a maintainer.  
   请求维护者进行代码审查。

8. **Address review feedback** promptly.  
   及时处理审查反馈。

---

## Running Tests / 运行测试

```bash
# Run all tests / 运行全部测试
npm test

# Run tests in watch mode / 以监听模式运行测试
npm run test:watch

# Run tests with coverage / 运行测试并生成覆盖率报告
npm run test:coverage
```

Ensure all tests pass before submitting a PR.

提交 PR 前请确保所有测试通过。

---

## Questions? / 有疑问？

If you have questions, feel free to open an issue or start a discussion.

如有疑问，请随时提交 Issue 或发起讨论。

Thank you for contributing! / 感谢你的贡献！
