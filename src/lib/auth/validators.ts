import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60, 'Name is too long.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password is too long.')
    .regex(/[a-zA-Z]/, 'Password must contain a letter.')
    .regex(/[0-9]/, 'Password must contain a number.'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password is too long.')
    .regex(/[a-zA-Z]/, 'Password must contain a letter.')
    .regex(/[0-9]/, 'Password must contain a number.'),
});

export const reviewCreateSchema = z.object({
  rating: z.number().int('Rating must be a whole number.').min(1, 'Rating must be at least 1.').max(5, 'Rating must be at most 5.'),
  review: z.string().trim().min(10, 'Review must be at least 10 characters.').max(1000, 'Review must be under 1000 characters.'),
  role: z.string().trim().max(60, 'Role is too long.').optional().nullable(),
  company: z.string().trim().max(80, 'Company is too long.').optional().nullable(),
  platform: z
    .enum(['direct', 'google', 'trustpilot', 'producthunt', 'facebook', 'g2', 'x', 'linkedin'])
    .default('direct'),
});

export const reviewUpdateSchema = z
  .object({
    rating: z
      .number()
      .int('Rating must be a whole number.')
      .min(1, 'Rating must be at least 1.')
      .max(5, 'Rating must be at most 5.')
      .optional(),
    review: z.string().trim().min(10, 'Review must be at least 10 characters.').max(1000, 'Review must be under 1000 characters.').optional(),
    role: z.string().trim().max(60, 'Role is too long.').nullable().optional(),
    company: z.string().trim().max(80, 'Company is too long.').nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update.');

export const adminEditSchema = z.object({
  rating: z
    .number()
    .int('Rating must be a whole number.')
    .min(1, 'Rating must be at least 1.')
    .max(5, 'Rating must be at most 5.')
    .optional(),
  review: z.string().trim().min(10, 'Review must be at least 10 characters.').max(1000, 'Review must be under 1000 characters.').optional(),
  role: z.string().trim().max(60, 'Role is too long.').nullable().optional(),
  company: z.string().trim().max(80, 'Company is too long.').nullable().optional(),
});

export const adminActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'feature', 'unfeature']),
});

const optionalShort = (max: number, label: string) =>
  z.string().trim().max(max, `${label} is too long.`).nullable().optional();

export const accountUpdateSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60, 'Name is too long.').optional(),
    email: z.string().trim().toLowerCase().email('Enter a valid email address.').optional(),
    image: z.string().trim().url('Enter a valid image URL.').max(500, 'Image URL is too long.').nullable().optional(),
    jobTitle: optionalShort(60, 'Role'),
    company: optionalShort(80, 'Company'),
    bio: optionalShort(300, 'Bio'),
    currentPassword: z.string().min(1, 'Enter your current password.').optional(),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(72, 'Password is too long.')
      .regex(/[a-zA-Z]/, 'Password must contain a letter.')
      .regex(/[0-9]/, 'Password must contain a number.')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update.')
  .refine((data) => Boolean(data.newPassword) === Boolean(data.currentPassword), {
    message: 'Enter both your current and new password to change it.',
    path: ['newPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>;
export type AdminEditInput = z.infer<typeof adminEditSchema>;
