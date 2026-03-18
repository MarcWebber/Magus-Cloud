# Shared-Storage Cluster Example

- `postgres.compose.yml`: 元数据库。
- `app-node.compose.yml`: 无状态应用节点样例，所有节点挂同一份 `cloud.config.json` 和共享存储。
- `gateway.compose.yml`: 网关层入口样例。
- `cloud.config.example.json`: 共享存储模式下的配置模板。

建议流程：

1. 先启动 PostgreSQL。
2. 准备共享存储和备份目录。
3. 复制 `cloud.config.example.json` 为实际配置并同步到所有应用节点。
4. 按节点修改 `MAGUS_NODE_ID` 后启动多台应用节点。
5. 在网关层把流量转发到所有应用节点。
