import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login'; // 新增

export default function App() {
    return (
        <BrowserRouter>
            {/*<nav style={{ marginBottom: '1em' }}>*/}
            {/*    <Link to="/">登录</Link> |{' '}*/}
            {/*    <Link to="/register">注册</Link> |{' '}*/}
            {/*    <Link to="/change-password">修改密码</Link> |{' '}*/}
            {/*    <Link to="/dashboard">主页</Link>*/}
            {/*</nav>*/}
            <Routes>
                <Route path="/" element={<Login/>} />
                <Route path="/register" element={<Register />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="*" element={<div>404 页面未找到</div>} />
            </Routes>
        </BrowserRouter>
    );
}
