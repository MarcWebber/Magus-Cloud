import React, { useState } from 'react';

export default function ChangePassword() {
    const [username, setUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert("密码不匹配，请重新输入！");
            return;
        }
        const res = await fetch('/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, newPassword })
        });
        const data = await res.json();
        alert(data.message || data.error);
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>修改密码</h2>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名" required />
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="密码" required />
            <input type="password" value={newPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="确认密码" required />
        </form>
    );
}
