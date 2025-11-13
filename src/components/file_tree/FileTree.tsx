// src/components/file_tree/FileTree.tsx
import React, {useRef, useState} from 'react';

import {Tree, NodeApi, NodeRendererProps, TreeApi} from 'react-arborist';
import Styles from './FileTree.module.css';
import {handleDownload} from '../../utils';
import {extMap} from "../../constants.ts";
import Share from "../actions/Share.tsx";
import Delete from "../actions/Delete.tsx";
import Preview from '../actions/Preview.tsx';

export type FileTreeNode = {
    id: string;
    name: string;
    children?: FileTreeNode[];
    size?: string;
    type: 'file' | 'folder';
    mtime?: string; // 上传时间
};

type Props = {
    data: FileTreeNode[];
    searchTerm?: string;
    onSelect?: (node: NodeApi<FileTreeNode>) => void;
    onCreate?: (args: { parent: NodeApi<FileTreeNode> | null; index: number; type: string }) => void;
    onRename?: (args: { id: string; name: string }) => void;
    onMove?: (args: { dragIds: string[]; parent: NodeApi<FileTreeNode> | null; index: number }) => void;
    onDelete?: (args: { ids: string[] }) => void;
};

export default function FileTree({
                                     data,
                                     searchTerm = '',
                                     onSelect,
                                     onCreate,
                                     onRename,
                                     onMove,
                                     onDelete,
                                 }: Props) {
    console.log('FileTree rendered with data:', data);
    const treeRef = useRef<TreeApi<FileTreeNode> | null>(null);
    const expandOrCollapseAll = (expand: boolean) => {
        const tree = treeRef.current;
        // console.log(tree);
        if (!tree) return;
        if (expand) {
            tree.openAll();
        } else {
            tree.closeAll();
        }
    };
    // 添加预览相关状态
    const [previewVisible, setPreviewVisible] = useState(false);
    const [currentPreviewFile, setCurrentPreviewFile] = useState<{
        id: string;
        name: string;
        type: 'file';
    } | null>(null);

    function onClickDelete(node: NodeApi<FileTreeNode>) {
    }

    function onClickDownload(node: NodeApi<FileTreeNode>) {
    }
    // 打开预览
    const handleOpenPreview = (node: NodeApi<FileTreeNode>) => {
        console.log('handleOpenPreview被调用，node数据:', node.data); // 添加日志
        if (node.data.type === 'file') {
            setCurrentPreviewFile({
                id: node.data.id,
                name: node.data.name,
                type: 'file'
            });
            setPreviewVisible(true);
            console.log('预览状态更新：', { previewVisible: true, currentPreviewFile: node.data.name }); // 确认状态更新
        }
    };

    // 关闭预览
    const handleClosePreview = () => {
        setPreviewVisible(false);
        setCurrentPreviewFile(null);
    };

    return (
        <div className={Styles['file-tree-container']}>
            <div className="tree-actions mb-2 flex gap-2">
                <button onClick={() => expandOrCollapseAll(true)}>展开全部</button>
                <button onClick={() => expandOrCollapseAll(false)}>收起全部</button>
            </div>
            {/*TODO: 自适应宽度*/}
            {/*<span>{"文件名"}</span>*/}
            {/*/!*<div className={Styles['node-row']}>*!/*/}
            {/*<span*/}
            {/*    className={Styles['node-name']}>{"文件大小"}</span>*/}
            {/*/!* 文件大小 *!/*/}
            {/*<div className={Styles['node-size']}>*/}
            {/*    {"上传时间"}*/}
            {/*</div>*/}
            <Tree<FileTreeNode>
                className={Styles['file-tree']}
                data={data}
                ref={treeRef}
                openByDefault={true}
                width={800}
                // onSelect={onSelect}
                // onCreate={onCreate}
                onRename={onRename}
                // onMove={onMove}
                onDelete={onDelete}
                searchTerm={searchTerm?.trim().toLowerCase()}
                searchMatch={(node, term) =>
                    node.data.name.toLowerCase().includes(term.toLowerCase())
                }
            >
                {(props) => <CustomNode {...props} onPreview={handleOpenPreview} />}
            </Tree>
            {currentPreviewFile && (
                <Preview
                    visible={previewVisible}
                    fileId={currentPreviewFile.id}
                    fileName={currentPreviewFile.name}
                    fileType={currentPreviewFile.type}
                    onClose={handleClosePreview}
                />
            )}
        </div>
    );
}

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

//     const handleClick = () => {
//         if (isFolder) {
//             node.toggle();
//         } else {
//             onSelect?.(node);
//         }
//     };

//     const handleDoubleClick = () => {
//         if (!isFolder) {
//             onSelect?.(node); // 可以换成 onPreview 回调
//         }
//     };

//     const handleShare = () => {
//         // 谈一个窗口，给出分享链接，参考百度网盘
//         setShareVisible(true);
//     }

//     const handleDelete = () => {
//         setDeleteVisible(true);
//     }

//     const getIcon = (name: string) => {
//         if (isFolder) {
//             return node.isOpen ? '📂' : '📁';
//         }
//         return extMap[name.split('.').pop() || ''] || '📄'; // 默认文件图标
//     }

//     return (
//         <div
//             ref={dragHandle}
//             style={style}
//             className={Styles['tree-node-item']}
//             onClick={handleClick}
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

//             {/* 上传时间 */}
//             <div className={Styles['node-time']}>
//                 {node.data.mtime || '--'}
//             </div>
//             {/*</div>*/}
            
//             <div className={Styles['tree-node-actions']}>
//                 {/* 预览按钮 */}
//                 {!isFolder && (
//                     <span
//                         title="预览"
//                         style={{cursor: 'pointer', marginRight: '8px'}}
//                         onClick={(e) => {
//                             e.stopPropagation();
//                             console.log('预览按钮被点击，node数据:', node.data); // 添加日志
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
//                                 e.stopPropagation();
//                                 console.log('下载', node.data.id);
//                                 handleDownload(node.data.id,node.data.type); // 调用下载函数，传入文件名
//                             }}
//                         >
//                             ⬇️
//                         </span>

//                         <span
//                             title="删除"
//                             style={{cursor: 'pointer'}}
//                             onClick={(e) => {
//                                 e.stopPropagation();
//                                 console.log('删除', node.data.name);
//                                 handleDelete();
//                             }}
//                         >
//                             🗑️
//                         </span>

//                         <span
//                             title="分享"
//                             style={{cursor: 'pointer'}}
//                             onClick={(e) => {
//                                 e.stopPropagation();
//                                 console.log('分享', node.data.name);
//                                 handleShare();
//                             }}
//                         >
//                             📤
//                         </span>
//                     </>
//                 )}
//             </div>

//             <Share
//                 fileName={node.data.id || ''}
//                 visible={shareVisible}
//                 type={node.data.type}
//                 onClose={() => setShareVisible(false)}
//             />
//             <Delete fileName={node.data.id || ''} visible={deleteVisible}
//                     onClose={() => setDeleteVisible(false)}/>
//         </div>
//     );
// }

function CustomNode({
                        node,
                        style,
                        dragHandle,
                        onSelect,
                        onPreview, // 接收预览回调
                    }: NodeRendererProps<FileTreeNode> & {
    onSelect?: (node: NodeApi<FileTreeNode>) => void;
    onPreview?: (node: NodeApi<FileTreeNode>) => void;
}) {
    const isFolder = node.data.type === 'folder';
    const [shareVisible, setShareVisible] = React.useState(false);
    const [deleteVisible, setDeleteVisible] = React.useState(false);

    const handleClick = () => {
        if (isFolder) {
            node.toggle();
        } else {
            onSelect?.(node);
        }
    };

    const handleDoubleClick = () => {
        if (!isFolder) {
            onSelect?.(node); // 可以换成 onPreview 回调
        }
    };

    const handleShare = () => {
        // 谈一个窗口，给出分享链接，参考百度网盘
        setShareVisible(true);
    }

    const handleDelete = () => {
        setDeleteVisible(true);
    }

    const getIcon = (name: string) => {
        if (isFolder) {
            return node.isOpen ? '📂' : '📁';
        }
        return extMap[name.split('.').pop() || ''] || '📄'; // 默认文件图标
    }

    return (
        <div
            ref={dragHandle}
            style={style}
            className={Styles['tree-node-item']}
            onClick={handleClick} // <--- 问题根源：事件冒泡会触发这里
            onDoubleClick={handleDoubleClick}
        >
            <span>{getIcon(node.data.name)}</span>
            {/*<div className={Styles['node-row']}>*/}
            <span
                className={Styles['node-name']}>{node.data.name.length > 30 ? node.data.name.slice(0, 30) + "..." : node.data.name}</span>
            {/* 文件大小 */}
            <div className={Styles['node-size']}>
                {node.data.size || '--'}
            </div>

            {/* 上传时间 */}
            <div className={Styles['node-time']}>
                {node.data.mtime || '--'}
            </div>
            {/*</div>*/}

            <div className={Styles['tree-node-actions']}>
                {/* 预览按钮 */}
                {!isFolder && (
                    <span
                        title="预览"
                        style={{cursor: 'pointer', marginRight: '8px'}}
                        onClick={(e) => {
                            e.stopPropagation(); // 阻止冒泡
                            console.log('预览按钮被点击，node数据:', node.data);
                            onPreview?.(node); // 触发预览
                        }}
                    >
                    👁️
                    </span>
                )}
                {/*TODO: 文件夹提供别的下载方式*/}
                {(
                    <>
                        <span
                            title="下载"
                            style={{cursor: 'pointer'}}
                            onClick={(e) => {
                                e.stopPropagation(); // 阻止冒泡
                                console.log('下载', node.data.id);
                                handleDownload(node.data.id, node.data.type);
                            }}
                        >
                            ⬇️
                        </span>

                        <span
                            title="删除"
                            style={{cursor: 'pointer'}}
                            onClick={(e) => {
                                e.stopPropagation(); // 阻止冒泡
                                console.log('删除', node.data.name);
                                handleDelete();
                            }}
                        >
                            🗑️
                        </span>

                        <span
                            title="分享"
                            style={{cursor: 'pointer'}}
                            onClick={(e) => {
                                e.stopPropagation(); // 阻止冒泡
                                console.log('分享', node.data.name);
                                handleShare();
                            }}
                        >
                            📤
                        </span>
                    </>
                )}
            </div>

            {/* 解决方案：
              添加一个包装器 div，并使用 onClick 捕获所有来自
              Share 和 Delete 弹窗的冒泡事件，并阻止它们
              进一步冒泡到父 div 的 handleClick。
            */}
            <div onClick={(e) => e.stopPropagation()}>
                <Share
                    fileName={node.data.id || ''}
                    visible={shareVisible}
                    type={node.data.type}
                    onClose={() => setShareVisible(false)}
                />
                <Delete
                    fileName={node.data.id || ''}
                    visible={deleteVisible}
                    onClose={() => setDeleteVisible(false)}
                />
            </div>
        </div>
    );
}