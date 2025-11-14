// import {useState} from 'react';
// import {useNavigate} from 'react-router-dom';
// import "../page-style.css"
// // import FeishuLogin from "../components/feishu/FeishuLogin.tsx";
//
// export default function Login() {
//     const [username, setUsername] = useState('');
//     const [password, setPassword] = useState('');
//     const navigate = useNavigate();
//
//     //生产环境最好别这么些，这会导致回调地狱的。
//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         try {
//             const response = await fetch('/api/login', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({username, password}),
//                 // credentials: 'include' // 确保发送cookie
//             });
//             const result = await response.json();
//             if (response.ok && result.success) {
//                 e.preventDefault();
//                 navigate('/dashboard');
//             } else {
//                 alert(result.error || '登录失败');
//             }
//         } catch (error) {
//             // TODO 异常fallback
//         }
//     };
//
//     const handleFeishuLogin = () => {
//         // 这里可以添加飞书登录逻辑
//         // 例如，重定向到飞书的登录页面
//         window.location.href = '/api/feishu-login';
//     }
//
//     const handleRegister = (e: React.FormEvent) => {
//         e.preventDefault();
//         navigate('/register');
//     }
//
//     return (
//         <form onSubmit={handleSubmit}>
//             <h2>登录</h2>
//             <div>
//                 <label>用户名：</label>
//                 <input type="text" value={username} onChange={e => setUsername(e.target.value)} required/>
//             </div>
//             <div>
//                 <label>密码：</label>
//                 <input type="password" value={password} onChange={e => setPassword(e.target.value)} required/>
//             </div>
//             <div className="button-group">
//                 {/*<button type="submit">登录</button>*/}
//                 {/*<button type="button" onClick={handleRegister}>注册</button>*/}
//                 <button type="button" onClick={handleFeishuLogin}>飞书登录</button>
//                 {/*<button type="button" onClick={handleFeishuLogin}*/}
//             </div>
//         </form>
// );
// }
// src/pages/Login.tsx
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import "../page-style.css"

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({username, password}),
            });
            const result = await response.json();
            if (response.ok && result.success) {
                navigate('/dashboard');
            } else {
                alert(result.error || '登录失败');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleFeishuLogin = () => {
        window.location.href = '/api/feishu-login';
    }

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        navigate('/register');
    }

    return (
        /* 🔥 关键修改：加上 className="auth-container"
           这样 page-style.css 里的样式就只会作用于这个框框，
           而不会去破坏你的 Dashboard 头部布局了！
        */
        <form onSubmit={handleSubmit} className="auth-container">
            <h2>登录</h2>
            <div>
                <label>用户名：</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required/>
            </div>
            <div>
                <label>密码：</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required/>
            </div>
            <div className="button-group">
                {/* 如果你需要普通登录按钮，记得要把下面注释解开 */}
                {/* <button type="submit">登录</button> */}
                {/* <button type="button" onClick={handleRegister}>注册</button> */}

                <button type="button" onClick={handleFeishuLogin}>飞书登录</button>
            </div>
        </form>
    );
}