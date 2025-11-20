import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import "../config/env.js";

export const auth = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const secret = env.jwtSecret;
        const decoded = jwt.verify(token, secret) as JwtPayload | string;
        if (typeof decoded !== "string" && decoded.id) {
            res.locals.user = { id: decoded.id, role: decoded.role };
            return next();
        }
        return res.status(401).json({ message: "Invalid token" });
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};