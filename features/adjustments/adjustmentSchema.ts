import { z } from 'zod';

export const adjustmentKinds = ['OPENING', 'REVERSAL', 'CORRECTION'] as const;

export const adjustmentInputSchema = z
  .object({
    cardId: z.string().min(1),
    amount: z.number().int().refine((value) => value !== 0, {
      message: 'Adjustment amount cannot be zero',
    }),
    reason: z.string().trim().min(1).max(200),
    kind: z.enum(adjustmentKinds),
    linkedTxId: z.string().min(1).optional(),
    occurredAt: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'OPENING' && value.amount <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount'],
        message: 'Opening balance must be a positive amount',
      });
    }
  });

export type AdjustmentInput = z.infer<typeof adjustmentInputSchema>;
