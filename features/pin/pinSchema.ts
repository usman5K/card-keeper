import { z } from 'zod';

export const pinValueSchema = z
  .string()
  .trim()
  .regex(/^\d{4,12}$/, 'PIN must be 4 to 12 digits');

export const pinRequestCreateSchema = z.object({
  cardId: z.string().min(1),
});

export const pinResolveSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export type PinRequestCreateInput = z.infer<typeof pinRequestCreateSchema>;
export type PinResolveInput = z.infer<typeof pinResolveSchema>;

export const PIN_REVEAL_MINUTES = 15;

export function pinRequestId(cardId: string, requestedBy: string) {
  return `${cardId}_${requestedBy}`;
}
