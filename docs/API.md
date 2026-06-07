# API 文档

本文档描述 Map of Us 项目的 API 端点。

## 认证

所有 API 端点都需要认证，通过 Cookie 实现：

- `mapofus_session` - 站点会话（30天有效期）
- `mapofus_admin` - 管理员会话（8小时有效期）

### 登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "password": "your-password",
  "mode": "site" | "admin"
}
```

**响应：**
- `200 OK` - 登录成功，设置 Cookie
- `400 Bad Request` - 无效的请求格式
- `401 Unauthorized` - 密码错误
- `429 Too Many Requests` - 请求过于频繁（每分钟最多10次）
- `503 Service Unavailable` - 认证未配置

### 登出

```http
DELETE /api/auth/login
Content-Type: application/json

{
  "mode": "site" | "admin" | "all"
}
```

**响应：**
- `200 OK` - 登出成功，清除 Cookie

---

## 回忆 API

### 获取回忆

```http
GET /api/memories
```

**响应：**
```json
{
  "memories": {
    "beijing": [
      {
        "id": "beijing-local-0",
        "cityId": "beijing",
        "city": "北京",
        "cityEn": "Beijing",
        "date": "2024.05.20",
        "image": "data:image/...",
        "text": "第一次去北京",
        "createdAt": "2024-05-20T10:00:00.000Z"
      }
    ]
  }
}
```

### 创建回忆

```http
POST /api/memories
Content-Type: application/json

{
  "cityId": "beijing",
  "date": "2024.05.20",
  "text": "第一次去北京",
  "image": "data:image/png;base64,...",
  "photos": ["data:image/jpeg;base64,..."]
}
```

**响应：**
- `200 OK` - 创建成功
- `400 Bad Request` - 无效的回忆数据
- `403 Forbidden` - 需要管理员权限
- `413 Payload Too Large` - 请求体超过 15MB

### 批量导入

```http
PUT /api/memories
Content-Type: application/json

{
  "memories": {
    "beijing": [...],
    "shanghai": [...]
  }
}
```

**响应：**
- `200 OK` - 导入成功
- `403 Forbidden` - 需要管理员权限
- `413 Payload Too Large` - 请求体超过 50MB

---

## 城市资产 API

### 获取城市资产

```http
GET /api/city-assets
```

**响应：**
```json
{
  "assets": {
    "beijing": "data:image/png;base64,..."
  }
}
```

### 更新城市资产

```http
PUT /api/city-assets
Content-Type: application/json

{
  "cityId": "beijing",
  "image": "data:image/png;base64,..."
}
```

**响应：**
- `200 OK` - 更新成功
- `403 Forbidden` - 需要管理员权限
- `413 Payload Too Large` - 请求体超过 15MB

---

## 登录照片 API

### 获取登录照片

```http
GET /api/login-photos
```

**响应：**
```json
{
  "photos": {
    "hangzhou": "data:image/jpeg;base64,..."
  },
  "texts": {
    "hangzhou": {
      "city": "杭州",
      "label": "西湖边"
    }
  }
}
```

### 更新登录照片

```http
PUT /api/login-photos
Content-Type: application/json

{
  "photos": {
    "hangzhou": "data:image/jpeg;base64,..."
  },
  "texts": {
    "hangzhou": {
      "city": "杭州",
      "label": "西湖边"
    }
  }
}
```

**响应：**
- `200 OK` - 更新成功
- `403 Forbidden` - 需要管理员权限
- `413 Payload Too Large` - 请求体超过 20MB

---

## 错误响应格式

所有错误响应都遵循统一格式：

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### 错误代码

| 代码 | HTTP 状态 | 描述 |
|------|----------|------|
| `BAD_REQUEST` | 400 | 无效的请求格式 |
| `UNAUTHORIZED` | 401 | 需要认证 |
| `FORBIDDEN` | 403 | 需要管理员权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `PAYLOAD_TOO_LARGE` | 413 | 请求体太大 |
| `RATE_LIMITED` | 429 | 请求过于频繁 |
| `CONFIGURATION_ERROR` | 503 | 服务配置错误 |
| `INTERNAL_ERROR` | 500 | 内部服务器错误 |

---

## 安全特性

1. **CSRF 保护** - 所有写操作都验证 Origin 头
2. **速率限制** - 登录端点限制每分钟 10 次请求
3. **输入验证** - 所有输入都经过严格验证
4. **内容大小限制** - 防止超大请求
5. **安全头** - 移除 X-Powered-By 头
6. **Cookie 安全** - HttpOnly、Secure、SameSite=Lax
