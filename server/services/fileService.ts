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
        return files.reduce((total, file) => total + file.size, 0);

    }catch (err) {
        logger.error(`获取目录大小失败：${err.message}`);
        return 0;
    }
}