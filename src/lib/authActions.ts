"use server";

import { redirect } from "next/navigation";
import { prisma } from "./db";
import { clearSession, createSession, hashPassword, verifyPassword } from "./auth";
import { DEFAULT_CATEGORIES } from "./domain/categories";

export interface AuthFormState {
  error: string | null;
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const user = await prisma.user.findUnique({ where: { email } });
  // Uniform error whether the account or the password is wrong.
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { error: "That email and password combination doesn't match." };
  }
  createSession(user.id);
  redirect("/");
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) return { error: "All fields are required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email doesn't look right." };
  if (password.length < 8) return { error: "Password needs at least 8 characters." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists — sign in instead." };

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      // Every new account starts with the default AU category vocabulary
      categories: { create: DEFAULT_CATEGORIES },
    },
  });
  // A first account to log spending against, until a bank/CSV is connected
  await prisma.account.create({
    data: { userId: user.id, name: "Everyday", institution: "Manual", type: "TRANSACTION", balanceCents: 0 },
  });
  createSession(user.id);
  redirect("/");
}

/** One-tap demo access — signs into the seeded showcase account. */
export async function loginAsDemo(): Promise<void> {
  const demo = await prisma.user.findUnique({ where: { email: "alex@example.com" } });
  if (!demo) throw new Error("Demo data missing — run `npm run db:reset`");
  createSession(demo.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  clearSession();
  redirect("/login");
}
