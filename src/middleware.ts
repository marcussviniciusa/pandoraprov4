import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const { token } = req.nextauth

    // Debug logs apenas em desenvolvimento
    if (process.env.NODE_ENV === "development") {
      console.log('🔍 Middleware Debug:', {
        pathname,
        userRole: token?.role,
        officeId: token?.officeId,
        hasToken: !!token
      })
    }

    // Rotas que requerem SUPER_ADMIN
    if (pathname.startsWith("/super-admin")) {
      if (token?.role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }

    // Rotas que requerem ADMIN ou superior
    if (pathname.startsWith("/admin")) {
      if (token?.role !== "ADMIN" && token?.role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }

    // Verificar se usuário tem escritório associado (exceto SUPER_ADMIN)
    // IMPORTANTE: Super Admin não precisa de escritório
    if (token?.role && token.role !== "SUPER_ADMIN") {
      // Se não tem officeId e não está indo para /setup, redireciona
      if (!token.officeId && !pathname.startsWith("/setup")) {
        return NextResponse.redirect(new URL("/setup", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Permitir acesso às rotas públicas
        const { pathname } = req.nextUrl
        const publicPaths = ["/login", "/auth", "/api/auth", "/unauthorized", "/setup", "/debug"]
        
        if (publicPaths.some(path => pathname.startsWith(path))) {
          return true
        }

        // Exigir token para todas as outras rotas
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
} 