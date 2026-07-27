import { z } from 'zod';

export const snowflakeSchema = z.string().regex(/^\d{17,19}$/, 'Invalid Discord snowflake');

export const emailSchema = z.string().email('Invalid email address');

export const urlSchema = z.string().url('Invalid URL');

export const usernameSchema = z
  .string()
  .min(2, 'Username must be at least 2 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

export const tagContentSchema = z
  .string()
  .min(1, 'Tag content cannot be empty')
  .max(2000, 'Tag content must be at most 2000 characters');

export const tagNameSchema = z
  .string()
  .min(1, 'Tag name cannot be empty')
  .max(100, 'Tag name must be at most 100 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Tag name can only contain letters, numbers, underscores, and hyphens'
  );

export const reasonSchema = z.string().max(500, 'Reason must be at most 500 characters').optional();

export const amountSchema = z.number().positive('Amount must be positive');

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(25).default(10),
});

export type Snowflake = z.infer<typeof snowflakeSchema>;
export type Email = z.infer<typeof emailSchema>;
export type Url = z.infer<typeof urlSchema>;
export type Username = z.infer<typeof usernameSchema>;
export type TagContent = z.infer<typeof tagContentSchema>;
export type TagName = z.infer<typeof tagNameSchema>;
export type Reason = z.infer<typeof reasonSchema>;
export type Amount = z.infer<typeof amountSchema>;
export type Pagination = z.infer<typeof paginationSchema>;

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.flatten().formErrors,
  };
}
