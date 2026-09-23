export function GET(request: Request) {
  return Response.redirect(new URL('/prospectar', request.url), 307)
}
