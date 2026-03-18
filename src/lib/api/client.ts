export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

function interpolate(message: string, params: Record<string, string | number>) {
    return message.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

async function parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message = typeof payload === 'object' && payload && 'error' in payload
            ? String((payload as {error: string}).error)
            : interpolate('\u8bf7\u6c42\u5931\u8d25\uff0c\u72b6\u6001\u7801 {status}', {status: response.status});
        throw new ApiError(message, response.status);
    }

    return payload as T;
}

async function request<T>(url: string, init?: RequestInit) {
    const response = await fetch(url, {
        credentials: 'include',
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
    });

    return parseResponse<T>(response);
}

export const apiClient = {
    get<T>(url: string) {
        return request<T>(url, {method: 'GET'});
    },
    post<T = unknown>(url: string, body?: unknown) {
        return request<T>(url, {
            method: 'POST',
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    },
    put<T = unknown>(url: string, body?: unknown) {
        return request<T>(url, {
            method: 'PUT',
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    },
    delete<T = unknown>(url: string) {
        return request<T>(url, {method: 'DELETE'});
    },
    async upload<T>(url: string, formData: FormData, onProgress?: (progress: number) => void) {
        return new Promise<T>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.withCredentials = true;

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    onProgress?.(Math.round((event.loaded / event.total) * 100));
                }
            };

            xhr.onload = () => {
                try {
                    const payload = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(payload as T);
                        return;
                    }
                    reject(new ApiError(payload.error || '\u4e0a\u4f20\u5931\u8d25', xhr.status));
                } catch (error) {
                    reject(error);
                }
            };

            xhr.onerror = () => reject(new ApiError('\u7f51\u7edc\u8bf7\u6c42\u5931\u8d25', xhr.status || 500));
            xhr.send(formData);
        });
    },
};
