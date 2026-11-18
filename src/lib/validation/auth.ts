import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ error: "Digite seu e-mail" })
    .trim()
    .toLowerCase()
    .min(1, "Digite seu e-mail")
    .max(254, "E-mail muito longo")
    .pipe(z.email({ error: "Esse e-mail não parece certo. Confira e tente de novo." })),
});
