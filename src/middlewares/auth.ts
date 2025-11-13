import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
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
        const secret = process.env.JWT_SECRET || "dev-secret";
        const decoded = jwt.verify(token, secret);
        if (typeof decoded !== "string" && (decoded as JwtPayload).id) {
            res.locals.user = (decoded as JwtPayload).id;
            return next();
        }
        return res.status(401).json({ message: "Invalid token" });
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};