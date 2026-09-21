import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      employeeCode: string;
      role: Role;
      nameAm: string;
      nameEn: string | null;
      employeeId: string | null;
    };
  }

  interface User {
    id: string;
    employeeCode: string;
    role: Role;
    nameAm: string;
    nameEn: string | null;
    employeeId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    employeeCode: string;
    role: Role;
    nameAm: string;
    nameEn: string | null;
    employeeId: string | null;
  }
}
