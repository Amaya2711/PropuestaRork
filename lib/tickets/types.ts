import { z } from "zod";

export const TicketV1Schema = z.object({
  id: z.number(),
  ticket_source: z.string(),
  site_id: z.number(),
  site_name: z.string(),
  // agrega aquí los demás campos reales de tu tabla
});

export const TicketV1ArraySchema = z.array(TicketV1Schema);

export type TicketV1 = z.infer<typeof TicketV1Schema>;

export const TicketsOkSchema = z.object({
  data: TicketV1ArraySchema,
  count: z.number().default(0),
});

export const TicketsErrSchema = z.object({
  error: z.literal(true),
  message: z.string().optional(),
});

export const TicketsResponseSchema = z.union([TicketsOkSchema, TicketsErrSchema]);

export type TicketsOk = z.infer<typeof TicketsOkSchema>;
export type TicketsErr = z.infer<typeof TicketsErrSchema>;
export type TicketsResponse = z.infer<typeof TicketsResponseSchema>;
