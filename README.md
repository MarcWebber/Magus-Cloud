# Magus Cloud

Magus Cloud 是一个面向文件浏览、上传、分享与运维配置的 Web 控制台。当前版本已经完成一轮面向部署的重构，前后端结构更清晰，配置可持久化，支持 Docker Compose 一键部署，并内置中文默认界面与 i18n 能力。

## 项目定位

这个项目主要用于下面几类场景：

- 作为个人或团队的轻量文件工作台，集中浏览、上传、删除和下载文件
- 通过分享链接对外分发文件或文件夹，并支持提取码控制
- 使用飞书作为默认登录入口，减少额外账号体系维护成本
- 使用管理员后台统一维护飞书、ngrok 和运行环境配置
- 在单机或小规模服务器场景下快速部署一套可用的文件服务面板

## 核心功能

- 中文默认界面，前端已接入 i18n
- 飞书登录为主，本地管理员登录为兜底
- httpOnly Cookie 会话认证
- 文件浏览、上传文件、上传文件夹、删除、下载
- 文件预览与公开分享
- 分享信息持久化，重启后不丢失
- 后台设置页，可维护飞书、ngrok、存储与基础 UI 配置
- 后台监控页，可查看运行状态、公网地址、依赖检查与最近日志
- Docker 多阶段构建
- `docker compose up -d --build` 一键部署

## 技术架构

### 前端

- `Vite + React + TypeScript + Ant Design`
- 分层结构：`app / features / lib`
- 功能域：`auth / files / share / admin`

### 后端

- `Express + TypeScript`
- 模块结构：`modules/auth`、`modules/admin`、`modules/files`、`modules/share`
- 集成层：`integrations/feishu`、`integrations/ngrok`
- 配置与状态：`lib/config`、`lib/monitoring`

### 持久化目录

- `data/system-settings.json`：系统设置
- `data/shares.json`：分享记录
- `data/ngrok.yml`：ngrok 生成配置
- `logs/`：日志目录
- `storage/` 映射到 `/www/wwwroot`：实际文件存储

## 目录结构

```text
src/
  app/
  features/
  lib/
server/
  modules/
  integrations/
  lib/
  routes/
data/
logs/
storage/
Dockerfile
docker-compose.yml
```

## 环境要求

- Node.js 18 及以上
- npm 9 及以上
- 可选：Docker / Docker Compose
- 可选：LibreOffice，用于部分 Office 预览能力
- 可选：`pure-pw`，用于兼容现有依赖场景

## 配置说明

项目提供两套示例配置：

- `.env.example`：本地或直接运行 Node 服务时使用
- `.docker.env.example`：Docker Compose 部署时使用

建议先复制后再修改：

```bash
cp .env.example .env
cp .docker.env.example .docker.env
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
Copy-Item .docker.env.example .docker.env
```

### 飞书回调地址说明

当前版本已将飞书相关地址拆分为两个字段，避免回调跳转混用：

- `MAGUS_PUBLIC_APP_URL`
  - 前端访问地址
  - 飞书登录成功后会跳转到 `${MAGUS_PUBLIC_APP_URL}/dashboard`
- `MAGUS_PUBLIC_API_URL`
  - 后端对外可访问地址
  - 飞书开放平台回调地址应配置为 `${MAGUS_PUBLIC_API_URL}/api/auth/feishu/callback`

如果前后端同域部署，这两个值通常可以填成同一个地址。

## 本地安装与运行

### 1. 安装依赖

```bash
npm install
```

### 2. 准备配置

```bash
cp .env.example .env
```

至少建议修改以下项目：

- `MAGUS_ADMIN_PASSWORD`
- `MAGUS_SESSION_SECRET`
- `MAGUS_PUBLIC_APP_URL`
- `MAGUS_PUBLIC_API_URL`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`

### 3. 构建与启动

```bash
npm run build
npm run build:server
npm run start
```

默认启动后访问：

```text
http://localhost:3000
```

## Docker Compose 部署

### 1. 准备 Docker 环境变量

```bash
cp .docker.env.example .docker.env
```

### 2. 启动服务

```bash
docker compose --env-file .docker.env up -d --build
```

### 3. 查看配置结果

```bash
docker compose --env-file .docker.env config
```

### 4. 停止服务

```bash
docker compose --env-file .docker.env down
```

### Compose 挂载目录

- `./data -> /app/data`
- `./logs -> /app/logs`
- `./cache-office -> /app/cache-office`
- `./storage -> /www/wwwroot`

## 其他运行方式

除了本地直接运行和 Docker Compose 之外，也可以只运行编译后的服务端产物：

```bash
npm run build
npm run build:server
node server-dist/index.js
```

这种方式适合：

- 已有现成进程管理器，如 `pm2`、`systemd`
- 想把镜像构建放在外部 CI/CD 中处理
- 需要自行接入反向代理或现有运维体系

## 主要使用方式

### 普通用户

1. 打开首页
2. 使用飞书登录
3. 进入工作台后浏览文件、上传文件、上传文件夹
4. 对文件或文件夹创建分享链接
5. 通过分享页向外分发资源

### 管理员

1. 首页使用管理员账号登录
2. 进入后台面板
3. 在“设置”页维护飞书、ngrok、存储和界面配置
4. 在“监控”页查看服务状态、依赖检查、日志与重启提示

## 认证说明

- 默认登录方式：飞书
- 兜底登录方式：本地管理员
- 管理员默认账号名由 `MAGUS_ADMIN_USERNAME` 控制
- 管理员密码由 `MAGUS_ADMIN_PASSWORD` 控制

请在真实环境中务必修改默认管理员密码。

## 测试与校验

### 单元与集成测试

```bash
npm test
```

### 前端构建

```bash
npm run build
```

### 服务端构建

```bash
npm run build:server
```

### Docker Compose 配置校验

```bash
docker compose --env-file .docker.env config
```

## 常见问题

### 1. 飞书登录后跳转地址不对

请检查下面两项是否区分正确：

- `MAGUS_PUBLIC_APP_URL`
- `MAGUS_PUBLIC_API_URL`

同时确认飞书开放平台后台填写的回调地址是否为：

```text
${MAGUS_PUBLIC_API_URL}/api/auth/feishu/callback
```

### 2. Docker Compose 读取 `.env` 失败

如果你的仓库根目录已有非标准 `.env` 文件，请优先显式指定：

```bash
docker compose --env-file .docker.env up -d --build
```

### 3. Office 预览不完整

请确认运行环境已安装 LibreOffice，并且容器或主机内可执行 `soffice`。

## 部署建议

- 生产环境务必修改管理员密码与会话密钥
- 建议通过反向代理统一暴露公网地址
- 建议将 `data/`、`logs/`、`storage/` 作为持久化目录长期保留
- 飞书与 ngrok 配置变更后，后台会标记“需要重启服务”

## 许可证

如果你准备对外分发或商用，请根据你的实际项目需求补充许可证说明。
