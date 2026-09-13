export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res: Response) {
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new ApiError(body?.error || "Something went wrong. Please try again.", res.status);
  }
  return body;
}

export const api = {
  get(path: string) {
    return fetch(`${API_BASE}${path}`, { headers: { ...authHeaders() } }).then(handle);
  },
  post(path: string, data?: unknown) {
    return fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }).then(handle);
  },
  patch(path: string, data: unknown) {
    return fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    }).then(handle);
  },
  upload(path: string, formData: FormData) {
    return fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: formData,
    }).then(handle);
  },
};

/** Resolves a photo's storageLocation (which may be a relative /files/... path
 *  returned by the local storage driver) into a fully-qualified URL. */
export function resolvePhotoUrl(location: string): string {
  return location.startsWith("http") ? location : `${API_BASE}${location}`;
}
