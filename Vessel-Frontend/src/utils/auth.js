const TOKEN_KEY = "access_token";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function login(username, password) {
  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);
  
  try {
    const response = await fetch(`${API_URL}/token`, {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error("Invalid credentials");
    }
    
    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      return data;
    }
    throw new Error("No token received");
  } catch (error) {
    throw error;
  }
}

export function saveToken(token) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem(TOKEN_KEY)
    : null;
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function isLoggedIn() {
  return getToken() !== null;
}

export function getAuthHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}
