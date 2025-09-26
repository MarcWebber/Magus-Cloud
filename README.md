# 使用Vite构建
```bash
cd ftp-admin-panel
npm install
```

# 构建express
```bash
npm install --save-dev typescript ts-node @types/node @types/express
```

# 多环境
目前开发分为dev环境以及prod环境，启动命令分别为

使用多环境首先需要安装cross-env，从而确保跨平台兼容
```python
npm install --save-dev cross-env 
```
```python
npm run start # prod环境
npm run dev # dev环境
```
dev环境会跳过部分初始化内容，以此来保证windows下也能正确启动，可用于快速调试

# 开发环境及用户
- 开发环境默认用户test / test
- 注册接口测试可使用 register 用户
- 磁盘用量展示仅仅为测试数据，用于调试UI

# Fallback
所有的文件上传路径，如果用户名不存在，则会fallback到default路径下面

# 更新计划
- 2025.7.29 完成文件数展示
- 2025.7.29 添加页面header
- 2025.7.29 添加上传完成后下载链接的弹窗
- 2025.7.29 添加文件上传进度条和速度展示

# 飞书验证
## 本地
由于飞书验证需要配置公网地址，因此本地调试需要使用ngrok等工具进行内网穿透
```bash
ngrok config add-authtoken XXX
```


## 线上
待定如何线上部署

# 环境配置
所有的基础环境配置在.env中，需要按情况修改