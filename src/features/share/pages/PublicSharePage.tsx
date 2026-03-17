import {useEffect, useState} from 'react';
import {useParams, useSearchParams} from 'react-router-dom';
import {Alert, Button, Card, Form, Input, Space, Tag, Typography} from 'antd';
import {DownloadOutlined, ShareAltOutlined} from '@ant-design/icons';
import {apiClient} from '../../../lib/api/client';
import {useI18n} from '../../../app/providers/I18nProvider';

type ShareInfo = {
    fileName: string;
    username: string;
    expireAt: number | null;
    type: 'file' | 'folder';
    hasCode: boolean;
};

export default function PublicSharePage() {
    const {t, locale} = useI18n();
    const {shareId = ''} = useParams();
    const [searchParams] = useSearchParams();
    const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
    const [code, setCode] = useState(searchParams.get('code') || '');
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const payload = await apiClient.get<ShareInfo>(`/api/share/info/${shareId}`);
                setShareInfo(payload);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : t('publicShare.notFound'));
            }
        };

        void load();
    }, [shareId, t]);

    const download = () => {
        if (!shareInfo) {
            return;
        }
        const url = `/api/download?shareId=${encodeURIComponent(shareId)}&name=${encodeURIComponent(shareInfo.fileName)}&type=${shareInfo.type}&code=${encodeURIComponent(code)}`;
        window.location.href = url;
    };

    return (
        <div className="login-screen">
            <Card className="glass-card" style={{width: 'min(620px, 100%)', borderRadius: 28}}>
                <Space direction="vertical" size="large" style={{width: '100%'}}>
                    <Space>
                        <ShareAltOutlined style={{fontSize: 24}} />
                        <Typography.Title level={3} style={{margin: 0}}>
                            {t('publicShare.title')}
                        </Typography.Title>
                    </Space>

                    {error && <Alert type="error" message={error} />}

                    {shareInfo && (
                        <>
                            <Space wrap>
                                <Tag color="blue">{t(`files.fileType.${shareInfo.type}`)}</Tag>
                                <Tag>{shareInfo.username}</Tag>
                                {shareInfo.expireAt && (
                                    <Tag color="orange">
                                        {t('publicShare.expiresAt', {time: new Date(shareInfo.expireAt).toLocaleString(locale)})}
                                    </Tag>
                                )}
                            </Space>

                            <Typography.Title level={4} style={{margin: 0}}>
                                {shareInfo.fileName}
                            </Typography.Title>

                            {shareInfo.hasCode && (
                                <Form layout="vertical">
                                    <Form.Item label={t('publicShare.accessCode')}>
                                        <Input value={code} onChange={(event) => setCode(event.target.value)} />
                                    </Form.Item>
                                </Form>
                            )}

                            <Button type="primary" icon={<DownloadOutlined />} onClick={download}>
                                {t('publicShare.download')}
                            </Button>
                        </>
                    )}
                </Space>
            </Card>
        </div>
    );
}
