import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// Definir o tipo UserRole localmente
type UserRole = "SUPER_ADMIN" | "ADMIN" | "USER"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            office: true
          }
        })

        if (!user || !user.isActive) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          officeId: user.officeId,
          office: user.office
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
    updateAge: 24 * 60 * 60, // Atualiza a cada 24 horas
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.officeId = user.officeId
        token.office = user.office
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as any
        session.user.role = token.role as any
        session.user.officeId = token.officeId as any
        session.user.office = token.office as any
      }
      return session
    }
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 // 30 dias
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  events: {
    async signIn({ user, account, profile }) {
      console.log('🔐 NextAuth SignIn Event:', { 
        user: user?.email, 
        role: user?.role,
        account: account?.provider 
      })
    },
    async session({ session, token }) {
      console.log('🔐 NextAuth Session Event:', { 
        user: session?.user?.email,
        role: session?.user?.role,
        expires: session?.expires
      })
    }
  }
}

// Função utilitária para hash de senhas
export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 12)
}

// Função utilitária para verificar permissões
export function hasPermission(userRole: UserRole, requiredRole: UserRole) {
  const roleHierarchy: Record<UserRole, number> = {
    USER: 1,
    ADMIN: 2,
    SUPER_ADMIN: 3
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
} 