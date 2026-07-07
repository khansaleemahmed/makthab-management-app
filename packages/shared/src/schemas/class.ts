import { z } from "zod";

// ClassCreateDto — POST /classes
export const classCreateSchema = z.object({
  name: z.string().trim().min(1),
  teacherId: z.number().int().positive().nullable().optional(),
});
export type ClassCreateDto = z.infer<typeof classCreateSchema>;

// ClassUpdateDto — PATCH /classes/:id (all fields optional)
export const classUpdateSchema = classCreateSchema.partial();
export type ClassUpdateDto = z.infer<typeof classUpdateSchema>;

// Shape returned by the API (DTO).
export type ClassDto = {
  id: number;
  name: string;
  teacherId: number | null;
};
