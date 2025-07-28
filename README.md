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