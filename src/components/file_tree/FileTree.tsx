// src/components/file_tree/FileTree.tsx
import React, {useRef} from 'react';

import {Tree, NodeApi, NodeRendererProps, TreeApi} from 'react-arborist';
import Styles from './FileTree.module.css';

export type FileTreeNode = {
    id: string;
    name: string;
    children?: FileTreeNode[];
    size?: string;
    type: 'file' | 'folder';

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
    const treeRef = useRef<TreeApi<FileTreeNode> | null>(null);
    const expandOrCollapseAll = (expand: boolean) => {
        const tree = treeRef.current;
        // console.log(tree);
        if (!tree) return;
        if (expand){
            tree.openAll();
        }else{
            tree.closeAll();
        }
    };
    function onClickDelete(node: NodeApi<FileTreeNode>) {

    }

    function onClickDownload(node: NodeApi<FileTreeNode>) {

    }
    return (
        <div className={Styles['file-tree-container']}>
            <div className="tree-actions mb-2 flex gap-2">
                <button onClick={() => expandOrCollapseAll(true)}>展开全部</button>
                <button onClick={() => expandOrCollapseAll(false)}>收起全部</button>
            </div>
            {/*TODO: 自适应宽度*/}
            <Tree<FileTreeNode>
                className={Styles['file-tree']}
                data={data}
                ref={treeRef}
                openByDefault={true}
                width={1000}
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
                {(props) => <CustomNode {...props} />}
            </Tree>
        </div>
    );
}

function CustomNode({
                        node,
                        style,
                        dragHandle,
                        onSelect,
                    }: NodeRendererProps<FileTreeNode> & {
    onSelect?: (node: NodeApi<FileTreeNode>) => void;
}) {
    const isFolder = node.data.type === 'folder';

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

    const getIcon = (name:string) => {
        if (isFolder) {
            return node.isOpen ? '📂' : '📁';
        }
        if (name.endsWith('.txt')) {
            return '📄'; // 文本文件
        }
        if (name.endsWith('.jpg') || name.endsWith('.png')) {
            return '🖼️'; // 图片文件
        }
        if (name.endsWith('.mp4') || name.endsWith('.avi')) {
            return '🎥'; // 视频文件
        }
        if (name.endsWith('.mp3') || name.endsWith('.wav')) {
            return '🎵'; // 音频文件
        }
        // 压缩文件
        if (name.endsWith('.zip') || name.endsWith('.rar')) {
            return '📦'; // 压缩文件
        }
        // pdf
        if (name.endsWith('.pdf')) {
            return '📑'; // PDF文件
        }
        // 表格文件
        if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
            return '📈'; // 表格/数据文件
        }
        return '📄'; // 默认文件图标
    }

    return (
        <div
            ref={dragHandle}
            style={style}
            className={Styles['tree-node-item']}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
        >
            <span>{getIcon(node.data.name)}</span>
            <span className={Styles['node-name']}>{node.data.name}</span>
            {/* 文件大小 */}
            <div className={Styles['node-size']}>
                {node.data.size || '--'}
            </div>

            {/* 上传时间 */}
            <div className={Styles['node-time']}>
                {'--'}
            </div>

            <div className={Styles['tree-node-actions']}>
                {/*TODO: 文件夹提供别的下载方式*/}
                { (
                    <>
                        <span
                            title="下载"
                            style={{cursor: 'pointer'}}
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log('下载', node.data.name);
                            }}
                        >
                            ⬇️
                        </span>
                        <span
                            title="删除"
                            style={{cursor: 'pointer'}}
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log('删除', node.data.name);
                            }}
                        >
                            🗑️
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}
