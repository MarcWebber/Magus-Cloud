# Magus Cloud

Magus Cloud 是一个面向团队内部文件管理与共享场景的私有化文件服务系统，提供用户登录、文件上传下载、目录管理、在线预览、文件分享、管理员配置维护、健康检查、备份与用户迁移等能力。

## 已实现能力

- 管理员登录与飞书登录
- 文件列表查询、文件上传、文件夹上传、目录创建、文件删除、文件下载
- 文本、图片、PDF、Word、Excel、PowerPoint 文件预览
- 文件分享创建、分享列表查询、公开分享访问、分享删除
- 管理后台系统设置、服务配置、云配置维护
- 健康检查、网关检查、存储状态检查、节点状态查看
- 站点快照备份、用户导出、用户导入
- 内置用户手册与管理员手册

## 技术栈

- 前端：React 19、TypeScript、Vite、Ant Design
- 后端：Node.js、Express 5、TypeScript
- 元数据存储：PostgreSQL
- 文件存储：共享目录
- 自动化测试：Vitest、Testing Library、Playwright、运维检查脚本
- 部署方式：Docker、Docker Compose

## 快速启动

### 本地运行

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

### Docker Compose

```bash
docker compose up -d --build
```

## 关键配置

### 环境变量

- `MAGUS_DATABASE_URL`
- `MAGUS_ADMIN_USERNAME`
- `MAGUS_ADMIN_PASSWORD`
- `MAGUS_SESSION_SECRET`
- `MAGUS_PUBLIC_APP_URL`
- `MAGUS_PUBLIC_API_URL`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `NGROK_AUTHTOKEN`

### 配置文件

- `config/magus.config.json`
- `config/cloud.config.json`

## 测试命令

```bash
npm test
npm run test:e2e
npm run ops:health
npm run ops:gateway
npm run ops:storage
npm run ops:backup
npm run ops:nodes
npm run ops:user-export
npm run ops:help -- --audience admin
```

## 交付入口

- [交付包说明](delivery/README_DELIVERY.md)
- [交付物清单](delivery/DELIVERY_LIST.md)

## 许可证

本项目采用 MIT License，详见 [LICENSE](LICENSE)。
