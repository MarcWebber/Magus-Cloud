# Magus Cloud 功能说明书

## 1. 系统说明

Magus Cloud 面向内部文件管理场景，系统由前端工作台、后台管理接口、文件服务、备份与巡检能力组成。

## 2. 用户功能

### 2.1 登录与会话

- 用户可通过飞书登录进入系统
- 管理员可通过管理员登录进入后台
- 系统提供会话查询与退出登录能力

### 2.2 文件管理

- 查询文件列表：`GET /api/files`
- 上传文件：`POST /api/upload`
- 上传文件夹：`POST /api/upload-folder`
- 创建目录：`POST /api/create-folder`
- 下载文件：`GET /api/download`
- 删除文件或目录：`POST /api/delete`
- 查询空间使用量：`GET /api/usage`

### 2.3 文件预览

- 预览接口：`GET /api/preview`
- 已实现预览类型包括：
  - 文本
  - 图片
  - PDF
  - Word
  - Excel
  - PowerPoint

### 2.4 分享功能

- 创建分享：`POST /api/share/create`
- 查询分享列表：`GET /api/share/list`
- 删除分享：`DELETE /api/share/:shareId`
- 查询分享信息：`GET /api/share/info/:shareId`

## 3. 管理功能

### 3.1 系统配置

- 查询系统设置：`GET /api/admin/settings`
- 更新系统设置：`PUT /api/admin/settings`

### 3.2 服务配置

- 查询服务配置：`GET /api/admin/service-config`
- 更新服务配置：`PUT /api/admin/service-config`

### 3.3 云配置

- 查询云配置：`GET /api/admin/cloud-config`
- 更新云配置：`PUT /api/admin/cloud-config`

### 3.4 状态与日志

- 查询综合状态：`GET /api/admin/status`
- 查询集群状态：`GET /api/admin/cluster/status`
- 查询存储状态：`GET /api/admin/storage/status`
- 查询备份列表：`GET /api/admin/backup/list`
- 查询日志：`GET /api/admin/logs`

## 4. 备份与迁移功能

- 创建站点快照：`POST /api/admin/backup/create`
- 导出用户数据：`POST /api/admin/migration/export-user`
- 导入用户数据：`POST /api/admin/migration/import-user`

## 5. 公共接口

- 健康检查：`GET /api/health`
- 网关检查：`GET /api/health/gateway`
- 公共界面配置：`GET /api/app-config`
- 帮助文档：`GET /api/help`
- 飞书回调兼容入口：`GET /api/feishu-callback`

## 6. 运行时帮助

系统运行时内置以下帮助文档：

- `docs/user-guide.md`
- `docs/admin-guide.md`

系统通过 `/api/help` 提供帮助文档内容，并通过 `/help-assets` 提供截图资源。
