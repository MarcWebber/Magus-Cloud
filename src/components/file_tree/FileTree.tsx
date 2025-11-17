// // src/components/file_tree/FileTree.tsx
// import React, {useRef, useState} from 'react';
//
// import {Tree, NodeApi, NodeRendererProps, TreeApi} from 'react-arborist';
// import Styles from './FileTree.module.css';
// import {handleDownload} from '../../utils';
// import {extMap} from "../../constants.ts";
// import Share from "../actions/Share.tsx";
// import Delete from "../actions/Delete.tsx";
// import Preview from '../actions/Preview.tsx';
//
// export type FileTreeNode = {
//     id: string;
//     name: string;
//     children?: FileTreeNode[];
//     size?: string;
//     type: 'file' | 'folder';
//     mtime?: string; // 上传时间
// };
//
// type Props = {
//     data: FileTreeNode[];
//     searchTerm?: string;
//     onSelect?: (node: NodeApi<FileTreeNode>) => void;
//     onCreate?: (args: { parent: NodeApi<FileTreeNode> | null; index: number; type: string }) => void;
//     onRename?: (args: { id: string; name: string }) => void;
//     onMove?: (args: { dragIds: string[]; parent: NodeApi<FileTreeNode> | null; index: number }) => void;
//     onDelete?: (args: { ids: string[] }) => void;
// };
//
// export default function FileTree({
//                                      data,
//                                      searchTerm = '',
//                                      onSelect,
//                                      onCreate,
//                                      onRename,
//                                      onMove,
//                                      onDelete,
//                                  }: Props) {
//     console.log('FileTree rendered with data:', data);
//     const treeRef = useRef<TreeApi<FileTreeNode> | null>(null);
//     const expandOrCollapseAll = (expand: boolean) => {
//         const tree = treeRef.current;
//         // console.log(tree);
//         if (!tree) return;
//         if (expand) {
//             tree.openAll();
//         } else {
//             tree.closeAll();
//         }
//     };
//     // 添加预览相关状态
//     const [previewVisible, setPreviewVisible] = useState(false);
//     const [currentPreviewFile, setCurrentPreviewFile] = useState<{
//         id: string;
//         name: string;
//         type: 'file';
//     } | null>(null);
//
//     function onClickDelete(node: NodeApi<FileTreeNode>) {
//     }
//
//     function onClickDownload(node: NodeApi<FileTreeNode>) {
//     }
//     // 打开预览
//     const handleOpenPreview = (node: NodeApi<FileTreeNode>) => {
//         console.log('handleOpenPreview被调用，node数据:', node.data); // 添加日志
//         if (node.data.type === 'file') {
//             setCurrentPreviewFile({
//                 id: node.data.id,
//                 name: node.data.name,
//                 type: 'file'
//             });
//             setPreviewVisible(true);
//             console.log('预览状态更新：', { previewVisible: true, currentPreviewFile: node.data.name }); // 确认状态更新
//         }
//     };
//
//     // 关闭预览
//     const handleClosePreview = () => {
//         setPreviewVisible(false);
//         setCurrentPreviewFile(null);
//     };
//
//     return (
//         <div className={Styles['file-tree-container']}>
//             <div className="tree-actions mb-2 flex gap-2">
//                 <button onClick={() => expandOrCollapseAll(true)}>展开全部</button>
//                 <button onClick={() => expandOrCollapseAll(false)}>收起全部</button>
//             </div>
//             {/*TODO: 自适应宽度*/}
//             {/*<span>{"文件名"}</span>*/}
//             {/*/!*<div className={Styles['node-row']}>*!/*/}
//             {/*<span*/}
//             {/*    className={Styles['node-name']}>{"文件大小"}</span>*/}
//             {/*/!* 文件大小 *!/*/}
//             {/*<div className={Styles['node-size']}>*/}
//             {/*    {"上传时间"}*/}
//             {/*</div>*/}
//             <Tree<FileTreeNode>
//                 className={Styles['file-tree']}
//                 data={data}
//                 ref={treeRef}
//                 openByDefault={true}
//                 width={800}
//                 // onSelect={onSelect}
//                 // onCreate={onCreate}
//                 onRename={onRename}
//                 // onMove={onMove}
//                 onDelete={onDelete}
//                 searchTerm={searchTerm?.trim().toLowerCase()}
//                 searchMatch={(node, term) =>
//                     node.data.name.toLowerCase().includes(term.toLowerCase())
//                 }
//             >
//                 {(props) => <CustomNode {...props} onPreview={handleOpenPreview} />}
//             </Tree>
//             {currentPreviewFile && (
//                 <Preview
//                     visible={previewVisible}
//                     fileId={currentPreviewFile.id}
//                     fileName={currentPreviewFile.name}
//                     fileType={currentPreviewFile.type}
//                     onClose={handleClosePreview}
//                 />
//             )}
//         </div>
//     );
// }
//
// // function CustomNode({
// //                         node,
// //                         style,
// //                         dragHandle,
// //                         onSelect,
// //                         onPreview, // 接收预览回调
// //                     }: NodeRendererProps<FileTreeNode> & {
// //     onSelect?: (node: NodeApi<FileTreeNode>) => void;
// //     onPreview?: (node: NodeApi<FileTreeNode>) => void;
// // }) {
// //     const isFolder = node.data.type === 'folder';
// //     const [shareVisible, setShareVisible] = React.useState(false);
// //     const [deleteVisible, setDeleteVisible] = React.useState(false);
//
// //     const handleClick = () => {
// //         if (isFolder) {
// //             node.toggle();
// //         } else {
// //             onSelect?.(node);
// //         }
// //     };
//
// //     const handleDoubleClick = () => {
// //         if (!isFolder) {
// //             onSelect?.(node); // 可以换成 onPreview 回调
// //         }
// //     };
//
// //     const handleShare = () => {
// //         // 谈一个窗口，给出分享链接，参考百度网盘
// //         setShareVisible(true);
// //     }
//
// //     const handleDelete = () => {
// //         setDeleteVisible(true);
// //     }
//
// //     const getIcon = (name: string) => {
// //         if (isFolder) {
// //             return node.isOpen ? '📂' : '📁';
// //         }
// //         return extMap[name.split('.').pop() || ''] || '📄'; // 默认文件图标
// //     }
//
// //     return (
// //         <div
// //             ref={dragHandle}
// //             style={style}
// //             className={Styles['tree-node-item']}
// //             onClick={handleClick}
// //             onDoubleClick={handleDoubleClick}
// //         >
// //             <span>{getIcon(node.data.name)}</span>
// //             {/*<div className={Styles['node-row']}>*/}
// //             <span
// //                 className={Styles['node-name']}>{node.data.name.length > 30 ? node.data.name.slice(0, 30) + "..." : node.data.name}</span>
// //             {/* 文件大小 */}
// //             <div className={Styles['node-size']}>
// //                 {node.data.size || '--'}
// //             </div>
//
// //             {/* 上传时间 */}
// //             <div className={Styles['node-time']}>
// //                 {node.data.mtime || '--'}
// //             </div>
// //             {/*</div>*/}
//
// //             <div className={Styles['tree-node-actions']}>
// //                 {/* 预览按钮 */}
// //                 {!isFolder && (
// //                     <span
// //                         title="预览"
// //                         style={{cursor: 'pointer', marginRight: '8px'}}
// //                         onClick={(e) => {
// //                             e.stopPropagation();
// //                             console.log('预览按钮被点击，node数据:', node.data); // 添加日志
// //                             onPreview?.(node); // 触发预览
// //                         }}
// //                     >
// //                     👁️
// //                     </span>
// //                 )}
// //                 {/*TODO: 文件夹提供别的下载方式*/}
// //                 {(
// //                     <>
// //                         <span
// //                             title="下载"
// //                             style={{cursor: 'pointer'}}
// //                             onClick={(e) => {
// //                                 e.stopPropagation();
// //                                 console.log('下载', node.data.id);
// //                                 handleDownload(node.data.id,node.data.type); // 调用下载函数，传入文件名
// //                             }}
// //                         >
// //                             ⬇️
// //                         </span>
//
// //                         <span
// //                             title="删除"
// //                             style={{cursor: 'pointer'}}
// //                             onClick={(e) => {
// //                                 e.stopPropagation();
// //                                 console.log('删除', node.data.name);
// //                                 handleDelete();
// //                             }}
// //                         >
// //                             🗑️
// //                         </span>
//
// //                         <span
// //                             title="分享"
// //                             style={{cursor: 'pointer'}}
// //                             onClick={(e) => {
// //                                 e.stopPropagation();
// //                                 console.log('分享', node.data.name);
// //                                 handleShare();
// //                             }}
// //                         >
// //                             📤
// //                         </span>
// //                     </>
// //                 )}
// //             </div>
//
// //             <Share
// //                 fileName={node.data.id || ''}
// //                 visible={shareVisible}
// //                 type={node.data.type}
// //                 onClose={() => setShareVisible(false)}
// //             />
// //             <Delete fileName={node.data.id || ''} visible={deleteVisible}
// //                     onClose={() => setDeleteVisible(false)}/>
// //         </div>
// //     );
// // }
//
// function CustomNode({
//                         node,
//                         style,
//                         dragHandle,
//                         onSelect,
//                         onPreview, // 接收预览回调
//                     }: NodeRendererProps<FileTreeNode> & {
//     onSelect?: (node: NodeApi<FileTreeNode>) => void;
//     onPreview?: (node: NodeApi<FileTreeNode>) => void;
// }) {
//     const isFolder = node.data.type === 'folder';
//     const [shareVisible, setShareVisible] = React.useState(false);
//     const [deleteVisible, setDeleteVisible] = React.useState(false);
//
//     const handleClick = () => {
//         if (isFolder) {
//             node.toggle();
//         } else {
//             onSelect?.(node);
//         }
//     };
//
//     const handleDoubleClick = () => {
//         if (!isFolder) {
//             onSelect?.(node); // 可以换成 onPreview 回调
//         }
//     };
//
//     const handleShare = () => {
//         // 谈一个窗口，给出分享链接，参考百度网盘
//         setShareVisible(true);
//     }
//
//     const handleDelete = () => {
//         setDeleteVisible(true);
//     }
//
//     const getIcon = (name: string) => {
//         if (isFolder) {
//             return node.isOpen ? '📂' : '📁';
//         }
//         return extMap[name.split('.').pop() || ''] || '📄'; // 默认文件图标
//     }
//
//     return (
//         <div
//             ref={dragHandle}
//             style={style}
//             className={Styles['tree-node-item']}
//             onClick={handleClick} // <--- 问题根源：事件冒泡会触发这里
//             onDoubleClick={handleDoubleClick}
//         >
//             <span>{getIcon(node.data.name)}</span>
//             {/*<div className={Styles['node-row']}>*/}
//             <span
//                 className={Styles['node-name']}>{node.data.name.length > 30 ? node.data.name.slice(0, 30) + "..." : node.data.name}</span>
//             {/* 文件大小 */}
//             <div className={Styles['node-size']}>
//                 {node.data.size || '--'}
//             </div>
//
//             {/* 上传时间 */}
//             <div className={Styles['node-time']}>
//                 {node.data.mtime || '--'}
//             </div>
//             {/*</div>*/}
//
//             <div className={Styles['tree-node-actions']}>
//                 {/* 预览按钮 */}
//                 {!isFolder && (
//                     <span
//                         title="预览"
//                         style={{cursor: 'pointer', marginRight: '8px'}}
//                         onClick={(e) => {
//                             e.stopPropagation(); // 阻止冒泡
//                             console.log('预览按钮被点击，node数据:', node.data);
//                             onPreview?.(node); // 触发预览
//                         }}
//                     >
//                     👁️
//                     </span>
//                 )}
//                 {/*TODO: 文件夹提供别的下载方式*/}
//                 {(
//                     <>
//                         <span
//                             title="下载"
//                             style={{cursor: 'pointer'}}
//                             onClick={(e) => {
//                                 e.stopPropagation(); // 阻止冒泡
//                                 console.log('下载', node.data.id);
//                                 handleDownload(node.data.id, node.data.type);
//                             }}
//                         >
//                             ⬇️
//                         </span>
//
//                         <span
//                             title="删除"
//                             style={{cursor: 'pointer'}}
//                             onClick={(e) => {
//                                 e.stopPropagation(); // 阻止冒泡
//                                 console.log('删除', node.data.name);
//                                 handleDelete();
//                             }}
//                         >
//                             🗑️
//                         </span>
//
//                         <span
//                             title="分享"
//                             style={{cursor: 'pointer'}}
//                             onClick={(e) => {
//                                 e.stopPropagation(); // 阻止冒泡
//                                 console.log('分享', node.data.name);
//                                 handleShare();
//                             }}
//                         >
//                             📤
//                         </span>
//                     </>
//                 )}
//             </div>
//
//             {/* 解决方案：
//               添加一个包装器 div，并使用 onClick 捕获所有来自
//               Share 和 Delete 弹窗的冒泡事件，并阻止它们
//               进一步冒泡到父 div 的 handleClick。
//             */}
//             <div onClick={(e) => e.stopPropagation()}>
//                 <Share
//                     fileName={node.data.id || ''}
//                     visible={shareVisible}
//                     type={node.data.type}
//                     onClose={() => setShareVisible(false)}
//                 />
//                 <Delete
//                     fileName={node.data.id || ''}
//                     visible={deleteVisible}
//                     onClose={() => setDeleteVisible(false)}
//                 />
//             </div>
//         </div>
//     );
// }

// src/components/file_tree/FileTree.tsx
import React, { useState } from 'react';
import Styles from './FileTree.module.css';
import { handleDownload } from '../../utils';
import Preview from '../actions/Preview.tsx';
import Share from "../actions/Share.tsx";
import Delete from "../actions/Delete.tsx";

// 定义文件节点 (不变)
export type FileTreeNode = {
    id: string;
    name: string;
    children?: FileTreeNode[];
    size?: string;
    type: 'file' | 'folder';
    mtime?: string;
};

// 定义并导出排序类型
export type SortKey = 'name' | 'size' | 'mtime';
type SortDirection = 'asc' | 'desc';
export interface SortConfig { // 导出接口，方便 Dashboard 使用
    key: SortKey;
    direction: SortDirection;
}

// 升级 Props 定义
interface FileTreeProps {
    items: FileTreeNode[];
    onNavigate: (folderName: string) => void;
    onDelete?: (id: string) => void;
    // 新增 Props
    sortConfig: SortConfig;
    onSort: (key: SortKey) => void;
}

export default function FileTree({ items, onNavigate, onDelete, sortConfig, onSort }: FileTreeProps) {
    // --- 状态管理 (弹窗) ---
    const [previewTarget, setPreviewTarget] = useState<FileTreeNode | null>(null);
    const [shareTarget, setShareTarget] = useState<FileTreeNode | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FileTreeNode | null>(null);

    // --- 辅助函数 (图标) ---
    const getIconClass = (type: string, name: string) => {
        if (type === 'folder') return "fa-solid fa-folder";
        const ext = name.split('.').pop()?.toLowerCase();
        if (['jpg', 'png', 'jpeg', 'gif', 'webp'].includes(ext || '')) return "fa-solid fa-image";
        if (['pdf'].includes(ext || '')) return "fa-solid fa-file-pdf";
        if (['doc', 'docx'].includes(ext || '')) return "fa-solid fa-file-word";
        if (['xls', 'xlsx'].includes(ext || '')) return "fa-solid fa-file-excel";
        if (['ppt', 'pptx'].includes(ext || '')) return "fa-solid fa-file-powerpoint";
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return "fa-solid fa-file-zipper";
        if (['mp4', 'mkv', 'avi', 'mov'].includes(ext || '')) return "fa-solid fa-file-video";
        if (['mp3', 'wav', 'flac'].includes(ext || '')) return "fa-solid fa-file-audio";
        if (['txt', 'md', 'json', 'js', 'css', 'html', 'py', 'java', 'c', 'cpp'].includes(ext || '')) return "fa-solid fa-file-code";
        return "fa-solid fa-file";
    };
    const getIconColor = (type: string, name: string) => {
        if (type === 'folder') return "#FFC107";
        const ext = name.split('.').pop()?.toLowerCase();
        if (['jpg', 'png', 'jpeg', 'gif'].includes(ext || '')) return "#4CAF50";
        if (['pdf'].includes(ext || '')) return "#F44336";
        if (['doc', 'docx'].includes(ext || '')) return "#2196F3";
        if (['ppt', 'pptx'].includes(ext || '')) return "#FF5722";
        if (['zip', 'rar', '7z'].includes(ext || '')) return "#9C27B0";
        return "#888";
    };

    // --- 交互逻辑 (不变) ---
    const handleRowClick = (item: FileTreeNode) => {
        if (item.type === 'folder') {
            onNavigate(item.name);
        } else {
            setPreviewTarget(item);
        }
    };
    const handleAction = (e: React.MouseEvent, action: 'download' | 'share' | 'delete', item: FileTreeNode) => {
        e.stopPropagation();
        switch (action) {
            case 'download':
                handleDownload(item.id, item.type);
                break;
            case 'share':
                setShareTarget(item);
                break;
            case 'delete':
                setDeleteTarget(item);
                break;
        }
    };

    // 渲染排序箭头 ---
    const renderSortArrow = (key: SortKey) => {
        if (sortConfig.key !== key) return null; // 未选中此列

        const arrowStyle: React.CSSProperties = {
            marginLeft: '6px',
            color: '#3b8cff' // 激活的箭头用主题色
        };

        if (sortConfig.direction === 'asc') {
            return <span style={arrowStyle}>▲</span>; // 升序
        } else {
            return <span style={arrowStyle}>▼</span>; // 降序
        }
    };

    // 表头点击的辅助样式
    const headerColStyle = (key: SortKey): React.CSSProperties => ({
        cursor: 'pointer',
        fontWeight: sortConfig.key === key ? 600 : 500, // 激活的列加粗
        color: sortConfig.key === key ? '#3b8cff' : '#888', // 激活的列变蓝
        transition: 'color 0.2s',
    });


    // --- 渲染：通用表头 (提取为可复用组件) ---
    const renderHeader = () => (
        <div className={Styles.header}>
            <span
                className={Styles.colName}
                style={headerColStyle('name')}
                onClick={() => onSort('name')}
            >
                文件名{renderSortArrow('name')}
            </span>
            <span
                className={Styles.colSize}
                style={headerColStyle('size')}
                onClick={() => onSort('size')}
            >
                大小{renderSortArrow('size')}
            </span>
            <span
                className={Styles.colDate}
                style={headerColStyle('mtime')}
                onClick={() => onSort('mtime')}
            >
                修改日期{renderSortArrow('mtime')}
            </span>
            <span className={Styles.colActions}>操作</span>
        </div>
    );

    // --- 渲染：空状态 ---
    if (!items || items.length === 0) {
        return (
            <div className={Styles.container}>
                {/* 使用 renderHeader */}
                {renderHeader()}
                <div className={Styles.emptyState}>
                    <i className="fa-regular fa-folder-open" style={{fontSize: '48px', marginBottom: '16px', color: '#eee'}}></i>
                    <p>此文件夹为空，或未找到搜索结果</p>
                </div>
            </div>
        );
    }

    // --- 渲染：列表状态 ---
    return (
        <div className={Styles.container}>
            {/* 使用 renderHeader */}
            {renderHeader()}

            {/* 列表项循环 */}
            {items.map((item) => (
                <div key={item.id} className={Styles.row} onClick={() => handleRowClick(item)}>

                    {/* 文件名列 */}
                    <div className={Styles.colName}>
                        <i
                            className={`${getIconClass(item.type, item.name)} ${Styles.icon}`}
                            style={{ color: getIconColor(item.type, item.name) }}
                        ></i>
                        <span className={Styles.fileNameText} title={item.name}>
                            {item.name}
                        </span>
                    </div>

                    {/* 大小列 */}
                    <div className={Styles.colSize}>{item.size || '-'}</div>

                    {/* 日期列 */}
                    <div className={Styles.colDate}>{item.mtime || '-'}</div>

                    {/* 操作列 (悬停显示) */}
                    <div className={Styles.colActions}>
                        <button
                            className={Styles.actionBtn}
                            title="下载"
                            onClick={(e) => handleAction(e, 'download', item)}
                        >
                            <i className="fa-solid fa-download"></i>
                        </button>
                        <button
                            className={Styles.actionBtn}
                            title="分享"
                            onClick={(e) => handleAction(e, 'share', item)}
                        >
                            <i className="fa-solid fa-share-nodes"></i>
                        </button>
                        <button
                            className={Styles.actionBtn}
                            title="删除"
                            onClick={(e) => handleAction(e, 'delete', item)}
                        >
                            <i className="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            ))}

            {/* --- 弹窗组件区域 --- */}
            {previewTarget && (
                <Preview
                    visible={!!previewTarget}
                    fileId={previewTarget.id}
                    fileName={previewTarget.name}
                    fileType="file"
                    onClose={() => setPreviewTarget(null)}
                />
            )}
            {shareTarget && (
                <Share
                    visible={!!shareTarget}
                    fileName={shareTarget.id}
                    type={shareTarget.type}
                    onClose={() => setShareTarget(null)}
                />
            )}
            {deleteTarget && (
                <Delete
                    visible={!!deleteTarget}
                    fileName={deleteTarget.id}
                    onClose={() => setDeleteTarget(null)}
                    // 确保 onSuccess 回调已连接
                    onSuccess={() => {
                        setDeleteTarget(null);
                        if (onDelete) onDelete(deleteTarget.id); // 通知 Dashboard 刷新
                    }}
                />
            )}
        </div>
    );
}