/** Only allow same-origin relative paths (blocks open redirects). */
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback;
  const path = value.trim();
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback;
  if (path.includes("://")) return fallback;
  if (/[\0\r\n\\]/.test(path)) return fallback;
  return path;
}

export function parseAdminEmails(raw: string) {
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

/** Admin access: primarily `user.role === "admin"` (fallback allowlist email). */
export function canAccessAdmin(
  user: { role?: string; is_admin?: boolean; email?: string } | null | undefined,
  allowlist: string[] = [],
) {
  if (!user) return false;
  if (user.is_admin || (user.role || "").toLowerCase() === "admin") return true;
  const email = (user.email || "").trim().toLowerCase();
  if (email && allowlist.includes(email)) return true;
  return false;
}
