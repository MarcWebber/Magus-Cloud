import {createContext, ReactNode, useContext, useEffect, useMemo, useState} from 'react';
import {useAppConfig} from './AppConfigProvider';

type Locale = 'zh-CN' | 'en-US';
type MessageCatalog = Record<string, string>;

const messages: Record<Locale, MessageCatalog> = {
    'zh-CN': {
        'app.loading': '正在加载中...',
        'app.menu.files': '文件工作台',
        'app.menu.admin': '后台面板',
        'app.session.admin': '管理员会话',
        'app.session.feishu': '飞书会话',
        'app.logout': '退出登录',
        'app.enterAdmin': '进入后台',
        'app.backToFiles': '返回文件工作台',
        'app.support': '帮助中心',
        'app.userShellSubtitle': '像网盘产品一样管理文件、分享与空间',
        'app.adminShellTitle': '运维控制台',
        'app.adminShellSubtitle': '集中查看节点、容量、备份与服务配置',

        'login.feishu': '使用飞书登录',
        'login.adminUsername': '管理员账号',
        'login.adminPassword': '管理员密码',
        'login.adminUsernameRequired': '请输入管理员账号',
        'login.adminPasswordRequired': '请输入管理员密码',
        'login.adminSubmit': '以管理员身份登录',
        'login.adminFailed': '管理员登录失败',

        'files.personalUsage': '个人已用空间',
        'files.totalUsed': '全局已用空间',
        'files.tabFiles': '文件',
        'files.tabShares': '分享',
        'files.uploadFile': '上传文件',
        'files.uploadFolder': '上传文件夹',
        'files.refresh': '刷新',
        'files.rootBreadcrumb': '全部文件',
        'files.tableName': '名称',
        'files.tableSize': '大小',
        'files.tableModified': '修改时间',
        'files.tableActions': '操作',
        'files.deleteConfirm': '当前版本删除为直接删除，不进入回收站。确认继续吗？',
        'files.emptyFolder': '当前目录还没有文件',
        'files.emptyShares': '还没有分享记录',
        'files.copyLink': '复制链接',
        'files.revoke': '取消分享',
        'files.revokeConfirm': '确认取消这条分享记录吗？',
        'files.uploadSuccess': '上传完成',
        'files.uploadFailed': '上传失败',
        'files.deleteSuccess': '删除成功',
        'files.loadFailed': '加载文件工作台失败',
        'files.revokeSuccess': '分享已取消',
        'files.copySuccess': '已复制到剪贴板',
        'files.fileType.file': '文件',
        'files.fileType.folder': '文件夹',

        'shareDialog.title': '创建分享',
        'shareDialog.resource': '分享对象',
        'shareDialog.expiresIn': '有效期',
        'shareDialog.expire.1': '1 天',
        'shareDialog.expire.7': '7 天',
        'shareDialog.expire.30': '30 天',
        'shareDialog.expire.0': '永久有效',
        'shareDialog.generate': '生成分享链接',
        'shareDialog.shareUrl': '分享地址',
        'shareDialog.accessCode': '提取码',
        'shareDialog.copyBoth': '复制链接和提取码',
        'shareDialog.createFailed': '创建分享失败',

        'publicShare.title': '分享资源',
        'publicShare.notFound': '分享不存在或已失效',
        'publicShare.expiresAt': '到期时间：{time}',
        'publicShare.accessCode': '提取码',
        'publicShare.download': '下载',

        'preview.failed': '预览失败',

        'api.requestFailed': '请求失败，状态码 {status}',
        'api.uploadFailed': '上传失败',
        'api.networkError': '网络请求失败',
    },
    'en-US': {
        'app.loading': 'Loading...',
        'app.menu.files': 'Files',
        'app.menu.admin': 'Admin',
        'app.session.admin': 'Admin Session',
        'app.session.feishu': 'Feishu Session',
        'app.logout': 'Log out',
        'app.enterAdmin': 'Open Admin',
        'app.backToFiles': 'Back to Files',
        'app.support': 'Support',
        'app.userShellSubtitle': 'Manage files, shares, and space in a product-style workspace',
        'app.adminShellTitle': 'Operations Console',
        'app.adminShellSubtitle': 'Monitor nodes, capacity, backups, and service settings',

        'login.feishu': 'Sign in with Feishu',
        'login.adminUsername': 'Admin Username',
        'login.adminPassword': 'Admin Password',
        'login.adminUsernameRequired': 'Please enter the admin username',
        'login.adminPasswordRequired': 'Please enter the admin password',
        'login.adminSubmit': 'Sign in as Admin',
        'login.adminFailed': 'Admin sign-in failed',

        'files.personalUsage': 'Personal Usage',
        'files.totalUsed': 'Global Usage',
        'files.tabFiles': 'Files',
        'files.tabShares': 'Shares',
        'files.uploadFile': 'Upload File',
        'files.uploadFolder': 'Upload Folder',
        'files.refresh': 'Refresh',
        'files.rootBreadcrumb': 'All Files',
        'files.tableName': 'Name',
        'files.tableSize': 'Size',
        'files.tableModified': 'Modified',
        'files.tableActions': 'Actions',
        'files.deleteConfirm': 'Delete immediately? This version does not move files to recycle bin.',
        'files.emptyFolder': 'This folder is empty',
        'files.emptyShares': 'No share records yet',
        'files.copyLink': 'Copy Link',
        'files.revoke': 'Revoke Share',
        'files.revokeConfirm': 'Revoke this share?',
        'files.uploadSuccess': 'Upload complete',
        'files.uploadFailed': 'Upload failed',
        'files.deleteSuccess': 'Deleted successfully',
        'files.loadFailed': 'Failed to load the workspace',
        'files.revokeSuccess': 'Share revoked',
        'files.copySuccess': 'Copied to clipboard',
        'files.fileType.file': 'File',
        'files.fileType.folder': 'Folder',

        'shareDialog.title': 'Create Share',
        'shareDialog.resource': 'Resource',
        'shareDialog.expiresIn': 'Expires In',
        'shareDialog.expire.1': '1 day',
        'shareDialog.expire.7': '7 days',
        'shareDialog.expire.30': '30 days',
        'shareDialog.expire.0': 'Never',
        'shareDialog.generate': 'Generate Share Link',
        'shareDialog.shareUrl': 'Share URL',
        'shareDialog.accessCode': 'Access Code',
        'shareDialog.copyBoth': 'Copy link and code',
        'shareDialog.createFailed': 'Failed to create the share',

        'publicShare.title': 'Shared Resource',
        'publicShare.notFound': 'The share does not exist or has expired',
        'publicShare.expiresAt': 'Expires at: {time}',
        'publicShare.accessCode': 'Access Code',
        'publicShare.download': 'Download',

        'preview.failed': 'Preview failed',

        'api.requestFailed': 'Request failed with status {status}',
        'api.uploadFailed': 'Upload failed',
        'api.networkError': 'Network request failed',
    },
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
    const {config} = useAppConfig();
    const [locale, setLocale] = useState<Locale>('zh-CN');

    useEffect(() => {
        setLocale(config.defaultLocale);
    }, [config.defaultLocale]);

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
        throw new Error('useI18n must be used inside I18nProvider');
    }
    return value;
}
