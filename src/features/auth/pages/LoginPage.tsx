import {useState} from 'react';
import {
    CaretDownOutlined,
    CaretRightOutlined,
    LockOutlined,
    QuestionCircleOutlined,
    SafetyCertificateOutlined,
    UserOutlined,
} from '@ant-design/icons';
import {Button, Form, Input, Modal, Typography, message} from 'antd';
import {apiClient} from '../../../lib/api/client';
import {useI18n} from '../../../app/providers/I18nProvider';
import {useHelpDrawer} from '../../../app/providers/HelpProvider';
import {useAppConfig} from '../../../app/providers/AppConfigProvider';
import styles from './LoginPage.module.css';

export function LoginPage() {
    const {t} = useI18n();
    const {config} = useAppConfig();
    const {openHelp} = useHelpDrawer();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);

    const onAdminLogin = async (values: {username: string; password: string}) => {
        try {
            await apiClient.post('/api/auth/admin/login', values);
            window.location.assign('/dashboard');
        } catch (error) {
            message.error(error instanceof Error ? error.message : t('login.adminFailed'));
        }
    };

    return (
        <div className={styles.loginPage}>
            <header className={styles.topBar}>
                <div className={styles.brand}>
                    <img src="/magus.png" alt="Magus" />
                    <div>
                        <strong>{config.appName}</strong>
                    </div>
                </div>

                <button
                    type="button"
                    className={styles.helpButton}
                    onClick={() => openHelp('user')}
                    aria-label="打开用户帮助文档"
                >
                    <QuestionCircleOutlined />
                </button>
            </header>

            <main className={styles.heroSection}>
                <section className={styles.heroCopy}>
                    <Typography.Title className={styles.heroTitle}>
                        让团队资料
                        <br />
                        轻松留在云端
                    </Typography.Title>
                    <Typography.Paragraph className={styles.heroDescription}>
                        为团队文件提供上传、预览、分享与整理能力，让常用资料像网盘一样更顺手、更清爽。
                    </Typography.Paragraph>
                    <Button
                        type="primary"
                        size="large"
                        className={styles.primaryButton}
                        onClick={() => setShowLoginModal(true)}
                    >
                        去登录
                    </Button>
                </section>

                <section className={styles.visualPanel} aria-label="首页主视觉">
                    <div className={styles.visualFrame}>
                        <img src="/magus.png" alt="Magus Cloud 主视觉" className={styles.heroImage} />
                    </div>
                </section>
            </main>

            <Modal
                open={showLoginModal}
                footer={null}
                onCancel={() => setShowLoginModal(false)}
                width={440}
                destroyOnHidden
                className={styles.loginModal}
                title={(
                    <div className={styles.modalTitle}>
                        <div className={styles.modalBrandIcon}>
                            <img src="/magus.png" alt="Magus" />
                        </div>
                        <div>
                            <Typography.Title level={3}>登录 {config.appName}</Typography.Title>
                            <Typography.Paragraph>
                                默认使用飞书完成登录。管理员应急入口仅用于初始化、排障和配置维护。
                            </Typography.Paragraph>
                        </div>
                    </div>
                )}
            >
                <Button
                    type="primary"
                    size="large"
                    block
                    icon={<SafetyCertificateOutlined />}
                    className={styles.modalPrimaryButton}
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
                    onClick={() => setShowAdmin((value) => !value)}
                >
                    管理员应急登录
                </Button>

                {showAdmin && (
                    <div className={styles.adminFormWrap}>
                        <Form layout="vertical" onFinish={onAdminLogin}>
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
            </Modal>
        </div>
    );
}
