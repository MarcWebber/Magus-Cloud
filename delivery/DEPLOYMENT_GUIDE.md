# Magus Cloud 部署说明

## 1. 部署文件

项目提供以下部署文件：

- `Dockerfile`
- `docker-compose.yml`
- `deploy/cluster/app-node.compose.yml`
- `deploy/cluster/gateway.compose.yml`
- `deploy/cluster/postgres.compose.yml`
- `deploy/cluster/cloud.config.example.json`

## 2. 本地运行

```bash
npm install
copy .env.example .env
npm run build
npm run build:server
node server-dist/index.js
```

默认访问地址：

```text
http://localhost:3000
```

## 3. Docker Compose 部署

```bash
docker compose up -d --build
```

### 3.1 服务构成

- `app`：应用服务
- `postgres`：元数据数据库
- `ngrok`：外部映射服务

### 3.2 卷映射

- `./data:/app/data`
- `./logs:/app/logs`
- `./config:/app/config`
- `./storage:/www/wwwroot`

## 4. 关键环境变量

- `MAGUS_DATABASE_URL`
- `MAGUS_STORAGE_ROOT`
- `MAGUS_SERVICE_CONFIG`
- `MAGUS_CLOUD_CONFIG`
- `MAGUS_ADMIN_USERNAME`
- `MAGUS_ADMIN_PASSWORD`
- `MAGUS_SESSION_SECRET`
- `MAGUS_PUBLIC_APP_URL`
- `MAGUS_PUBLIC_API_URL`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `NGROK_AUTHTOKEN`

## 5. 运行依赖

Docker 运行镜像基于 `node:20-bookworm-slim`，运行时安装以下关键依赖：

- LibreOffice
- curl
- fonts-dejavu

## 6. 集群部署说明

`deploy/cluster/` 提供共享存储模式的部署示例。部署时应满足以下要求：

- 应用节点使用统一数据库
- 应用节点使用统一共享存储
- 每个节点设置唯一 `MAGUS_NODE_ID`
- 各节点加载一致的配置文件

## 7. 部署后检查

- 访问首页确认应用可用
- 调用 `/api/health`
- 调用 `/api/health/gateway`
- 管理员登录后台
- 执行至少一项运维检查脚本
