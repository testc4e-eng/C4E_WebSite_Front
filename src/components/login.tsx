// src/components/login.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { postJson } from "../lib/api"; // ← Import modifié

// Interface pour la réponse de l'API
interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    type: "gestionnaire" | "administrateur";
  };
}

// Interface pour l'erreur
interface ApiError {
  response?: {
    data?: {
      message: string;
    };
  };
  message: string;
}

const Login = () => {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      console.log("Payload envoyé:", { email, motDePasse });

      // ✅ UTILISEZ postJson au lieu de api.post
      const { data } = await postJson<LoginResponse>(
        "/api/auth/login",
        null, // token (null pour login)
        { email, motDePasse } // Corps de la requête
      );

      // ✅ Utilisation correcte de 'data'
      if (data.token && data.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userType", data.user.type);
        localStorage.setItem("userRole", data.user.role);

        // ✅ Redirection automatique selon le rôle de l'utilisateur
        if (data.user.type === "administrateur") {
          navigate("/admin-dashboard");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err: unknown) {
      const error = err as ApiError;
      // Adaptation pour l'erreur fetch
      const msg =
        error?.message ||
        "Erreur réseau. Vérifie la connexion au serveur.";
      setError(msg);
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link to="/" className="inline-block">
            <motion.img
              src="/logo.png"
              alt="C4E Africa Logo"
              className="mx-auto h-24 w-24 cursor-pointer hover:scale-105 transition-transform duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            />
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">C4E AFRICA</h2>

        </motion.div>

        <motion.form
          className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-200"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Champs Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                placeholder="votre.email@exemple.com"
              />
            </div>
          </div>

          {/* Champs Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de Passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="pl-10 w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Affichage des erreurs */}
          {error && (
            <motion.div
              className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {error}
            </motion.div>
          )}

          {/* Bouton de connexion */}
          <motion.button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-xl"
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Connexion en cours...
              </div>
            ) : (
              <>
                <LogIn className="h-5 w-5 mr-2" />
                Se Connecter
              </>
            )}
          </motion.button>

          <div className="text-center pt-4 border-t border-gray-200">
            <Link
              to="/"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-300"
            >
              ← Retour à la page d'accueil
            </Link>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default Login;