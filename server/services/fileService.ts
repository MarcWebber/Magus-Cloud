// import fs from "fs";
// import logger from "../logger";

// export async function getDirectorySize(userDir){
//     try {
//         const files = fs.readdirSync(userDir).map(
//             (name)=>{
//                 const stat = fs.statSync(`${userDir}/${name}`);
//                 return {size: stat.size, name};
//             }
//         )
//         logger.info(`获取目录大小：${userDir}，文件数量：${files.length}`);
//         // total size in bytes
//         const totalSize = files.reduce((sum, file) => sum + file.size, 0);
//         logger.info(`目录大小：${totalSize} 字节`);
//         // return size in MB
//         return totalSize / (1024); // 转换为 KB

//     }catch (err) {
//         logger.error(`获取目录大小失败：${err.message}`);
//         return 0;
//     }
// }

import fs from "fs";
import path from "path"; // 🚀 引入 path 模块用于安全路径拼接
import logger from "../logger";

/**
 * 递归计算给定目录的总大小（字节）。
 * 注意：由于使用了同步 FS API，此函数在主线程中运行时会阻塞。
 * @param {string} userDir 目录路径
 * @returns {number} 目录的总大小（字节）
 */
export function getDirectorySize(userDir) {
// 🚨 移除 async 关键字，因为它只包含同步操作
    let totalSize = 0;

    try {
        // 使用 withFileTypes: true 以便检查 entry 类型
        const entries = fs.readdirSync(userDir, { withFileTypes: true });

        for (const entry of entries) {
            // 🚀 修正：使用 path.join 确保路径兼容性
            const fullPath = path.join(userDir, entry.name);

            if (entry.isFile()) {
                // 如果是文件，累加文件大小
                const stat = fs.statSync(fullPath);
                totalSize += stat.size;
            } else if (entry.isDirectory()) {
                // 🚀 修正：递归调用自身，并累加子目录的总大小
                // 确保排除隐藏目录，避免读取 .git 等系统目录
                if (!entry.name.startsWith('.')) {
                    totalSize += getDirectorySize(fullPath); 
                }
            }
            // 忽略其他类型（如符号链接等）
        }

        logger.info(`获取目录大小：${userDir}，总字节数：${totalSize}`);
        
        // 🚀 修正：统一返回字节数 (Bytes)，让调用者（路由）使用 formatBytes 格式化
        return totalSize; 

    } catch (err) {
        // 捕获权限或读取错误
        logger.error(`获取目录大小失败，路径：${userDir}，错误信息：${err.message}`);
        return 0;
    }
}