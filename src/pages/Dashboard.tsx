// // src/pages/Dashboard.tsx
// import {useEffect, useRef, useState} from 'react';
// import "../styles/Dashboard.css";
// import type {FileTreeNode} from "../components/file_tree/FileTree.tsx";
// import FileTree from "../components/file_tree/FileTree.tsx";
// import { config } from 'process';


// type FileItem = { name: string, size: string, mtime: string ,type: 'file' | 'folder', children?: FileItem[]};
// type UserUsage = { name: string, size: string};



// function parseSize(sizeStr: string): number {
//     if (!isNaN(Number(sizeStr))) {
//         console.log(`直接解析大小: ${sizeStr}`);
//         return Number(sizeStr);
//     }
//     const match = sizeStr.match(/(\d+(?:\.\d+)?)(\s*)([a-zA-Z]+)/);
//     if (!match) return 0;
//     // 如果已经是数值类型了，直接返回
//     console.log(`解析大小: ${sizeStr} => ${match}`);
//     const [_, numStr, , unit] = match;
//     const num = parseFloat(numStr);
//     const unitMap: Record<string, number> = {
//         BYTES: 1,
//         KB: 1024,
//         MB: 1024 ** 2,
//         GB: 1024 ** 3,
//     };
//     return num * (unitMap[unit.toUpperCase()] || 1);
// }

// function pageDataToTreeData(files: FileItem[]) {
//     const tree: FileTreeNode[] = [];

//     console.log(files);

//     files.forEach(file => {
//         console.log(`文件名: ${file.name}`);
//         const parts = file.name.split('/');
//         let currentLevel = tree;

//         parts.forEach((part, index) => {
//             const isLeaf = index === parts.length - 1; // 是否是最终节点（文件/文件夹）

//             let node = currentLevel.find(n => n.name === part);
//             if (!node) {
//                 const id = parts.slice(0, index + 1).join('/'); 
//                 node = {
//                     // id: `${parts.slice(0, index + 1).join('-')}`,
//                     id,
//                     name: part,
//                     children: [],
//                     type: isLeaf ? file.type : 'folder', 
//                     size: isLeaf ? file.size : undefined,
//                     mtime: isLeaf ? file.mtime.replace('T', ' ').replace('Z', '') : undefined,
//                 };
//                 currentLevel.push(node);
//             }
//             // if (index === parts.length - 1) {
//             // }
//             currentLevel = node.children!;
//         });
//     })
//     return tree;
// }
// /**
//  * 递归为树形结构的每个节点添加唯一 ID（保留后端已有 children）
//  * @param nodes 后端返回的文件列表（含文件夹的 children）
//  * @param parentId 父节点 ID（递归传递，初始为空）
//  * @returns 带唯一 ID 的树形结构
//  */
// function addIdsToTree(nodes: FileItem[], parentId = ""): FileTreeNode[] {
//   return nodes.map((node, index) => {
//     // 生成唯一 ID：父 ID + 节点名称（保证层级唯一性，如 "1/2/3"）
//     const id = parentId ? `${parentId}/${node.name}` : node.name; 

//     const newNode: FileTreeNode = {
//       id,
//       name: node.name,
//       type: node.type,
//       size: node.size,
//       mtime: node.mtime.replace('T', ' ').replace('Z', ''),
//       children: [], // 先初始化，再填充子节点
//     };

//     // 若为文件夹，且后端返回了 children（递归处理子节点）
//     if (node.type === 'folder' && Array.isArray(node.children)) {
//       newNode.children = addIdsToTree(node.children, id);
//     }

//     return newNode;
//   });
// }

// const colorPalette = [
//     '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336',
//     '#00bcd4', '#8bc34a', '#ffc107', '#e91e63', '#3f51b5'
// ];

// export default function Dashboard() {
//     // 总用量
//     const [userUsage, setUserUsage] = useState<UserUsage[]>([]);
//     const [files, setFiles] = useState<FileItem[]>([]);
//     const [filesByType, setFilesByType] = useState<Record<string, number>>({});
//     const [usage, setUsage] = useState('');

//     const [selectedFile, setSelectedFile] = useState<File | null>(null);
//     const [selectedFolderFiles, setSelectedFolderFiles] = useState<FileList | null>(null);
//     const [selectedFolderName, setSelectedFolderName] = useState('');
//     const [uploading, setUploading] = useState(false);
//     const [uploadError, setUploadError] = useState('');
//     const [uploadProgress, setUploadProgress] = useState(0);
//     const folderInputRef = useRef<HTMLInputElement>(null);

//     const [data, setData] = useState<FileTreeNode[]>([]);
//     useEffect(() => {
//     // 强制设置文件夹选择属性（确保浏览器识别）
//     if (folderInputRef.current) {
//       folderInputRef.current.setAttribute('directory', '');
//       folderInputRef.current.setAttribute('webkitdirectory', '');
//     }
//   }, []);


//     // 三个useEffect，一个用于获取文件列表和磁盘用量，一个更新文件树，另一个用于按照文件类型计算总站用
//     useEffect(() => {
//         fetch('/api/files', {
//             credentials: 'include' // 确保发送cookie
//         })
//             .then(res => res.json())
//             .then(data => {
//                 // 🔴 打印接口返回的原始数据
//                 console.log('前端接收的原始数据:', JSON.stringify(data, null, 2));
//                 setFiles(data.files || []);
//                 setUsage(data.usage || '')
//             })
//     }, []);
//     // 获取每个人的用量
//     useEffect(() => {
//         fetch('/api/usage', {
//             credentials: 'include' // 确保发送cookie
//         })
//             .then(res => res.json())
//             .then(data => {
//                 console.log("DEBUGGING");
//                 console.log(data.usage);
//                 setUserUsage(data.usage || []);
//             });
//     }, []);
//     useEffect(() => {
//         console.log('files',files);
        
//         setData(addIdsToTree(files));
//         if (files.length > 0) {
//             const fileTypes: Record<string, number> = {};
//             files.forEach(file => {
//                 const parts = file.name.split('.');
//                 const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
//                 const size = parseSize(file.size);
//                 if (ext) {
//                     fileTypes[ext] = (fileTypes[ext] || 0) + size;
//                 }
//             });
//             setFilesByType(fileTypes);
//         }
//     }, [files]);

//     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         if (e.target.files && e.target.files.length > 0) {
//             // TODO 一个奇怪的报错，但是不影响
//             setSelectedFile(e.target.files[0]);
//             setSelectedFolderFiles(null);
//             setSelectedFolderName('');
//             setUploadError('');
//         }
//     };

//     const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         if (e.target.files && e.target.files.length > 0) {
//             setSelectedFolderFiles(e.target.files);
//             setSelectedFile(null);
//             setUploadError('');
//             // 打印所有文件的相对路径（关键：确认是否带层级）
//             Array.from(e.target.files).forEach(file => {
//                 console.log('前端待上传的文件路径:', file.webkitRelativePath); 
//                 // 预期格式："文件夹名/子文件夹名/文件名.后缀"（如 "test/07/calculateDays.py"）
//             });
//             // 提取文件夹名称
//             if (e.target.files[0].webkitRelativePath) {
//                 const pathParts = e.target.files[0].webkitRelativePath.split('/');
//                 if (pathParts.length > 0) {
//                     setSelectedFolderName(pathParts[0]);
//                 }
//             }
            
//         }
//     };

//     const handleUpload = (isFolder = false) => {
//         if ((!selectedFile && !selectedFolderFiles) || uploading) return;

//         setUploading(true);
//         setUploadError('');
//         setUploadProgress(0);

//         const formData = new FormData();
        
//         if (isFolder && selectedFolderFiles) {
//             // 添加文件夹中的所有文件
//             Array.from(selectedFolderFiles).forEach(file => {
//                 const newFile = new File([file], file.webkitRelativePath); 
//                 formData.append('folderFiles', newFile);
//                 // formData.append('folderFiles', file, file.webkitRelativePath);
//                 console.log('添加到FormData的路径:', file.webkitRelativePath); // 再次确认路径
//             });
//             // 🌟 关键：遍历 FormData 查看 folderFiles 字段的所有内容
//         console.log('\n=== FormData 中 folderFiles 的所有内容 ===');
//         let index = 0;
//         // 遍历 FormData 的所有条目
//         for (const [key, value] of formData.entries()) {
//         // 筛选出键为 folderFiles 的条目
//             if (key === 'folderFiles') {
//                 index++;
//         // value 是 File 对象，可获取其名称、路径等属性
//             const file = value as File;
//             console.log(`文件 ${index}:`);
//             console.log('  字段名:', key);
//             console.log('  文件名:', file.name); // 原始文件名（不含路径）
//             console.log('  相对路径:', file.webkitRelativePath); // 前端传递的完整路径（含 07/）
//             console.log('  文件大小:', file.size + ' bytes');
//             console.log('  MIME类型:', file.type);
//             }
//         }
//             // 添加文件夹名称
//             formData.append('folderName', selectedFolderName);
//         } else if (selectedFile) {
//             // 单个文件上传
//             formData.append('file', selectedFile);
//         }

//         const xhr = new XMLHttpRequest();

//         xhr.upload.onprogress = (event) => {
//             if (event.lengthComputable) {
//                 const percent = Math.round((event.loaded / event.total) * 100);
//                 setUploadProgress(percent);
//             }
//         };

//         xhr.onload = () => {
//             if (xhr.status === 200) {
//                 // 上传成功，重新获取文件列表
//                 fetch('/api/files', {
//                     credentials: 'include'
//                 })
//                     .then(res => res.json())
//                     .then(data => {
//                         setFiles(data.files || []);
//                         setUsage(data.usage || '');
//                     });
                
//                 // 重置选择状态
//                 setSelectedFile(null);
//                 setSelectedFolderFiles(null);
//                 setSelectedFolderName('');
//                 setUploadProgress(0);
//             } else {
//                 setUploadError(`上传失败（状态码：${xhr.status}）`);
//             }
//             setUploading(false);
//         };

//         xhr.onerror = () => {
//             setUploadError('上传出错，请重试');
//             setUploading(false);
//         };

//         // 设置请求
//         const url = isFolder ? '/api/upload-folder' : '/api/upload';
//         xhr.open('POST', url, true);
//         xhr.withCredentials = true;
//         xhr.send(formData);
//     };

//     const totalSize = files.reduce((sum, f) => sum + parseSize(f.size), 0);
//     const segments = Object.entries(filesByType).map((name, idx) => {
//         const size = filesByType[name[0]];
//         const percent = totalSize > 0 ? (size / totalSize) * 100 : 0;
//         return {
//             name: name[0],
//             percent,
//             color: colorPalette[idx % colorPalette.length]
//         };
//     });
    
//     // 计算总用量
//     const totalUsageSize = userUsage.reduce((sum, u) => sum + parseSize(u.size), 0);
//     return (
//         <div className="dashboard-container">
//             {/* <UserInfo/> */}
//             <h2>文件存储概览</h2>
//             <p>个人磁盘用量: {usage}</p>
//             <div className="storage-bar">
//                 {segments.map((seg, idx) => (
//                     <div
//                         key={idx}
//                         className="storage-segment"
//                         style={{width: `${seg.percent}%`, backgroundColor: seg.color}}
//                         title={`${seg.name}: ${seg.percent.toFixed(1)}%`}
//                     />
//                 ))}
//             </div>
//             <ul className="storage-legend">
//                 {segments.map((seg, idx) => (
//                     <li key={idx}>
//                         <span className="legend-dot" style={{backgroundColor: seg.color}}></span>
//                         {seg.name} - {seg.percent.toFixed(1)}%
//                     </li>
//                 ))}
//             </ul>

//             <h2>总体磁盘概览</h2>
//             <p>总用量: {totalUsageSize > 0 ? `${(totalUsageSize / (1024 ** 3)).toFixed(2)} GB` : '0 GB'}</p>
//             <div className="storage-bar">
//                 {userUsage.map((usage, idx) => (
//                     <div key={idx}
//                             className="storage-segment"
//                             style={{
//                                 width: `${totalUsageSize > 0 ? (parseSize(usage.size) / totalUsageSize * 100) : 0}%`,
//                                 backgroundColor: colorPalette[idx % colorPalette.length]
//                             }}
//                             title={`${usage.name}: ${usage.size}`}>
//                     </div>
//                 ))}
//             </div>
//             <ul className={"storage-legend"}>
//                 {userUsage.map((usage, idx) => (
//                     <li key={idx}>
//                         <span className="legend-dot"
//                               style={{backgroundColor: colorPalette[idx % colorPalette.length]}}></span>
//                         {usage.name} - {usage.size}
//                     </li>
//                 ))}
//             </ul>

//             <div className="upload-section">
//                 {/* 单个文件上传 */}
//                 <input
//                     type="file"
//                     id="file-upload"
//                     style={{display: 'none'}}
//                     onChange={handleFileChange}
//                 />
//                 <label htmlFor="file-upload" className="upload-btn">
//                     选择文件
//                 </label>
                
//                 {/* 文件夹上传 */}
//                 <input
//                     ref={folderInputRef}
//                     type="file"
//                     id="folder-upload"
//                     style={{display: 'none'}}
//                     onChange={handleFolderChange}
//                     // webkitdirectory
//                     // directory
//                 />
//                 <label htmlFor="folder-upload" className="upload-btn">
//                     选择文件夹
//                 </label>
                
//                 {/* 显示选中的文件或文件夹 */}
//                 {(selectedFile || selectedFolderName) && (
//                     <span className="selected-file">
//                         {selectedFile ? selectedFile.name : `文件夹: ${selectedFolderName}`}
//                     </span>
//                 )}
                
//                 {/* 上传按钮 */}
//                 <button
//                     className="upload-btn"
//                     onClick={() => handleUpload(!!selectedFolderFiles)}
//                     disabled={(uploading) || (!selectedFile && !selectedFolderFiles)}
//                 >
//                     {uploading ? '上传中...' : '开始上传'}
//                 </button>
                
//                 {/* 错误信息 */}
//                 {uploadError && (
//                     <div className="upload-error">{uploadError}</div>
//                 )}
                
//                 {/* 上传进度条 */}
//                 {uploading && (
//                     <div className="upload-progress-bar">
//                         <div
//                             className="upload-progress-fill"
//                             style={{width: `${uploadProgress}%`}}
//                         ></div>
//                     </div>
//                 )}
//             </div>
            
//             <div className="file-tree-container">
//                 <FileTree data={data}/>
//             </div>

//         </div>
//     );
// }

// src/pages/Dashboard.tsx
import {useEffect, useRef, useState} from 'react';
import "../styles/Dashboard.css";
import type {FileTreeNode} from "../components/file_tree/FileTree.tsx";
import FileTree from "../components/file_tree/FileTree.tsx";


type FileItem = { name: string, size: string, mtime: string ,type: 'file' | 'folder', children?: FileItem[]};
type UserUsage = { name: string, size: string};


/**
 * 将带单位的大小字符串（如 "1.5 MB"）解析为字节数。
 * @param sizeStr 大小字符串或字节数（作为字符串）
 * @returns 字节数（number）
 */
function parseSize(sizeStr: string): number {
    if (!isNaN(Number(sizeStr))) {
        return Number(sizeStr);
    }
    const match = sizeStr.match(/(\d+(?:\.\d+)?)(\s*)([a-zA-Z]+)/);
    if (!match) return 0;
    
    const [_, numStr, , unit] = match;
    const num = parseFloat(numStr);
    const unitMap: Record<string, number> = {
        BYTES: 1,
        B: 1, 
        KB: 1024,
        MB: 1024 ** 2,
        GB: 1024 ** 3,
    };
    return num * (unitMap[unit.toUpperCase()] || 1);
}

/**
 * 将字节数格式化为可读字符串（KB, MB, GB）。
 * @param bytes 字节数
 * @param decimals 小数点位数
 * @returns 格式化后的字符串
 */
function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


function pageDataToTreeData(files: FileItem[]) {
    // 保持不变，但Dashboard组件中未使用
    const tree: FileTreeNode[] = [];
    files.forEach(file => {
        const parts = file.name.split('/');
        let currentLevel = tree;

        parts.forEach((part, index) => {
            const isLeaf = index === parts.length - 1; 

            let node = currentLevel.find(n => n.name === part);
            if (!node) {
                const id = parts.slice(0, index + 1).join('/'); 
                node = {
                    id,
                    name: part,
                    children: [],
                    type: isLeaf ? file.type : 'folder', 
                    size: isLeaf ? file.size : undefined,
                    mtime: isLeaf ? file.mtime.replace('T', ' ').replace('Z', '') : undefined,
                };
                currentLevel.push(node);
            }
            currentLevel = node.children!;
        });
    })
    return tree;
}

/**
 * 递归为树形结构的每个节点添加唯一 ID，并计算文件夹的总用量。
 */
function addIdsAndCalculateSize(nodes: FileItem[], parentId = ""): FileTreeNode[] {
    return nodes.map((node) => {
        const id = parentId ? `${parentId}/${node.name}` : node.name; 

        const newNode: FileTreeNode = {
            id,
            name: node.name,
            type: node.type,
            size: node.size, 
            mtime: node.mtime ? node.mtime.replace('T', ' ').replace('Z', '') : undefined,
            children: [],
        };
        
        let folderTotalSize = 0;

        if (node.type === 'folder' && Array.isArray(node.children)) {
            newNode.children = addIdsAndCalculateSize(node.children, id);
            
            folderTotalSize = newNode.children.reduce((sum, child) => {
                return sum + (child.size ? parseSize(child.size) : 0);
            }, 0);
            
            newNode.size = formatBytes(folderTotalSize); 
        }

        return newNode;
    });
}


const colorPalette = [
    '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336',
    '#00bcd4', '#8bc34a', '#ffc107', '#e91e63', '#3f51b5'
];

// 定义用于展示的用量类型，用于前五 + 其他的逻辑
type UsageSegment = {
    name: string;
    sizeBytes: number;
    color: string;
    percent?: number;
};


export default function Dashboard() {
    const [userUsage, setUserUsage] = useState<UserUsage[]>([]);
    const [files, setFiles] = useState<FileItem[]>([]);
    // const [filesByType, setFilesByType] = useState<Record<string, number>>({}); // 废弃，改为前五项统计
    const [usage, setUsage] = useState('');

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFolderFiles, setSelectedFolderFiles] = useState<FileList | null>(null);
    const [selectedFolderName, setSelectedFolderName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const [data, setData] = useState<FileTreeNode[]>([]); // 树形结构数据

    useEffect(() => {
        if (folderInputRef.current) {
            folderInputRef.current.setAttribute('directory', '');
            folderInputRef.current.setAttribute('webkitdirectory', '');
        }
    }, []);

    // 1. 获取文件列表
    useEffect(() => {
        fetch('/api/files', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                setFiles(data.files || []);
                setUsage(data.usage || '') 
            })
    }, []);
    
    // 2. 获取每个人的用量
    useEffect(() => {
        fetch('/api/usage', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                setUserUsage(data.usage || []);
            });
    }, []);
    
    // 3. 构建文件树并计算文件夹大小
    useEffect(() => {
        if (files.length === 0) return;
        
        // 使用递归函数构建树
        const treeData = addIdsAndCalculateSize(files);
        setData(treeData);
        
        // 🚨 文件类型统计被新的根文件前五统计逻辑取代，这里不再设置 filesByType
        // setFilesByType(fileTypes); 

    }, [files]);

    // ... (handleFileChange, handleFolderChange, handleUpload 保持不变)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
            setSelectedFolderFiles(null);
            setSelectedFolderName('');
            setUploadError('');
        }
    };

    const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFolderFiles(e.target.files);
            setSelectedFile(null);
            setUploadError('');
            
            if (e.target.files[0].webkitRelativePath) {
                const pathParts = e.target.files[0].webkitRelativePath.split('/');
                if (pathParts.length > 0) {
                    setSelectedFolderName(pathParts[0]);
                }
            }
        }
    };

    const handleUpload = (isFolder = false) => {
        if ((!selectedFile && !selectedFolderFiles) || uploading) return;

        setUploading(true);
        setUploadError('');
        setUploadProgress(0);

        const formData = new FormData();
        
        if (isFolder && selectedFolderFiles) {
            Array.from(selectedFolderFiles).forEach(file => {
                const newFile = new File([file], file.webkitRelativePath); 
                formData.append('folderFiles', newFile);
            });
            formData.append('folderName', selectedFolderName);
        } else if (selectedFile) {
            formData.append('file', selectedFile);
        }

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                fetch('/api/files', { credentials: 'include' })
                    .then(res => res.json())
                    .then(data => {
                        setFiles(data.files || []);
                        setUsage(data.usage || '');
                    });
                
                setSelectedFile(null);
                setSelectedFolderFiles(null);
                setSelectedFolderName('');
                setUploadProgress(0);
            } else {
                setUploadError(`上传失败（状态码：${xhr.status}）`);
            }
            setUploading(false);
        };

        xhr.onerror = () => {
            setUploadError('上传出错，请重试');
            setUploading(false);
        };

        const url = isFolder ? '/api/upload-folder' : '/api/upload';
        xhr.open('POST', url, true);
        xhr.withCredentials = true;
        xhr.send(formData);
    };

    // ------------------------------------
    // 渲染前的计算逻辑
    // ------------------------------------
    
    // 1. 计算个人磁盘用量（根文件前五 + 其他）
    
    // 根级项目 (FileTreeNode) 及其大小 (bytes)
    const rootItemsWithSize: UsageSegment[] = data.map(node => ({
        name: node.name,
        sizeBytes: parseSize(node.size || '0 Bytes'),
        color: '' // 暂时不需要颜色
    }));
    
    // 按大小降序排序
    rootItemsWithSize.sort((a, b) => b.sizeBytes - a.sizeBytes);
    
    const topFiveItems = rootItemsWithSize.slice(0, 5);
    const otherItems = rootItemsWithSize.slice(5);
    
    const totalSizeTopFive = topFiveItems.reduce((sum, item) => sum + item.sizeBytes, 0);
    const totalSizeOther = otherItems.reduce((sum, item) => sum + item.sizeBytes, 0);
    
    // 个人总用量（所有根项目的总和）
    const personalTotalSize = totalSizeTopFive + totalSizeOther;
    const formattedPersonalUsage = formatBytes(personalTotalSize); 
    
    // 构建用于饼图的 segments (前五 + 其他)
    const segments: UsageSegment[] = topFiveItems.map((item, index) => ({
        ...item,
        color: colorPalette[index % colorPalette.length]
    }));
    
    if (totalSizeOther > 0) {
        // 如果有“其他”项，则添加进去
        segments.push({
            name: '其他',
            sizeBytes: totalSizeOther,
            color: colorPalette[5 % colorPalette.length] // 确保其他项有颜色
        });
    }
    
    // 计算百分比
    const segmentsWithPercent = segments.map(seg => ({
        ...seg,
        percent: personalTotalSize > 0 ? (seg.sizeBytes / personalTotalSize) * 100 : 0
    }));


    // 2. 计算总体磁盘用量（所有用户的总和）
    const totalUsageSize = userUsage.reduce((sum, u) => {
        // 尝试解析 size，即使它看起来像一个没有单位的数字
        return sum + parseSize(u.size);
    }, 0);
    
    // 🚀 修正：使用 formatBytes 确保显示准确和美观
    const formattedTotalUsage = formatBytes(totalUsageSize, 2); 


    return (
        <div className="dashboard-container">
            <h2>文件存储概览</h2>
            
            {/* 个人磁盘用量：显示所有项目的总和 */}
            <p>个人磁盘用量: {formattedPersonalUsage}</p> 
            
            {/* 饼图/进度条：展示前五大根文件/文件夹 + 其他 */}
            <div className="storage-bar">
                {segmentsWithPercent.map((seg, idx) => (
                    <div
                        key={idx}
                        className="storage-segment"
                        style={{width: `${seg.percent}%`, backgroundColor: seg.color}}
                        title={`${seg.name}: ${formatBytes(seg.sizeBytes)} (${seg.percent.toFixed(1)}%)`}
                    />
                ))}
            </div>
            <ul className="storage-legend">
                {segmentsWithPercent.map((seg, idx) => (
                    <li key={idx}>
                        <span className="legend-dot" style={{backgroundColor: seg.color}}></span>
                        {seg.name} - {seg.percent.toFixed(1)}%
                    </li>
                ))}
            </ul>

            <h2>总体磁盘概览</h2>
            {/* 🚀 修正：总用量使用正确的格式化值 */}
            <p>总用量: {formattedTotalUsage}</p> 
            <div className="storage-bar">
                {userUsage.map((usage, idx) => (
                    <div key={idx}
                            className="storage-segment"
                            style={{
                                width: `${totalUsageSize > 0 ? (parseSize(usage.size) / totalUsageSize * 100) : 0}%`,
                                backgroundColor: colorPalette[idx % colorPalette.length]
                            }}
                            title={`${usage.name}: ${usage.size}`}>
                    </div>
                ))}
            </div>
            <ul className={"storage-legend"}>
                {userUsage.map((usage, idx) => (
                    <li key={idx}>
                        <span className="legend-dot"
                                style={{backgroundColor: colorPalette[idx % colorPalette.length]}}></span>
                        {usage.name} - {usage.size}
                    </li>
                ))}
            </ul>
            
            {/* ... (上传部分保持不变) */}
            <div className="upload-section">
                <input
                    type="file"
                    id="file-upload"
                    style={{display: 'none'}}
                    onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="upload-btn">
                    选择文件
                </label>
                
                <input
                    ref={folderInputRef}
                    type="file"
                    id="folder-upload"
                    style={{display: 'none'}}
                    onChange={handleFolderChange}
                />
                <label htmlFor="folder-upload" className="upload-btn">
                    选择文件夹
                </label>
                
                {(selectedFile || selectedFolderName) && (
                    <span className="selected-file">
                        {selectedFile ? selectedFile.name : `文件夹: ${selectedFolderName}`}
                    </span>
                )}
                
                <button
                    className="upload-btn"
                    onClick={() => handleUpload(!!selectedFolderFiles)}
                    disabled={(uploading) || (!selectedFile && !selectedFolderFiles)}
                >
                    {uploading ? '上传中...' : '开始上传'}
                </button>
                
                {uploadError && (
                    <div className="upload-error">{uploadError}</div>
                )}
                
                {uploading && (
                    <div className="upload-progress-bar">
                        <div
                            className="upload-progress-fill"
                            style={{width: `${uploadProgress}%`}}
                        ></div>
                    </div>
                )}
            </div>
            
            <div className="file-tree-container">
                <FileTree data={data}/>
            </div>

        </div>
    );
}