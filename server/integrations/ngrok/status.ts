import {getSystemSettings} from '../../lib/config/store';

export async function getNgrokStatus() {
    const settings = getSystemSettings();

    if (!settings.ngrok.enabled || !settings.ngrok.apiUrl) {
        return {
            connected: false,
            publicUrl: '',
            tunnels: [],
        };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    try {
        const response = await fetch(`${settings.ngrok.apiUrl.replace(/\/$/, '')}/api/tunnels`, {
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`ngrok api responded ${response.status}`);
        }

        const data = await response.json() as {
            tunnels?: Array<{name?: string; public_url?: string; proto?: string}>;
        };

        return {
            connected: Boolean(data.tunnels?.length),
            publicUrl: data.tunnels?.[0]?.public_url || '',
            tunnels: data.tunnels || [],
        };
    } catch {
        return {
            connected: false,
            publicUrl: '',
            tunnels: [],
        };
    } finally {
        clearTimeout(timeout);
    }
}
