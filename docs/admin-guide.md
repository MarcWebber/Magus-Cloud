# Magus Cloud 管理员文档

![后台预览](/help-assets/admin-screen.png)

## 1. 管理员职责

管理员后台主要负责五类工作：

- 管理集群节点、网关地址和运行状态
- 配置容量、配额和空间分配策略
- 维护用户列表、`homeDir` 和启用状态
- 创建整站快照，执行用户导出与导入演练
- 查看依赖状态、操作事件、告警和系统日志

## 2. 登录与权限

管理员入口位于首页“去登录”按钮打开的登录层中，默认折叠在“管理员应急登录”区域内。

建议只在以下场景使用管理员应急登录：

- 首次初始化部署
- 飞书登录暂时不可用
- 排查运行异常
- 修改服务配置和容量策略

普通用户不应直接使用管理员入口。

## 3. 后台分区说明

后台首页按五组面板组织：

### 集群与网关

- 配置网关公网地址
- 维护节点列表、节点标签和启用状态
- 查看在线节点、存储挂载、数据库连通和最近心跳
- 查看当前配置版本和来源

### 容量与配额

- 维护共享存储根目录、总容量和保留空闲空间
- 设置默认用户配额
- 查看 `quotaMode`、`defaultSoftQuotaGb`、`defaultHardQuotaGb`
- 查看 `warningThresholdPercent` 与 `autoExpandEnabled`

说明：`oversell`、自动扩容、去重存储目前仍是配置预留，不改变真实上传限制。

### 用户与空间分配

- 维护 `username`
- 维护 `displayName`
- 维护 `homeDir`
- 维护 `quotaGb`
- 维护 `enabled`

### 备份与迁移

- 创建整站快照
- 导出单个用户数据
- 以 Dry Run 方式演练导入
- 在确认无误后执行正式导入

### 系统配置与告警

- 管理产品名称和帮助链接
- 管理 Cookie、Session TTL 和管理员应急登录开关
- 维护 Feishu 与 ngrok 的非敏感参数
- 查看依赖状态、事件和日志窗口

## 4. 主配置文件与写入规则

主配置文件固定为：

- `config/magus.config.json`

主要结构包括：

- `cluster`
- `storage`
- `users`
- `backup`
- `ui`
- `auth`
- `feishu`
- `ngrok`

运行规则：

- 服务启动时优先读取 `magus.config.json`
- 如果只存在旧的 `cloud.config.json`，系统会自动迁移
- 后台保存统一回写 `magus.config.json`

以下敏感值仍只来自环境变量，不在后台开放编辑：

- `MAGUS_ADMIN_PASSWORD`
- `MAGUS_SESSION_SECRET`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `NGROK_AUTHTOKEN`

## 5. 备份与迁移建议

### 整站快照

点击“创建整站快照”后，系统会生成：

- 共享存储归档
- 元数据导出
- Manifest
- 校验信息

### 用户导出

输入用户名后点击“导出用户”，系统会生成该用户的归档包。

### 用户导入

推荐先使用 Dry Run：

1. 填写归档路径
2. 填写目标用户名
3. 保持 Dry Run 开启
4. 校验通过后再执行正式导入

## 6. 常用排查路径

### 数据库异常

优先检查：

- `MAGUS_DATABASE_URL`
- PostgreSQL 是否正常启动
- `/api/health` 中的 `database.connected`

### 共享存储异常

优先检查：

- `storage.sharedRootDir`
- 挂载路径是否正确
- `/api/health` 中的 `storage.exists`

### 节点未上线

优先检查：

- 当前节点 `MAGUS_NODE_ID`
- 节点能否访问数据库
- 节点能否访问共享存储

### 用户无法登录

优先检查：

- 用户是否在主配置中存在
- 用户是否为 `enabled: true`
- Feishu 回调地址是否正确

## 7. 常用命令

```bash
npm run ops:health
npm run ops:gateway
npm run ops:storage
npm run ops:backup
npm run ops:nodes
npm run ops:user-export
npm run ops:help -- --audience admin
```

## 8. 帮助入口

![帮助抽屉预览](/help-assets/help-drawer.png)

- 首页右上角 `?`
- 用户工作台右上角 `?`
- 管理员后台右上角 `?`

管理员登录后，可以在帮助抽屉中切换“用户文档”和“管理员文档”。
