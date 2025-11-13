import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../services/prismaClient.js';
import { UnauthorizedError } from "../errors/httpErrors.js";

export async function registerUser(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: {
            firstName,
            lastName,
            email,
            password: hashedPassword,
        }
    });
    return generateToken(user.id);
}

export async function loginUser(email: string, password: string) {
    const user = await prisma.user.findUnique({
        where: {email},
    });

    if(!user || ! await bcrypt.compare(password, user.password)){
        throw new UnauthorizedError('Invalid email or password');
    }
}

function generateToken(userId: number){
    const secret = process.env.JWT_SECRET || 'dev-secret';
    return jwt.sign({id: userId}, secret, {expiresIn: '24h'})
}