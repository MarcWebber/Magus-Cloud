import jwt from 'jsonwebtoken';
import {Request, Response} from 'express';
import {getSystemSettings} from '../config/store';
import {SessionPayload} from '../config/types';

const LEGACY_COOKIE_NAME = 'token';

function getSessionSecret() {
    return process.env.MAGUS_SESSION_SECRET || process.env.JWT_SECRET || 'Xkw20021114';
}

export function signSession(payload: SessionPayload) {
    const settings = getSystemSettings();
    return jwt.sign(payload, getSessionSecret(), {
        expiresIn: settings.auth.sessionTtlSeconds,
    });
}

export function getSessionCookieNames() {
    const settings = getSystemSettings();
    return [settings.auth.cookieName, LEGACY_COOKIE_NAME];
}

export function readSessionFromRequest(req: Request): SessionPayload | null {
    const cookieNames = getSessionCookieNames();

    for (const name of cookieNames) {
        const token = req.cookies?.[name];
        if (!token) {
            continue;
        }

        try {
            const decoded = jwt.verify(token, getSessionSecret()) as SessionPayload | jwt.JwtPayload;
            if (typeof decoded === 'string') {
                continue;
            }

            if ('username' in decoded && typeof decoded.username === 'string') {
                return {
                    username: decoded.username,
                    role: (decoded.role as SessionPayload['role']) || 'user',
                    provider: (decoded.provider as SessionPayload['provider']) || 'legacy',
                    avatarUrl: typeof decoded.avatarUrl === 'string' ? decoded.avatarUrl : undefined,
                };
            }
        } catch {
            continue;
        }
    }

    return null;
}

export function setSessionCookies(res: Response, payload: SessionPayload) {
    const settings = getSystemSettings();
    const token = signSession(payload);
    const maxAge = settings.auth.sessionTtlSeconds * 1000;
    const secure = process.env.NODE_ENV === 'production';

    res.cookie(settings.auth.cookieName, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge,
    });

    res.clearCookie(LEGACY_COOKIE_NAME);
}

export function clearSessionCookies(res: Response) {
    const settings = getSystemSettings();
    const secure = process.env.NODE_ENV === 'production';

    res.clearCookie(settings.auth.cookieName, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
    });
    res.clearCookie(LEGACY_COOKIE_NAME, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
    });
    res.clearCookie('avatarUrl', {
        httpOnly: true,
        sameSite: 'lax',
        secure,
    });
}
