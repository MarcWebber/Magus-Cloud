import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import "../page-style.css"

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert(`登录：${username}`);
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
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}/>
            </div>
            <div>
                <label>密码：</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}/>
            </div>
            <div className="button-group">
                <button type="submit">登录</button>
                <button type="button" onClick={handleRegister}>注册</button>
            </div>
        </form>
    );
}
