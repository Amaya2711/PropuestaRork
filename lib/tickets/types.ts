import { z } from "zod";

export const TicketV1Schema = z.object({
  // id es UUID string en Supabase
  id: z.string(),

  ticket_source: z.string().nullable(),

  // Si en tu tabla estos dos son numéricos, puedes dejarlos como number().nullable()
  // pero como en la UI los mostramos como texto, usamos string().nullable()
  site_id: z.string().nullable(),
  site_name: z.string().nullable(),

  fault_level: z.string().nullable(),
  fault_occur_time: z.string().nullable(),
  complete_time: z.string().nullable(),
  task_category: z.string().nullable(),
  task_subcategory: z.string().nullable(),
  platform_affected: z.string().nullable(),
  attention_type: z.string().nullable(),
  service_affected: z.string().nullable(),
  estado: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
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
