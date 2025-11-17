// src/components/actions/Delete.tsx
import React, { useState } from 'react';
import Styles from './Delete.module.css';
import { message } from 'antd'; // 🔥 1. 引入 antd 的 message 提示

// 🔥 2. 定义一个清晰的 Props 接口
type DeleteProps = {
    fileName: string; // 这里的 fileName 实际上是 ID
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void; // 🔥 3. 声明 onSuccess 是一个可选的回调函数
};

// 🔥 4. 应用新的 Props 接口
export default function Delete({ fileName, visible, onClose, onSuccess }: DeleteProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!fileName) return;

        setIsDeleting(true);
        try {
            const response = await fetch('/api/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // 你的后端需要 { filename: "id" }
                body: JSON.stringify({ filename: fileName }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '删除失败');
            }

            // 🔥 5. 替换 alert 为 message
            message.success('文件已成功删除');

            // 🔥 6. 替换 window.location.reload() 为 onSuccess 回调
            // 这将通知 Dashboard 组件去刷新文件列表，而不是刷新整个网页
            if (onSuccess) {
                onSuccess();
            }

            onClose(); // 关闭模态框
        } catch (error) {
            console.error('删除文件时出错:', error);
            // 🔥 7. 替换 alert 为 message
            message.error(`删除失败：${(error as Error).message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!visible) return null;

    // 🔥 8. 换上我们之前写的漂亮 Modal 样式
    return (
        <div className={Styles.mask}>
            <div className={Styles.modal}>
                <div className={Styles.header}>
                    <div className={Styles.iconWrapper}>
                        <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h3 className={Styles.title}>确认删除</h3>
                </div>

                <div className={Styles.content}>
                    <p>确定要删除 <span className={Styles.fileName}>{fileName}</span> 吗？</p>
                    <p style={{fontSize: '12px', color: '#999', marginTop: '4px'}}>此操作不可撤销。</p>
                </div>

                <div className={Styles.actions}>
                    <button
                        className={`${Styles.btn} ${Styles.btnCancel}`}
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        取消
                    </button>
                    <button
                        className={`${Styles.btn} ${Styles.btnDelete}`}
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? '删除中...' : '确认删除'}
                    </button>
                </div>
            </div>
        </div>
    );
}