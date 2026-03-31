import axios from "axios";

const BASE_URL = " http://localhost:8080/api/v1";

// ── Token helpers ────────────────────────────────────
export const getToken = () => localStorage.getItem("token");

export const saveAuth = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

// ── Check if token is expired (client-side) ──────────
export const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

// ── Main auth check ──────────────────────────────────
export const handleAuth = async () => {
  const token = getToken();

  // No token at all
  if (!token) return { authenticated: false, reason: "no_token" };

  // Token exists but is expired (without hitting the server)
  if (isTokenExpired(token)) {
    clearAuth();
    return { authenticated: false, reason: "expired" };
  }

  // Attach to all future axios requests
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  return { authenticated: true, user: getUser(), token };
};