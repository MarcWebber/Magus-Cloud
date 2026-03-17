import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button, Card, Form, Input, Space, message} from 'antd';
import {CaretDownOutlined, CaretRightOutlined, LockOutlined, SafetyCertificateOutlined, UserOutlined} from '@ant-design/icons';
import {apiClient} from '../../../lib/api/client';
import {useSession} from '../../../app/providers/SessionProvider';
import {useI18n} from '../../../app/providers/I18nProvider';
import styles from './LoginPage.module.css';

export function LoginPage() {
    const navigate = useNavigate();
    const {refresh} = useSession();
    const {t} = useI18n();
    const [showAdmin, setShowAdmin] = useState(false);

    const onAdminLogin = async (values: {username: string; password: string}) => {
        try {
            await apiClient.post('/api/auth/admin/login', values);
            await refresh();
            navigate('/admin');
        } catch (error) {
            message.error(error instanceof Error ? error.message : t('login.adminFailed'));
        }
    };

    return (
        <div className="login-screen">
            <Card className={`glass-card ${styles.loginPanel}`}>
                <Space direction="vertical" size="large" className={styles.loginActions}>
                    <div className={styles.brandBlock}>
                        <div className={styles.logoWrap}>
                            <img className={styles.logo} src="/magus.png" alt="Magus" />
                        </div>
                        <div className={styles.brandText}>
                            <h1>Magus Cloud</h1>
                            <p>{t('login.title')}</p>
                        </div>
                    </div>

                    <Button
                        type="primary"
                        size="large"
                        icon={<SafetyCertificateOutlined />}
                        onClick={() => {
                            window.location.href = '/api/auth/feishu/login';
                        }}
                    >
                        {t('login.feishu')}
                    </Button>

                    <Button
                        type="text"
                        className={styles.adminToggle}
                        icon={showAdmin ? <CaretDownOutlined /> : <CaretRightOutlined />}
                        onClick={() => setShowAdmin((previous) => !previous)}
                    >
                        {t('login.adminDivider')}
                    </Button>

                    {showAdmin && (
                        <div className={styles.adminFormWrap}>
                            <Form layout="vertical" onFinish={onAdminLogin} className={styles.loginForm}>
                                <Form.Item
                                    label={t('login.adminUsername')}
                                    name="username"
                                    initialValue="admin"
                                    rules={[{required: true, message: t('login.adminUsernameRequired')}]}
                                >
                                    <Input prefix={<UserOutlined />} />
                                </Form.Item>
                                <Form.Item
                                    label={t('login.adminPassword')}
                                    name="password"
                                    rules={[{required: true, message: t('login.adminPasswordRequired')}]}
                                >
                                    <Input.Password prefix={<LockOutlined />} />
                                </Form.Item>
                                <Button htmlType="submit" size="large" block>
                                    {t('login.adminSubmit')}
                                </Button>
                            </Form>
                        </div>
                    )}
                </Space>
            </Card>
        </div>
    );
}
