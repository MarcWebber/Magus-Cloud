export function getUserInfo(): {
    msg: string;
    code: number;
    data: {
        tenant_key: string;
        open_id: string;
        avatar_big: string;
        avatar_thumb: string;
        avatar_middle: string;
        token_type: string;
        sid: string;
        access_token: string;
        refresh_token: string;
        avatar_url: string;
        refresh_expires_in: number;
        name: string;
        union_id: string;
        en_name: string;
        expires_in: number
    }
} {
    //  {"code":0,"data":{"access_token":"u-ddegSyjlFewbbR9Df8ATRG4g6.qQ518rVMw0k5402bHg","avatar_big":"https://s1-imfile.feishucdn.com/static-resource/v1/v3_00nv_4918dc33-e94e-4914-8ef4-d3c1d52
    // b6e2g~?image_size=640x640&cut_type=&quality=&format=image&sticker_format=.webp","avatar_middle":"https://s1-imfile.feishucdn.com/static-resource/v1/v3_00nv_4918dc33-e94e-4914-8ef4-d3c1d52b6e2g~?image_size=240x240&cut_type=&qual
    // ity=&format=image&sticker_format=.webp","avatar_thumb":"https://s1-imfile.feishucdn.com/static-resource/v1/v3_00nv_4918dc33-e94e-4914-8ef4-d3c1d52b6e2g~?image_size=72x72&cut_type=&quality=&format=image&sticker_format=.webp","av
    // atar_url":"https://s1-imfile.feishucdn.com/static-resource/v1/v3_00nv_4918dc33-e94e-4914-8ef4-d3c1d52b6e2g~?image_size=72x72&cut_type=&quality=&format=image&sticker_format=.webp","en_name":"徐子豪","expires_in":6900,"name":"徐
    // 子豪","open_id":"ou_f5fa3d48a3c02cf86739b0bb1461d7d6","refresh_expires_in":2591700,"refresh_token":"ur-fG3pdrM_p0G9O1ae81xZ4E4g6sWQ51wjogw05gk02fHk","sid":"AAAAAAAAAABoks8FWdZAAQ==","tenant_key":"2d9396a7f38f975d","token_type":"Bearer","union_id":"on_93c5a404f5cba5252ee8b64859866126"},"msg":"success"}
    return {
        "code": 0, "data": {
            "access_token": "u-ddegSyjlFewbbR9Df8ATRG4g6.qQ518rVMw0k5402bHg",
            "avatar_big": "https://s1-imfile.feishucdn.com/static-resource/v1/v3_00nv_4918dc33-e94e-4914-8ef4-d3c1d52b6e2g~?image_size=640x640&cut_type=&quality=&format=image&sticker_format=.webp",
            "avatar_middle": "https://s1-imfile.feishucdn.com/static-resource/v1/v3_00nv_4918dc33-e94e-4914-8ef4-d3c1d52b6e2g~?image_size=240x240&cut_type=&quality=&format=image&sticker_format=.webp",
            "avatar_thumb": "https://s1-imfile.feishucdn.com/static-resource/v1/v3_00nv_4918dc33-e94e-4914-8ef4-d3c1d52b6e2g~?image_size=72x72&cut_type=&quality=&format=image&sticker_format=.webp",
            "avatar_url": "https://s1-imfile.feishucdn.com/static-resource/v1/v3_00nv_4918dc33-e94e-4914-8ef4-d3c1d52b6e2g~?image_size=72x72&cut_type=&quality=&format=image&sticker_format=.webp",
            "en_name": "徐子豪",
            "expires_in": 6900,
            "name": "徐子豪",
            "open_id": "ou_f5fa3d48a3c02cf86739b0bb1461d7d6",
            "refresh_expires_in": 2591700,
            "refresh_token": "ur-fG3pdrM_p0G9O1ae81xZ4E4g6sWQ51wjogw05gk02fHk",
            "sid": "AAAAAAAAAABoks8FWdZAAQ==",
            "tenant_key": "2d9396a7f38f975d",
            "token_type": "Bearer",
            "union_id": "on_93c5a404f5cba5252ee8b64859866126"
        }, "msg": "success"
    }
}