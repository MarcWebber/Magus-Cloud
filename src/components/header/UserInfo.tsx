import {useEffect, useState} from "react";
import Styles from './UserInfo.module.css';
import {Avatar, Button, Space, Typography} from "antd";
import { UserOutlined, SettingOutlined } from "@ant-design/icons";

export default function UserInfo() {
    // 只做用户信息的展示，内容为 欢迎你 XXX，然后一个头像，一个设置，就没有了。悬挂在页面右上角
    // 从cookie中获取token，然后解包为用户名
    // 从cookie中获取用户头像
    const [username, setUsername] = useState('用户');
    const [avatarUrl, setAvatarUrl] = useState('https://s1-imfile.feishucdn.com/static-resource/v1/v3_00lb_a9a7ffbc-dc7b-461a-bef9-a67cfc9ed39g~?image_size=72x72&cut_type=&quality=&format=image&sticker_format=.webp');
    useEffect(() => {
        fetch('/api/user/me', {
            method: 'POST',
            credentials: 'include', // 确保发送cookie
        }).then(
            response => {
                if (!response.ok) {
                    throw new Error('网络错误或未登录');
                }
                return response.json();
            }
        ).then(data => {
            setUsername(data.username || '用户');
            setAvatarUrl(data.avatarUrl || 'https://s1-imfile.feishucdn.com/static-resource/v1/v3_00lb_a9a7ffbc-dc7b-461a-bef9-a67cfc9ed39g~?image_size=72x72&cut_type=&quality=&format=image&sticker_format=.webp');
        }).catch(error => {
                console.error('获取用户信息失败:', error);
            }
        )
    }, []);


    return (
        <div className={Styles.userInfo}>
            <Space size="middle" align="center">
                <Typography.Text className={Styles.welcomeText}>
                    欢迎你，{username}
                </Typography.Text>
                <Avatar
                    src={avatarUrl}
                    icon={!avatarUrl && <UserOutlined />}
                    size={32}
                    className={Styles.userAvatar}
                />
                <Button
                    type="text"
                    icon={<SettingOutlined />}
                    className={Styles.settingsButton}
                />
            </Space>
        </div>
    );
}