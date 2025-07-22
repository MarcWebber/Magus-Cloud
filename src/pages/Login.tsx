import { useState } from 'react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert(`登录：${username}`);
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>登录</h2>
            <div>
                <label>用户名：</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div>
                <label>密码：</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit">登录</button>
        </form>
    );
}
