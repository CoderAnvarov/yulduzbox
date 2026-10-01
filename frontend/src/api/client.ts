import { getInitData } from "../lib/telegram";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Netlify'da VITE_API_URL berilsa shu manzilga, bo'lmasa Vite proxy orqali /api ga yuboriladi
const BASE = "https://yulduzbox.onrender.com";

interface Options {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  idempotencyKey?: string;
}

export async function request<T>(path: string, { method = "GET", body, idempotencyKey }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const initData = getInitData();
  if (initData) headers["Authorization"] = `tma ${initData}`;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  let response: Response;
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Serverga ulanib bo'lmadi. Internetni tekshiring", "network");
  }

  if (!response.ok) {
    let message = "Kutilmagan xatolik yuz berdi";
    let code = "error";
    try {
      const data = await response.json();
      if (typeof data?.detail === "string") message = data.detail;
      if (typeof data?.code === "string") code = data.code;
    } catch {
      // JSON bo'lmasa standart xabar qoladi
    }
    throw new ApiError(response.status, message, code);
  }
  return response.json() as Promise<T>;
}

export const newIdempotencyKey = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now()}${Math.random().toString(16).slice(2)}`.padEnd(16, "0");
