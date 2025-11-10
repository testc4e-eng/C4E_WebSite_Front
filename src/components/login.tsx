// src/components/login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, LogIn } from "lucide-react";
import api from "../lib/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Appel direct via l’instance Axios (api)
      const res = await api.post("/api/auth/login", {
        email,
        motDePasse: password, // <- correspond au backend
      });

      // Stocker le token et rediriger
      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
      }
      navigate("/dashboard"); // adapte si ta route diffère
    } catch (err: any) {
      // Message backend si présent, sinon défaut
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erreur de connexion au serveur.";
      setError(msg);
      console.error("[LOGIN] error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <img
            src="/logo.png"
            alt="C4E Africa Logo"
            className="mx-auto h-24 w-24 transition-transform duration-500 hover:rotate-12"
          />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">C4E AFRICA</h2>
          <p className="mt-2 text-sm text-gray-600">
            Connexion pour Gestionnaire des Sites
          </p>
        </div>

        {/* Form */}
        <form
          className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-200"
          onSubmit={handleSubmit}
        >
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Adresse Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                placeholder="votre.email@exemple.com"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mot de Passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <LogIn className="h-5 w-5 mr-2" />
              )}
              {isLoading ? "Connexion en cours..." : "Se Connecter"}
            </button>
          </div>

          <div className="text-center">
            <a href="#" className="text-sm text-indigo-600 hover:text-indigo-500 transition-colors duration-200">
              Mot de passe oublié ?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
