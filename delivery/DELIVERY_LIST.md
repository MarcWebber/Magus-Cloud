# Magus Cloud 交付物清单

## 1. 正式交付文档

| 序号 | 文件 | 说明 |
| --- | --- | --- |
| 1 | `delivery/README_DELIVERY.md` | 交付包目录说明 |
| 2 | `delivery/DELIVERY_LIST.md` | 交付物总清单 |
| 3 | `delivery/ACCEPTANCE_REPORT.md` | 项目验收报告 |
| 4 | `delivery/FUNCTION_SPEC.md` | 功能说明书 |
| 5 | `delivery/TECHNICAL_SOLUTION.md` | 技术方案与选型说明 |
| 6 | `delivery/TEST_SPECIFICATION.md` | 测试文档 |
| 7 | `delivery/TEST_REPORT.md` | 测试报告 |
| 8 | `delivery/DEPLOYMENT_GUIDE.md` | 部署说明 |
| 9 | `delivery/OPS_AND_DR_GUIDE.md` | 运维、备份与容灾说明 |
| 10 | `delivery/OPEN_SOURCE_AND_COPYRIGHT.md` | 开源许可证与版权说明 |

## 2. 源代码交付物

| 序号 | 路径 | 说明 |
| --- | --- | --- |
| 1 | `src/` | 前端源代码 |
| 2 | `server/` | 后端源代码 |
| 3 | `public/` | 静态资源 |
| 4 | `scripts/` | 脚本文件 |

## 3. 构建与依赖文件

| 序号 | 路径 | 说明 |
| --- | --- | --- |
| 1 | `package.json` | 依赖与脚本定义 |
| 2 | `package-lock.json` | 依赖锁定文件 |
| 3 | `tsconfig.json` | TypeScript 构建配置 |
| 4 | `tsconfig.server.json` | 服务端 TypeScript 构建配置 |
| 5 | `vite.config.ts` | Vite 构建配置 |
| 6 | `vitest.config.ts` | Vitest 配置 |
| 7 | `playwright.config.ts` | Playwright 配置 |

## 4. 部署交付物

| 序号 | 路径 | 说明 |
| --- | --- | --- |
| 1 | `Dockerfile` | 容器镜像构建文件 |
| 2 | `docker-compose.yml` | 单机 Docker Compose 部署文件 |
| 3 | `deploy/cluster/app-node.compose.yml` | 应用节点示例编排文件 |
| 4 | `deploy/cluster/gateway.compose.yml` | 网关示例编排文件 |
| 5 | `deploy/cluster/postgres.compose.yml` | 数据库示例编排文件 |
| 6 | `deploy/cluster/cloud.config.example.json` | 集群配置示例 |
| 7 | `deploy/cluster/README.md` | 集群部署示例说明 |

## 5. 配置与运行期文件

| 序号 | 路径 | 说明 |
| --- | --- | --- |
| 1 | `config/magus.config.json` | 主配置文件 |
| 2 | `config/cloud.config.json` | 云配置文件 |
| 3 | `.env.example` | 环境变量示例 |
| 4 | `.docker.env.example` | Docker 环境变量示例 |

## 6. 测试交付物

| 序号 | 路径 | 说明 |
| --- | --- | --- |
| 1 | `server/app.test.ts` | 服务端集成测试 |
| 2 | `server/lib/cloud/config.test.ts` | 配置测试 |
| 3 | `server/lib/platform/backup.test.ts` | 备份测试 |
| 4 | `src/features/auth/pages/LoginPage.test.tsx` | 登录页测试 |
| 5 | `src/features/admin/pages/AdminPage.test.tsx` | 管理页测试 |
| 6 | `src/features/files/pages/DashboardPage.test.tsx` | 文件工作台测试 |
| 7 | `tests/e2e/smoke.spec.ts` | 端到端冒烟测试 |
| 8 | `tests/e2e/docs-screenshots.spec.ts` | 截图采集测试 |
| 9 | `tests/ops/` | 运维检查脚本 |

## 7. 帮助文档与许可证

| 序号 | 路径 | 说明 |
| --- | --- | --- |
| 1 | `docs/user-guide.md` | 运行时用户手册 |
| 2 | `docs/admin-guide.md` | 运行时管理员手册 |
| 3 | `docs/assets/` | 帮助手册截图资源 |
| 4 | `LICENSE` | MIT 许可证 |
