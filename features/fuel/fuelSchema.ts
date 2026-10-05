import { z } from 'zod';

export const fuelInputSchema = z.object({
  cardId: z.string().min(1),
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  station: z.string().trim().min(1).max(80),
  area: z.string().trim().min(1).max(80),
  city: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(200).optional(),
  occurredAt: z.string().datetime().optional(),
});

export type FuelInput = z.infer<typeof fuelInputSchema>;
