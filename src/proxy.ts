import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const publicRoutes = ['/login', '/register'];
  const authApiRoutes = ['/bff/login', '/bff/register'];

  if (token && publicRoutes.includes(pathname)) {
    return NextResponse.redirect(
      new URL('/', request.url) // atau /dashboard
    );
  }

  if (
    publicRoutes.some(route => pathname.startsWith(route)) ||
    authApiRoutes.some(route => pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(
      new URL('/login', request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)).*)',
  ],
};
