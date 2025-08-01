import {FileTreeNode} from "./components/file_tree/FileTree.tsx";

export const initialData: FileTreeNode[] = [
    {
        id: '1',
        name: 'docs',
        type: 'folder',
        children: [
            { id: '2', name: 'report.pdf', type: 'file' },
            { id: '3', name: 'design.docx', type: 'file' },
        ],
    },
    {
        id: '4',
        name: 'image.png',
        type: 'file',
    },
];

//     const getIcon = (name: string) => {
//         if (isFolder) {
//             return node.isOpen ? '📂' : '📁';
//         }
//         if (name.endsWith('.txt')) {
//             return '📄'; // 文本文件
//         }
//         if (name.endsWith('.jpg') || name.endsWith('.png')) {
//             return '🖼️'; // 图片文件
//         }
//         if (name.endsWith('.mp4') || name.endsWith('.avi')) {
//             return '🎥'; // 视频文件
//         }
//         if (name.endsWith('.mp3') || name.endsWith('.wav')) {
//             return '🎵'; // 音频文件
//         }
//         // 压缩文件
//         if (name.endsWith('.zip') || name.endsWith('.rar')) {
//             return '📦'; // 压缩文件
//         }
//         // pdf
//         if (name.endsWith('.pdf')) {
//             return '📑'; // PDF文件
//         }
//         // 表格文件
//         if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
//             return '📈'; // 表格/数据文件
//         }
//         return '📄'; // 默认文件图标
//     }
export const extMap: Record<string, string> = {
    "txt":'📄',
    "jpg":'🖼️',
    "png":'🖼️',
    "mp4":'🎥',
    "avi":'🎥',
    "mp3":'🎵',
    "wav":'🎵',
    "zip":'📦',
    "rar":'📦',
    "pdf":'📑',
    "xls":'📈',
    "xlsx":'📈',
    "csv":'📈',
    "docx":'📄',
    "json":'📄',
    "html":'🌐',

}