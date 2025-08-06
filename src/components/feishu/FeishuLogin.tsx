
// 飞鼠登录
export default function FeishuLogin() {

    function onClickLogin() {
        // 这里可以添加登录逻辑
        // 例如，重定向到飞书的登录页面
        // window.location.href = '/auth/feishu';
    }
    return (
        <div style={{textAlign: 'center', marginTop: '20%'}}>
            <a href="/api/feishu-login">
                <img
                    src="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/authen-zh-CN"
                    alt="Feishu Login"
                    style={{width: '200px', height: '50px'}}
                />
            </a>
        </div>
    );
}