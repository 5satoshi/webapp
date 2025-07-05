import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const botPatterns = [
  // Common CMS login pages
  /wp-login\.php/i,
  /wp-admin/i,
  /user\/login/i,
  /administrator/i,
  // Common file extensions bots look for
  /\.php$/i,
  /\.env$/i,
  /old-wp/i,
  /wordpress/i,
  // Other suspicious paths
  /xmlrpc\.php/i,
  /autodiscover\/autodiscover\.xml/i,
  /owa/i,
  /remote/i,
  /fpm-ping/i,
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for Next.js internal paths and static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.includes('.')) {
      if (!botPatterns.some(pattern => pattern.test(pathname))) {
         return NextResponse.next();
      }
  }

  // Check if the request path matches any of the bot patterns
  const isBotRequest = botPatterns.some(pattern => pattern.test(pathname));

  if (isBotRequest) {
    console.log(`[Middleware] Bot detected for path: ${pathname}. Redirecting to bot-jail.`);
    const botJailUrl = new URL('/bot-jail', request.url);

    // Use a 303 See Other redirect. This is crucial.
    // It changes the request method to GET for the new location.
    // This prevents "405 Method Not Allowed" errors if a bot sends a POST request
    // to a path like /wp-login.php.
    return NextResponse.redirect(botJailUrl, 303);
  }

  // If no bot pattern is matched, continue with the request
  return NextResponse.next();
}

// Configure the middleware to run on all paths except for the API routes
// to avoid interfering with legitimate API calls.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - bot-jail (the destination page itself)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|bot-jail).*)'
  ],
};
