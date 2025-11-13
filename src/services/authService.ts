import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../services/prismaClient.js';
import { UnauthorizedError } from "../errors/httpErrors.js";
import { env } from "../config/env.js"
export async function registerUser(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    role: string
) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: {
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: role
        } as any
    });
    return generateToken(user.id, role);
}

export async function loginUser(email: string, password: string) {
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if(!user || ! await bcrypt.compare(password, user.password)){
        throw new UnauthorizedError('Invalid email or password');
    }
    const role = (user as any).role as string; // cast for now until Prisma types are regenerated
    return generateToken(user.id, role);
}

function generateToken(userId: number, role: string){
    const secret = env.jwtSecret;
    return jwt.sign({ id: userId, role }, secret, { expiresIn: '24h' });
}