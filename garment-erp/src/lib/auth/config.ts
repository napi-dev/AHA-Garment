import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        employeeCode: { label: "Employee Code", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.employeeCode || !credentials?.pin) return null;

        const code = String(credentials.employeeCode).trim().toUpperCase();
        const pin = String(credentials.pin);

        const user = await db.appUser.findUnique({
          where: { employeeCode: code },
          include: { employee: { select: { nameAm: true, nameEn: true } } },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(pin, user.pinHash);
        if (!valid) return null;

        // Update last login
        await db.appUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          employeeCode: user.employeeCode,
          role: user.role,
          nameAm: user.employee?.nameAm ?? user.employeeCode,
          nameEn: user.employee?.nameEn ?? null,
          employeeId: user.employeeId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.employeeCode = (user as SessionUser).employeeCode;
        token.role = (user as SessionUser).role;
        token.nameAm = (user as SessionUser).nameAm;
        token.nameEn = (user as SessionUser).nameEn;
        token.employeeId = (user as SessionUser).employeeId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.employeeCode = token.employeeCode as string;
      session.user.role = token.role as Role;
      session.user.nameAm = token.nameAm as string;
      session.user.nameEn = token.nameEn as string | null;
      session.user.employeeId = token.employeeId as string | null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours — one shift
  },
};

interface SessionUser {
  id: string;
  employeeCode: string;
  role: Role;
  nameAm: string;
  nameEn: string | null;
  employeeId: string | null;
}
