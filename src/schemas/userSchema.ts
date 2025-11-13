import { z } from 'zod';

export const createUserSchema = z.object({
  firstName: z.string().min(1, 'First Name is required').max(100, "Name Too Long"),
  lastName: z.string().min(1, 'Last Name is required').max(100, "Name Too Long"),

  email: z.string().email("Invalid email").min(1, "Email is required").max(100, "Email too Long"),
  
  password: z.string()
  .min(8, { message: "Password should be at least 8 characters long" })
  .refine((password) => /[A-Z]/.test(password), {
    message: "Password needs to include an uppercase letter",
  })
  .refine((password) => /[a-z]/.test(password), {
    message: "Password needs to include an lowercase letter",
  })
  .refine((password) => /[0-9]/.test(password), 
  { message: "Password needs to include a number" })
  .refine((password) => /[!@#$%^&*]/.test(password), {
    message: "Password needs to include a symbol",
  }),
  
  confirmPassword: z.string()
})
.refine((data) => data.password === data.confirmPassword, {
    message: "Passwords need to match",
    path: ['confirmPassword']
    });

export type CreateUserInput = z.infer<typeof createUserSchema>;
