import { z } from 'zod';

export const settlementMethods = ['cash', 'bank', 'jazzcash', 'easypaisa', 'other'] as const;

export const settlementInputSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  method: z.enum(settlementMethods),
  notes: z.string().trim().max(200).optional(),
  occurredAt: z.string().datetime().optional(),
});

export type SettlementInput = z.infer<typeof settlementInputSchema>;

export const confirmSettlementSchema = z.object({
  amount: z.number().int().positive().optional(),
  method: z.enum(settlementMethods).optional(),
});

export type ConfirmSettlementInput = z.infer<typeof confirmSettlementSchema>;
