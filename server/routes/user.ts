import {Router} from "express";
import {JWT_SECRET} from "../constants";
import jwt from "jsonwebtoken";

const router = Router();
router.post('/user/me', (req, res) => {
    const token = req.cookies?.token;
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({error: 'Token 无效'});
        }
        const username = user;
        const avatarUrl = req.cookies?.avatarUrl || '';
        res.json({username, avatarUrl});
    });
});