import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First Name is required').max(100, 'Name too long'),
  lastName: z.string().min(1, 'Last Name is required').max(100, 'Name too long'),
  email: z.email('Invalid email').max(100, 'Email too long'),
  password: z
    .string()
    .min(8, { message: 'Password should be at least 8 characters long' })
    .refine((p) => /[A-Z]/.test(p), { message: 'Password needs to include an uppercase letter' })
    .refine((p) => /[a-z]/.test(p), { message: 'Password needs to include an lowercase letter' })
    .refine((p) => /[0-9]/.test(p), { message: 'Password needs to include a number' })
    .refine((p) => /[!@#$%^&*]/.test(p), { message: 'Password needs to include a symbol' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords need to match',
  path: ['confirmPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
