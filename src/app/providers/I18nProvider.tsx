import {createContext, ReactNode, useContext, useMemo, useState} from 'react';

type Locale = 'zh-CN' | 'en-US';
type MessageCatalog = Record<string, string>;

const messages: Record<Locale, MessageCatalog> = {
    'zh-CN': {
        'app.loading': '正在加载...',
        'app.brandSubtitle': '统一运维，稳定交付',
        'app.shell.dashboardTitle': '云端工作台',
        'app.shell.dashboardSubtitle': '浏览文件、上传资源，并集中管理分享链接。',
        'app.shell.adminTitle': '运维后台',
        'app.shell.adminSubtitle': '集中管理飞书、ngrok 与系统运行状态。',
        'app.menu.files': '文件管理',
        'app.menu.admin': '后台面板',
        'app.session.admin': '管理员会话',
        'app.session.feishu': '飞书会话',
        'app.logout': '退出登录',

        'login.heroTitle': '围绕文件、认证与部署重新整理的统一控制台。',
        'login.heroDescription': '默认通过飞书登录，保留最小化的管理员兜底入口，并在一个后台中集中维护运行配置与监控信息。',
        'login.alert': '当前版本统一使用 httpOnly Cookie 会话，敏感操作仅对管理员开放。',
        'login.title': '登录',
        'login.description': '飞书是默认登录方式。本地管理员登录仅用于紧急运维场景。',
        'login.feishu': '使用飞书登录',
        'login.adminDivider': '管理员应急入口',
        'login.adminUsername': '管理员账号',
        'login.adminPassword': '管理员密码',
        'login.adminUsernameRequired': '请输入管理员账号',
        'login.adminPasswordRequired': '请输入管理员密码',
        'login.adminSubmit': '以管理员身份登录',
        'login.adminFailed': '管理员登录失败',

        'files.personalUsage': '个人用量',
        'files.totalUsed': '总已用空间',
        'files.totalFree': '剩余可用空间',
        'files.tabFiles': '文件',
        'files.tabShares': '分享',
        'files.uploadFile': '上传文件',
        'files.uploadFolder': '上传文件夹',
        'files.refresh': '刷新',
        'files.searchPlaceholder': '搜索当前目录',
        'files.rootBreadcrumb': '全部文件',
        'files.tableName': '名称',
        'files.tableSize': '大小',
        'files.tableModified': '修改时间',
        'files.tableActions': '操作',
        'files.preview': '预览',
        'files.download': '下载',
        'files.share': '分享',
        'files.deleteConfirm': '确认删除该资源吗？',
        'files.emptyFolder': '当前目录暂无文件',
        'files.emptyShares': '暂无有效分享',
        'files.copyLink': '复制链接',
        'files.revoke': '取消分享',
        'files.revokeConfirm': '确认取消这个分享吗？',
        'files.topUsers': '空间占用排行',
        'files.uploadSuccess': '上传完成',
        'files.uploadFailed': '上传失败',
        'files.deleteSuccess': '删除成功',
        'files.loadFailed': '加载工作台失败',
        'files.revokeSuccess': '分享已取消',
        'files.copySuccess': '已复制到剪贴板',
        'files.noTopUsers': '暂时没有统计数据',
        'files.fileType.file': '文件',
        'files.fileType.folder': '文件夹',

        'shareDialog.title': '创建分享',
        'shareDialog.resource': '资源',
        'shareDialog.expiresIn': '有效期',
        'shareDialog.expire.1': '1 天',
        'shareDialog.expire.7': '7 天',
        'shareDialog.expire.30': '30 天',
        'shareDialog.expire.0': '永不过期',
        'shareDialog.generate': '生成链接',
        'shareDialog.shareUrl': '分享地址',
        'shareDialog.accessCode': '提取码',
        'shareDialog.copyBoth': '复制链接和提取码',
        'shareDialog.createFailed': '创建分享失败',

        'publicShare.title': '共享资源',
        'publicShare.notFound': '分享不存在或已失效',
        'publicShare.expiresAt': '到期时间：{time}',
        'publicShare.accessCode': '提取码',
        'publicShare.download': '下载',

        'admin.tabSettings': '设置',
        'admin.tabMonitoring': '监控',
        'admin.authTitle': '认证设置',
        'admin.feishuTitle': '飞书配置',
        'admin.ngrokTitle': 'ngrok 配置',
        'admin.uiStorageTitle': '界面与存储',
        'admin.cookieName': 'Cookie 名称',
        'admin.sessionTtl': '会话有效期（秒）',
        'admin.adminUsername': '管理员账号',
        'admin.adminFallback': '启用管理员兜底登录',
        'admin.feishuEnabled': '启用飞书登录',
        'admin.feishuAppId': '应用 ID',
        'admin.feishuAppSecret': '应用密钥',
        'admin.feishuAppUrl': '前端访问地址',
        'admin.feishuCallbackUrl': '飞书回调服务地址',
        'admin.feishuAppUrlHelp': '登录成功后将跳转到该地址下的 `/dashboard`。',
        'admin.feishuCallbackUrlHelp': '飞书开放平台回调地址应配置为该地址下的 `/api/auth/feishu/callback`。',
        'admin.ngrokEnabled': '启用 ngrok',
        'admin.ngrokApiUrl': 'API 地址',
        'admin.ngrokAuthtoken': '认证令牌',
        'admin.ngrokDomain': '绑定域名',
        'admin.ngrokTunnelName': '隧道名称',
        'admin.ngrokAddr': '目标地址',
        'admin.appName': '应用名称',
        'admin.supportUrl': '支持链接',
        'admin.storageRoot': '正式存储根目录',
        'admin.devStorageRoot': '开发存储根目录',
        'admin.save': '保存设置',
        'admin.restartRequired': '需要重启服务',
        'admin.loadFailed': '加载后台失败',
        'admin.saveFailed': '保存设置失败',
        'admin.saveSuccess': '设置已保存，服务需要重启后生效。',
        'admin.application': '应用信息',
        'admin.runtime': '运行环境',
        'admin.ngrokStatus': 'ngrok 状态',
        'admin.logs': '最近日志',
        'admin.appInfo.name': '名称',
        'admin.appInfo.version': '版本',
        'admin.appInfo.environment': '环境',
        'admin.appInfo.uptime': '运行时长',
        'admin.runtime.storageRoot': '存储根目录',
        'admin.runtime.storageMounted': '存储是否挂载',
        'admin.runtime.libreOffice': 'LibreOffice',
        'admin.runtime.purePw': 'pure-pw',
        'admin.ngrok.connected': '连接状态',
        'admin.ngrok.publicUrl': '公网地址',
        'admin.ngrok.restartRequired': '是否需要重启',
        'admin.refreshStatus': '刷新状态',
        'admin.noLogs': '暂无日志内容。',
        'admin.yes': '是',
        'admin.no': '否',
        'admin.available': '可用',
        'admin.missing': '缺失',
        'admin.connected': '已连接',
        'admin.disconnected': '未连接',
        'admin.notAvailable': '暂无',

        'preview.failed': '预览失败',

        'api.requestFailed': '请求失败，状态码：{status}',
        'api.uploadFailed': '上传失败',
        'api.networkError': '网络异常',
    },
    'en-US': {},
};

type I18nContextValue = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(template: string, params?: Record<string, string | number>) {
    if (!params) {
        return template;
    }

    return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export function I18nProvider({children}: {children: ReactNode}) {
    const [locale, setLocale] = useState<Locale>('zh-CN');

    const value = useMemo<I18nContextValue>(() => ({
        locale,
        setLocale,
        t: (key, params) => {
            const catalog = messages[locale] || messages['zh-CN'];
            const fallback = messages['zh-CN'][key] || key;
            return interpolate(catalog[key] || fallback, params);
        },
    }), [locale]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
    const value = useContext(I18nContext);
    if (!value) {
        throw new Error('useI18n 必须在 I18nProvider 内使用');
    }
    return value;
}
