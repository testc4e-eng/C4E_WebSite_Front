// src/components/login.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, LogIn, Building, UserCog } from "lucide-react";
import { motion } from "framer-motion";
import api from "../lib/api";

// Interface pour la réponse de l'API
interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    userType: "gestionnaire" | "administrateur";
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
  const [userType, setUserType] = useState<"gestionnaire" | "administrateur">("gestionnaire");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      console.log("Payload envoyé:", { email, motDePasse, userType });
      
      // Correction : passer les données dans le body
      const res = await api.post<LoginResponse>("/api/auth/login", null,{
        email,
        motDePasse,
        userType
      });
      
      // Maintenant TypeScript connaît la structure de res.data
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("userType", userType);
        
        // Redirection selon le type d'utilisateur
if (userType === "administrateur") {
  navigate("/admin-dashboard"); // reste pareil
} else {
  navigate("/dashboard"); // utiliser la route existante pour gestionnaire
}
      }
    } catch (err: unknown) {
      // Gestion d'erreur typée
      const error = err as ApiError;
      const msg =
        error?.response?.data?.message ||
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
        {/* Logo avec lien vers l'accueil */}
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
          <p className="mt-2 text-sm text-gray-600">
            Connexion à l'espace d'administration
          </p>
        </motion.div>

        {/* Sélecteur du type d'utilisateur */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setUserType("gestionnaire")}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md transition-all duration-300 ${
                userType === "gestionnaire"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Building className="h-5 w-5 mr-2" />
              Gestionnaire
            </button>
            <button
              type="button"
              onClick={() => setUserType("administrateur")}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md transition-all duration-300 ${
                userType === "administrateur"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <UserCog className="h-5 w-5 mr-2" />
              Administrateur
            </button>
          </div>
        </motion.div>

        <motion.form
          className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-200"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Indicateur du type d'utilisateur sélectionné */}
          <div className="text-center mb-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              userType === "gestionnaire" 
                ? "bg-blue-100 text-blue-800" 
                : "bg-purple-100 text-purple-800"
            }`}>
              {userType === "gestionnaire" ? (
                <>
                  <Building className="h-4 w-4 mr-1" />
                  Espace Gestionnaire
                </>
              ) : (
                <>
                  <UserCog className="h-4 w-4 mr-1" />
                  Espace Administrateur
                </>
              )}
            </span>
          </div>

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
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                placeholder="votre.email@exemple.com"
              />
            </div>
          </div>

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
                name="password"
                autoComplete="current-password"
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="pl-10 w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {error}
            </motion.div>
          )}

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
                Se Connecter en tant que {userType === "gestionnaire" ? "Gestionnaire" : "Administrateur"}
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