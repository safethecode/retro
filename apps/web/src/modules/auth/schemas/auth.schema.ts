import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("올바른 이메일 주소를 입력해주세요").max(254),
  password: z.string().min(1, "비밀번호를 입력해주세요").max(128),
});

export const registerSchema = z
  .object({
    email: z.email("올바른 이메일 주소를 입력해주세요").max(254),
    password: z
      .string()
      .min(8, "비밀번호는 최소 8자 이상이어야 합니다")
      .max(128, "비밀번호는 128자를 초과할 수 없습니다"),
    confirmPassword: z.string().max(128),
    name: z.string().min(1, "이름을 입력해주세요").max(100, "이름은 100자를 초과할 수 없습니다"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
