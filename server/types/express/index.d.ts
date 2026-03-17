import { JwtPayload } from 'jsonwebtoken';
import { SessionPayload } from '../../lib/config/types';

declare global {
    namespace Express {
        interface Request {
            username?: string;
            user?: string | JwtPayload | SessionPayload;
        }
    }
}
