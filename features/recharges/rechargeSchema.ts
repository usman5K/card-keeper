import { z } from 'zod';

export const rechargeInputSchema = z.object({
  cardId: z.string().min(1),
  amount: z.number().int().positive(),
  source: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(200).optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export type RechargeInput = z.infer<typeof rechargeInputSchema>;
