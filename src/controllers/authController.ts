import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from "../services/authService.js";

export async function register (req: Request, res: Response, next: NextFunction){
    const {
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
    } = req.body;
    try {

        const token = await registerUser( 
            firstName,
            lastName,
            email,
            password,
        );

        res.status(200).send({token});
    } catch (err) {
        next(err);
    }
}

export async function login (req: Request, res: Response, next: NextFunction){
    const { email, password } = req.body;

    try {
        const token = await loginUser(email, password);
        res.status(200).send({token});
    } catch (err) {
        next(err);
    }
}