import fs from "fs";
import logger from "../logger";

export async function getDirectorySize(userDir){
    try {
        const files = fs.readdirSync(userDir).map(
            (name)=>{
                const stat = fs.statSync(`${userDir}/${name}`);
                return {size: stat.size, name};
            }
        )
        logger.info(`获取目录大小：${userDir}，文件数量：${files.length}`);
        // total size in bytes
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        logger.info(`目录大小：${totalSize} 字节`);
        // return size in MB
        return totalSize / (1024); // 转换为 KB

    }catch (err) {
        logger.error(`获取目录大小失败：${err.message}`);
        return 0;
    }
}