# Magus Cloud 运维、备份与容灾说明

## 1. 运维检查接口

系统提供以下运行检查接口：

- `GET /api/health`
- `GET /api/health/gateway`
- `GET /api/admin/status`
- `GET /api/admin/cluster/status`
- `GET /api/admin/storage/status`
- `GET /api/admin/backup/list`
- `GET /api/admin/logs`

## 2. 运维检查脚本

项目内置以下检查脚本：

```bash
npm run ops:health
npm run ops:gateway
npm run ops:storage
npm run ops:backup
npm run ops:nodes
npm run ops:user-export
npm run ops:help -- --audience admin
```

## 3. 备份机制

系统已实现以下备份相关能力：

- 站点快照归档
- 元数据导出
- 用户目录导出
- 备份清单生成
- 备份校验和记录
- 备份保留数量控制

相关配置位于 `config/magus.config.json` 的 `backup` 节点。

## 4. 用户迁移

系统提供以下迁移能力：

- 用户导出
- 用户导入
- Dry Run 导入预检

相关接口如下：

- `POST /api/admin/migration/export-user`
- `POST /api/admin/migration/import-user`

## 5. 容灾说明

### 5.1 数据层

- 元数据存储于 PostgreSQL
- 站点快照可导出元数据与文件归档

### 5.2 存储层

- 用户文件存放于共享目录
- 容灾前提是共享存储目录可恢复

### 5.3 应用层

- 应用镜像可通过 Dockerfile 重新构建
- Compose 与集群部署文件可用于重建运行环境

## 6. 恢复说明

### 6.1 站点恢复

站点恢复应基于以下材料：

- 应用镜像或源码
- 配置文件
- PostgreSQL 数据
- 存储目录数据
- 备份归档

### 6.2 用户恢复

用户恢复可通过用户导入接口将归档内容恢复到目标用户名目录。

## 7. 日志与排障

日志目录为：

- `logs/`

运维排障优先核查以下内容：

- 数据库连通性
- 存储目录可访问性
- 节点在线状态
- 配置文件有效性
- 帮助文档文件存在性
