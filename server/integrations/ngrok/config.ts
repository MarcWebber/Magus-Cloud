import fs from 'fs';
import path from 'path';
import {SystemSettings} from '../../lib/config/types';

export function getNgrokConfigPath() {
    return path.resolve(process.cwd(), process.env.MAGUS_DATA_DIR || 'data', 'ngrok.yml');
}

export function syncNgrokConfig(settings: SystemSettings) {
    fs.mkdirSync(path.dirname(getNgrokConfigPath()), {recursive: true});
    const lines = [
        `version: 2`,
        `authtoken: ${settings.ngrok.authtoken || ''}`,
        `tunnels:`,
        `  ${settings.ngrok.tunnelName || 'magus-cloud'}:`,
        `    proto: http`,
        `    addr: ${settings.ngrok.addr || 'app:3000'}`,
    ];

    if (settings.ngrok.domain) {
        lines.push(`    domain: ${settings.ngrok.domain}`);
    }

    fs.writeFileSync(getNgrokConfigPath(), `${lines.join('\n')}\n`, 'utf8');
}
