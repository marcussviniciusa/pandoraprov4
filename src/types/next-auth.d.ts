import "next-auth"

type UserRole = "SUPER_ADMIN" | "ADMIN" | "USER"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: UserRole
      officeId: string | null
      office?: {
        id: string
        name: string
      } | null
    }
  }

  interface User {
    id: string
    name: string
    email: string
    role: UserRole
    officeId: string | null
    office?: {
      id: string
      name: string
    } | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    officeId: string | null
    office?: {
      id: string
      name: string
    } | null
  }
} 