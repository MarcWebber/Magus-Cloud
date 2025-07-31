import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../page-style.css"

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    //生产环境最好别这么些，这会导致回调地狱的。
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                // credentials: 'include' // 确保发送cookie
            });

            const result = await response.json();
            if (response.ok && result.success) {
                e.preventDefault();
                navigate('/dashboard');
            } else {
                alert(result.error || '登录失败');
            }
        } catch (error) {
            console.error('❌ 登录请求异常:', error);
            alert('服务器异常，登录失败');
        }
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        navigate('/register');
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>登录</h2>
            <div>
                <label>用户名：</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required/>
            </div>
            <div>
                <label>密码：</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required  />
            </div>
            <div className="button-group">
                <button type="submit">登录</button>
                <button type="button" onClick={handleRegister}>注册</button>
            </div>
        </form>
    );
}
