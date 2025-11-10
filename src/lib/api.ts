import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://c4e-website-back.onrender.com",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  withCredentials: false, // on n’utilise pas de cookies ici
});

export default api;
