// src/pages/Register.tsx
import React, { useState } from 'react';
import "../styles/Register.css";

export default function Register() {
    const [username, setUsername] = useState('');
    const [realName, setRealName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert("两次密码不一致！");
            return;
        }

        // 检查真实姓名是否合法
        const nameCheckRes = await fetch('/api/check-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ realName })
        });
        const nameCheckData = await nameCheckRes.json();
        console.log(nameCheckData)
        if (!nameCheckData.allowed) {
            alert("该真实姓名未被允许注册！");
            return;
        }

        // 发起注册请求
        const registerRes = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, realName, password })
        });
        const data = await registerRes.json();

        alert(data.message || data.error);
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>注册</h2>
            <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="用户名"
                required
            />
            <input
                value={realName}
                onChange={e => setRealName(e.target.value)}
                placeholder="真实姓名"
                required
            />
            <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密码"
                required
            />
            <input
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="确认密码"
                required
            />
            <button type="submit">注册</button>
        </form>
    );
}
