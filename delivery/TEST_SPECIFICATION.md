# Magus Cloud 测试文档

## 1. 文档目的

本文件用于说明本项目测试范围、测试对象、测试方法、测试步骤与验收标准。

## 2. 测试范围

本次测试范围包括：

- 登录与会话管理
- 文件管理
- 文件预览
- 文件分享
- 管理后台配置维护
- 健康检查与状态查询
- 备份与用户迁移
- 帮助文档读取

## 3. 测试资产

### 3.1 自动化测试

- `server/app.test.ts`
- `server/lib/cloud/config.test.ts`
- `server/lib/platform/backup.test.ts`
- `src/features/auth/pages/LoginPage.test.tsx`
- `src/features/admin/pages/AdminPage.test.tsx`
- `src/features/files/pages/DashboardPage.test.tsx`
- `tests/e2e/smoke.spec.ts`
- `tests/e2e/docs-screenshots.spec.ts`

### 3.2 运维检查脚本

- `tests/ops/health-check.mjs`
- `tests/ops/gateway-check.mjs`
- `tests/ops/storage-check.mjs`
- `tests/ops/backup-check.mjs`
- `tests/ops/node-check.mjs`
- `tests/ops/user-export-check.mjs`
- `tests/ops/help.mjs`

## 4. 主要测试项

### 4.1 登录与权限

- 管理员登录成功
- 会话查询成功
- 退出登录成功
- 未授权访问后台接口被拒绝

### 4.2 文件管理

- 文件列表读取成功
- 文件上传成功
- 文件夹上传成功
- 目录创建成功
- 文件或目录删除成功
- 文件下载成功
- 非法路径被拒绝
- 超配额上传被拒绝

### 4.3 文件预览

- 文本文件预览
- 图片文件预览
- PDF 文件预览
- Word 文件预览
- Excel 文件预览
- PowerPoint 文件预览

### 4.4 分享功能

- 创建分享成功
- 查询分享列表成功
- 查询分享信息成功
- 删除分享成功

### 4.5 管理功能

- 系统设置查询与更新
- 服务配置查询与更新
- 云配置查询与更新
- 节点状态、存储状态、备份列表、日志查询

### 4.6 备份与迁移

- 站点快照创建
- 用户导出
- 用户导入 Dry Run

## 5. 测试命令

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

## 6. 验收标准

- 测试代码与运维检查脚本完整存在
- 功能点与接口定义与源码一致
- 运行时帮助文档可读取
- 部署文件、配置文件与测试文档一致
- 测试执行结论以 `TEST_REPORT.md` 为准
