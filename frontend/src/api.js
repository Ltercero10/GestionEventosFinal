let authToken = localStorage.getItem("token") || null;

export function setAuthToken(token) {
  authToken = token;
}

const API_BASE_URL = "http://localhost:3000/api";

async function request(endpoint, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (isJson && (data.msg || data.message || data.error)) ||
      "Ocurrió un error en la petición";
    throw new Error(message);
  }

  return data;
}

export function get(endpoint) {
  return request(endpoint, { method: "GET" });
}

export function post(endpoint, body) {
  return request(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function put(endpoint, body) {
  return request(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function del(endpoint) {
  return request(endpoint, { method: "DELETE" });
}