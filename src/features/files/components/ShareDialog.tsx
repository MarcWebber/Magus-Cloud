import {useMemo, useState} from 'react';
import {Button, Form, Input, Modal, Select, Space, message} from 'antd';
import {CopyOutlined, ShareAltOutlined} from '@ant-design/icons';
import {apiClient} from '../../../lib/api/client';
import {useI18n} from '../../../app/providers/I18nProvider';

type ShareDialogProps = {
    open: boolean;
    fileName: string;
    type: 'file' | 'folder';
    onClose: () => void;
};

export function ShareDialog({open, fileName, type, onClose}: ShareDialogProps) {
    const {t} = useI18n();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{url: string; code: string} | null>(null);

    const smartLink = useMemo(() => {
        if (!result) {
            return '';
        }
        return result.code ? `${result.url}?code=${result.code}` : result.url;
    }, [result]);

    const createShare = async (values: {expireDays: number}) => {
        setLoading(true);
        try {
            const payload = await apiClient.post<{shareId: string; code: string}>('/api/share/create', {
                fileName,
                type,
                expireDays: values.expireDays,
                hasCode: true,
            });
            setResult({
                url: `${window.location.origin}/s/${payload.shareId}`,
                code: payload.code,
            });
        } catch (error) {
            message.error(error instanceof Error ? error.message : t('shareDialog.createFailed'));
        } finally {
            setLoading(false);
        }
    };

    const copy = async (value: string) => {
        await navigator.clipboard.writeText(value);
        message.success(t('files.copySuccess'));
    };

    return (
        <Modal
            open={open}
            title={<Space><ShareAltOutlined />{t('shareDialog.title')}</Space>}
            onCancel={() => {
                setResult(null);
                onClose();
            }}
            footer={null}
            destroyOnClose
        >
            {!result ? (
                <Form layout="vertical" onFinish={createShare} initialValues={{expireDays: 7}}>
                    <Form.Item label={t('shareDialog.resource')}>
                        <Input value={fileName} readOnly />
                    </Form.Item>
                    <Form.Item label={t('shareDialog.expiresIn')} name="expireDays">
                        <Select
                            options={[
                                {label: t('shareDialog.expire.1'), value: 1},
                                {label: t('shareDialog.expire.7'), value: 7},
                                {label: t('shareDialog.expire.30'), value: 30},
                                {label: t('shareDialog.expire.0'), value: 0},
                            ]}
                        />
                    </Form.Item>
                    <Button htmlType="submit" type="primary" loading={loading} block>
                        {t('shareDialog.generate')}
                    </Button>
                </Form>
            ) : (
                <Space direction="vertical" size="middle" style={{width: '100%'}}>
                    <Form layout="vertical">
                        <Form.Item label={t('shareDialog.shareUrl')}>
                            <Space.Compact style={{width: '100%'}}>
                                <Input value={result.url} readOnly />
                                <Button icon={<CopyOutlined />} onClick={() => void copy(result.url)} />
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label={t('shareDialog.accessCode')}>
                            <Space.Compact style={{width: '100%'}}>
                                <Input value={result.code} readOnly />
                                <Button icon={<CopyOutlined />} onClick={() => void copy(result.code)} />
                            </Space.Compact>
                        </Form.Item>
                        <Button block onClick={() => void copy(smartLink)}>
                            {t('shareDialog.copyBoth')}
                        </Button>
                    </Form>
                </Space>
            )}
        </Modal>
    );
}
