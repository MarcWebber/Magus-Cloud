Magus Cloud 结题前文档休整与改进梳理计划
Summary
以 README.md 为唯一主文档，按“开发交接可用，同时能支撑结题报告引用”的方向重组内容。
这轮不改业务能力边界，不新增运行时接口；重点是把“当前能力、可配置项、部署验证、已知改进点”讲清楚，并让文档内容与代码现状一致。

Key Changes
重写 README 顶部结构，收敛为：项目简介、核心能力、架构概览、部署方式、配置总表、测试验证、后续优化建议。
新增“配置总表”章节，以 server/lib/config/types.ts 为准，明确三类配置：
环境变量启动项：NODE_ENV、MAGUS_ADMIN_PASSWORD、MAGUS_SESSION_SECRET、MAGUS_DATA_DIR、各类 MAGUS_* / FEISHU_* / NGROK_*
后台可维护且会持久化到 data/system-settings.json 的项：认证、飞书、ngrok、存储、UI
当前未完全配置化或仍是实现约束的项：端口固定为 3000、部分品牌文案硬编码、旧 Cookie 兼容逻辑
在 README 中显式标注“哪些配置改完需要重启服务”，与后台 restartRequired 语义保持一致。
新增“当前可配置能力说明”小节，点明已经打通的配置能力：
会话 Cookie 名称、TTL、管理员兜底开关、管理员用户名
飞书启停与回调基地址
ngrok 启停与隧道参数
存储根目录、开发存储目录、用户配额
应用名称、支持链接
新增“已知问题与后续优化”章节，按结题报告可直接复用的口径整理为 4 组：
安全加固：清理 server/constants.ts 中硬编码密钥/名单思路，避免默认密钥回退，避免敏感配置被提交
配置贯通：appName、supportUrl 等 UI 配置尚未覆盖全部展示位，管理员登录入口与开关联动不完整
架构收口：旧 server/routes/* 与旧 src/pages/*/旧组件残留，建议后续统一到当前 modules + features 结构
文案与国际化：修复部分中文乱码/未收口文本，统一错误文案与 i18n 来源
在 README 的“测试验证”里写入当前已验证结果：npm test 已通过，覆盖管理员登录/设置更新/健康检查、路径穿越防护、分享与预览、配额限制、主要前端页面渲染。
Test Plan
校对 README 中所有命令、路径、环境变量名称与仓库现状一致。
逐项核对 .env.example、.docker.env.example、docker-compose.yml、SystemSettings 类型定义，确保文档无遗漏、无命名漂移。
保留并更新测试章节中的实际验证结论，明确当前测试通过范围，不虚构未执行的 e2e 或部署验证。
文档完成后做一次快速一致性检查：
登录与后台配置流程描述是否对应真实页面
Docker 挂载目录是否与 Compose 一致
配置分类是否能回答“哪里能配、改完是否需重启、存在哪里”
Public Interfaces
不修改现有 API、路由或类型定义。
README 会把现有 SystemSettings 配置面公开成文档接口，作为交接和结题的配置说明基线。
Assumptions
本轮产出只整理 README，不额外新增独立“结题说明”文件。
README 以中文为主，偏工程交接，但会保留一段可直接引用到结题报告的“成果与后续优化”表述。
对“可改进点”的处理以文档梳理为主，不在本轮直接改代码；真正实现留到退出 Plan Mode 后执行。