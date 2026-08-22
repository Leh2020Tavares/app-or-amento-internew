import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
export const TOKEN_KEY = "internew_admin_token";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await storage.secureGet<string>(TOKEN_KEY, "");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path: string, options: RequestInit = {}, auth = false) {
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
    throw new Error(typeof detail === "string" ? detail : "Erro na requisição");
  }
  return data;
}

export const api = {
  // public
  getCompany: () => request("/company"),
  createQuote: (body: any) =>
    request("/quotes", { method: "POST", body: JSON.stringify(body) }),
  trackQuote: (code: string) => request(`/quotes/track/${code}`),

  // auth
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/auth/me", {}, true),

  // admin
  listQuotes: (statusFilter?: string) =>
    request(`/admin/quotes${statusFilter ? `?status_filter=${statusFilter}` : ""}`, {}, true),
  stats: () => request("/admin/quotes/stats", {}, true),
  getQuote: (id: string) => request(`/admin/quotes/${id}`, {}, true),
  replyQuote: (id: string, body: any) =>
    request(`/admin/quotes/${id}/reply`, { method: "POST", body: JSON.stringify(body) }, true),
  updateCompany: (body: any) =>
    request("/admin/company", { method: "PUT", body: JSON.stringify(body) }, true),
};
