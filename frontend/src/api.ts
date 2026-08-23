import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
export const TOKEN_KEY = "internew_session_token";

let memToken: string | null = null;

export function setMemToken(t: string | null) {
  memToken = t;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = memToken || (await storage.secureGet<string>(TOKEN_KEY, ""));
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path: string, options: RequestInit = {}, auth = true) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth) Object.assign(headers, await authHeaders());

  const res = await fetch(`${BASE}/api${path}`, { ...options, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = (data && data.detail) || "Ocorreu um erro. Tente novamente.";
    const err: any = new Error(typeof detail === "string" ? detail : "Erro na requisição");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // public
  getCompany: () => request("/company", {}, false),
  createQuote: (body: any) => request("/quotes", { method: "POST", body: JSON.stringify(body) }),
  trackQuote: (code: string) => request(`/quotes/track/${code}`, {}, false),

  // auth
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }, false),
  googleSession: (session_id: string) =>
    request("/auth/session", { method: "POST", body: JSON.stringify({ session_id }) }, false),
  appleLogin: (payload: { identity_token: string; name?: string | null; email?: string | null }) =>
    request("/auth/apple", { method: "POST", body: JSON.stringify(payload) }, false),
  me: () => request("/auth/me"),
  updateProfile: (body: { name?: string; phone?: string }) =>
    request("/auth/profile", { method: "PUT", body: JSON.stringify(body) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  myQuotes: () => request("/my/quotes"),

  // admin
  listQuotes: (statusFilter?: string) =>
    request(`/admin/quotes${statusFilter ? `?status_filter=${statusFilter}` : ""}`),
  stats: () => request("/admin/quotes/stats"),
  getQuote: (id: string) => request(`/admin/quotes/${id}`),
  replyQuote: (id: string, body: any) =>
    request(`/admin/quotes/${id}/reply`, { method: "POST", body: JSON.stringify(body) }),
  updateCompany: (body: any) =>
    request("/admin/company", { method: "PUT", body: JSON.stringify(body) }),
};
