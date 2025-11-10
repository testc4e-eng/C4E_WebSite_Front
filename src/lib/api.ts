import axios from "axios";

// Base URL pour toutes les requêtes HTTP
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://c4e-website-back.onrender.com",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
