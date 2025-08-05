import {useState} from "react";
import Styles from './Delete.module.css';

export default function Delete({fileName,visible,onClose}: { fileName: string, visible: boolean, onClose: () => void }) {
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
                body: JSON.stringify({ filename: fileName }),
            });

            if (!response.ok) {
                // TODO 异常处理
                // throw new Error('删除失败，请稍后重试');
            }

            alert('文件已成功删除');
            onClose(); // 关闭模态框
        } catch (error) {
            console.error('删除文件时出错:', error);
            alert(`删除失败：${(error as Error).message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!visible) return null;

    return (
        <div className={Styles['mask']}>
            <div className={Styles['modal']}>
                <h3 className={Styles['title']}>确认删除文件</h3>
                <p>您确定要删除文件：{fileName} 吗？</p>
                <div className={Styles['actions']}>
                    <button className={Styles['cancel']} onClick={onClose}>取消</button>
                    <button className={Styles['delete']} onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? '正在删除...' : '确认删除'}
                    </button>
                </div>
            </div>
        </div>
    );
}