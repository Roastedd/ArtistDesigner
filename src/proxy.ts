export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/personas/:path*", "/api/ai/:path*"],
};
