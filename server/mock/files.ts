export function DevEnvGetFile() {
    return {
        files: [
            {name: 'docs/reportttttttttttttttttttttttttttttttttttttttttttttttt.pdf', size: '234567 bytes',mtime: '2023-10-01T12:00:00Z'},
            {name: 'docs/specs/design.docx', size: '87654 bytes',mtime: '2023-10-02T12:00:00Z'},
            {name: 'data/raw/data1.csv', size: '54321 bytes', mtime: '2023-10-03T12:00:00Z'},
            {name: 'data/processed/results.json', size: '66552 bytes', mtime: '2023-10-04T12:00:00Z'},
            {name: 'images/logo.png', size: '123456 bytes',mtime: '2023-10-05T12:00:00Z'},
            {name: 'archive/logs.zip', size: '88234 bytes',mtime: '2023-10-06T12:00:00Z'},
            {name: 'README.md', size: '1024 bytes', mtime: '2023-10-07T12:00:00Z'},
        ],
        usage: '512K'
    };
}


export function DevEnvGetUserUsage(){
    return {
        usage: [
            {name: 'xuyi', size: '1200000 bytes', mtime: '2023-10-01T12:00:00Z'},
            {name: 'zhangsan', size: '800000 bytes', mtime: '2023-10-02T12:00:00Z'},
            {name: 'lisi', size: '5000000 bytes', mtime: '2023-10-03T12:00:00Z'},
            {name: 'wangwu', size: '300000 bytes', mtime: '2023-10-04T12:00:00Z'},
        ],
        total: '2.8G',
        free: '7.2G',
    }
}