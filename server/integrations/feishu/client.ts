import {getSystemSettings} from '../../lib/config/store';

interface FeishuUserProfile {
    username: string;
    avatarUrl?: string;
}

interface FeishuApiResponse {
    code?: number;
    msg?: string;
    [key: string]: unknown;
}

function assertFeishuOk(payload: FeishuApiResponse, fallbackMessage: string) {
    if (typeof payload.code === 'number' && payload.code !== 0) {
        const message = payload.msg ? `${fallbackMessage}: ${payload.msg}` : fallbackMessage;
        throw new Error(message);
    }
}

export function buildFeishuLoginUrl() {
    const settings = getSystemSettings();
    const callbackUrl = settings.feishu.redirectUri;

    return `https://open.feishu.cn/open-apis/authen/v1/index?app_id=${settings.feishu.appId}&redirect_uri=${encodeURIComponent(callbackUrl)}`;
}

export async function exchangeCodeForFeishuUser(code: string): Promise<FeishuUserProfile> {
    const settings = getSystemSettings();

    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            app_id: settings.feishu.appId,
            app_secret: settings.feishu.appSecret,
        }),
    });

    if (!tokenResponse.ok) {
        throw new Error('获取飞书应用访问令牌失败');
    }

    const tokenData = await tokenResponse.json() as FeishuApiResponse & {app_access_token?: string};
    assertFeishuOk(tokenData, '获取飞书应用访问令牌失败');

    if (!tokenData.app_access_token) {
        throw new Error('缺少飞书应用访问令牌');
    }

    const userResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/access_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenData.app_access_token}`,
        },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: settings.feishu.redirectUri,
        }),
    });

    if (!userResponse.ok) {
        throw new Error('获取飞书用户令牌失败');
    }

    const userData = await userResponse.json() as FeishuApiResponse & {
        data?: {
            en_name?: string;
            name?: string;
            avatar_url?: string;
        };
    };
    assertFeishuOk(userData, '获取飞书用户令牌失败');

    const username = userData.data?.en_name || userData.data?.name;

    if (!username) {
        throw new Error('未获取到飞书用户名');
    }

    return {
        username,
        avatarUrl: userData.data?.avatar_url,
    };
}
