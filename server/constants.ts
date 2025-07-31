export const allowed_name_list: string[] = [
    'beijia', 'houruichao', 'heyunqing', 'xuboyue',
    'yufan', 'zhangbeibei', 'lixingyuan', 'xuyi',
    'hujunchi', 'liuxiaoxu', 'lizhi', 'wangshuo',
    'hairina', 'caohanxi', 'caojiaqi', 'motong',
    'wangzhaodong', 'xuzihao', 'chensheng', 'zhangwei',
    'jiangwenqin', 'liusaesai', 'zhangaiyan'
];

export const current_name_set = new Set<string>();
export const JWT_SECRET = 'Xkw20021114'
export const JWT_EXPIRATION = 2*60*60; // Token 过期时间
export const JWT_EXPIRATION_MS = JWT_EXPIRATION * 1000; // Token 过期时间（毫秒）