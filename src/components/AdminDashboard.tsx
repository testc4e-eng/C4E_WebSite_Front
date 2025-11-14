import { useState, useEffect, useCallback } from "react";
import { LogOut, UserCog, Shield, Users, Plus, Edit, Trash2, Search, Mail, Home, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";

interface Utilisateur {
  id: number;
  email: string;
  role: string;
  date_creation: string;
  statut: "actif" | "inactif";
  dernier_connexion?: string;
}

interface ApiResponse {
  data: Utilisateur[];
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<"gestionnaires" | "administrateurs">("gestionnaires");
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Utilisateur[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, actifs: 0, inactifs: 0 });
  const [showPassword, setShowPassword] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const navigate = useNavigate();

  // Gestion du token expiré
  useEffect(() => {
    const handleTokenExpired = () => {
      document.dispatchEvent(
        new CustomEvent("showToast", {
          detail: { 
            message: "Session expirée, veuillez vous reconnecter", 
            type: "error" 
          }
        })
      );
      localStorage.removeItem('token');
      navigate('/login');
    };

    window.addEventListener('tokenExpired', handleTokenExpired);
    
    return () => {
      window.removeEventListener('tokenExpired', handleTokenExpired);
    };
  }, [navigate]);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log(`🔄 Chargement des ${activeTab}...`);
      
      const token = localStorage.getItem('token');
      console.log("🔐 Token utilisé:", token ? `${token.substring(0, 20)}...` : "Aucun token");
      
      const res = await api.get<ApiResponse>(`/api/admin/${activeTab}`);
      const usersData: Utilisateur[] = res.data.data || [];
      setUtilisateurs(usersData);
      setFilteredUsers(usersData);

      const total = usersData.length;
      const actifs = usersData.filter((u) => u.statut === "actif").length;
      setStats({ total, actifs, inactifs: total - actifs });
      
      console.log(`✅ ${usersData.length} ${activeTab} chargés`);
    } catch (err: any) {
      console.error("❌ Erreur lors du chargement :", err);
      console.error("Détails erreur:", err.response?.data);
      setUtilisateurs([]);
      setFilteredUsers([]);
      setStats({ total: 0, actifs: 0, inactifs: 0 });
      
      // Gestion des erreurs d'authentification
      if (err.response?.status === 401 || err.response?.status === 403) {
        document.dispatchEvent(
          new CustomEvent("showToast", {
            detail: { 
              message: "Session expirée ou accès refusé", 
              type: "error" 
            }
          })
        );
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        document.dispatchEvent(
          new CustomEvent("showToast", {
            detail: { 
              message: "Erreur lors du chargement des utilisateurs", 
              type: "error" 
            }
          })
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, navigate]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const filtered = utilisateurs.filter((user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, utilisateurs]);

// REMPLACEZ SEULEMENT la fonction handleAdd par celle-ci :
const handleAdd = async () => {
  if (!newEmail || !newPassword) {
    document.dispatchEvent(
      new CustomEvent("showToast", {
        detail: { 
          message: "Veuillez remplir tous les champs", 
          type: "error" 
        }
      })
    );
    return;
  }

  // Validation email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    document.dispatchEvent(
      new CustomEvent("showToast", {
        detail: { 
          message: "Format d'email invalide", 
          type: "error" 
        }
      })
    );
    return;
  }

  try {
    setIsAdding(true);
    
    const userData = {
      email: newEmail,
      motDePasse: newPassword
    };

    console.log("🔄 Ajout en cours...");
    
    // CORRECTION : Appel direct et simple
    const response = await api.post(`/api/admin/${activeTab}`, null, userData);
    
    console.log("✅ Succès:", response.data);
    
    // Réinitialisation
    setNewEmail("");
    setNewPassword("");
    
    // Rechargement
    await fetchUsers();

    document.dispatchEvent(
      new CustomEvent("showToast", {
        detail: {
          message: `${activeTab === "gestionnaires" ? "Gestionnaire" : "Administrateur"} ajouté avec succès`,
          type: "success"
        }
      })
    );
  } catch (err: any) {
    console.error("❌ Erreur:", err);
    
    let errorMessage = "Erreur lors de l'ajout";
    
    if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    }
    
    document.dispatchEvent(
      new CustomEvent("showToast", {
        detail: { 
          message: errorMessage, 
          type: "error" 
        }
      })
    );
  } finally {
    setIsAdding(false);
  }
};

  // CORRECTION de handleDelete
  const handleDelete = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
    
    try {
      await api.delete(`/api/admin/${activeTab}/${id}`);
      await fetchUsers();

      document.dispatchEvent(
        new CustomEvent("showToast", {
          detail: { message: "Utilisateur supprimé avec succès", type: "success" }
        })
      );
    } catch (err: any) {
      console.error("❌ Erreur suppression :", err);
      
      let errorMessage = "Erreur lors de la suppression";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      document.dispatchEvent(
        new CustomEvent("showToast", {
          detail: { message: errorMessage, type: "error" }
        })
      );
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleLogoClick = () => navigate("/");
  const handleHomeClick = () => navigate("/");

  const containerVariants = { 
    hidden: { opacity: 0 }, 
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1 } 
    } 
  };
  
  const itemVariants = { 
    hidden: { y: 20, opacity: 0 }, 
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { duration: 0.5 } 
    } 
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <motion.header 
        className="bg-white/90 backdrop-blur-xl shadow-2xl border-b border-white/20 sticky top-0 z-50" 
        initial={{ y: -100 }} 
        animate={{ y: 0 }} 
        transition={{ duration: 0.6, type: "spring" }}
      >
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <motion.button 
              onClick={handleLogoClick} 
              whileHover={{ scale: 1.05, rotate: 5 }} 
              whileTap={{ scale: 0.95 }} 
              className="flex items-center space-x-3 group"
            >
              <img 
                src="/logo.png" 
                alt="Logo C4E Africa" 
                className="h-12 w-12 rounded-2xl shadow-lg border-2 border-white/50 group-hover:shadow-xl transition-all duration-300" 
              />
              <div className="text-left">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Dashboard Administrateur
                </h1>
                <p className="text-gray-600 text-sm">Gestion des utilisateurs et permissions</p>
              </div>
            </motion.button>
          </div>
          <div className="flex items-center space-x-4">
            <motion.button 
              onClick={handleHomeClick} 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium shadow-md group" 
              title="Retour à l'accueil"
            >
              <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:block">Accueil</span>
            </motion.button>
            <motion.button 
              onClick={handleLogout} 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium shadow-md group"
            >
              <LogOut className="h-5 w-5 group-hover:rotate-12 transition-transform" />
              <span>Déconnexion</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Statistics Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" 
          variants={containerVariants} 
          initial="hidden" 
          animate="visible"
        >
          <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total {activeTab}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Utilisateurs Actifs</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.actifs}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <UserCog className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Utilisateurs Inactifs</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.inactifs}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <motion.div 
          className="flex justify-center mb-8" 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-white/50 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-white/20">
            <div className="flex space-x-1">
              <button 
                onClick={() => setActiveTab("gestionnaires")} 
                className={`flex items-center space-x-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === "gestionnaires" 
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg" 
                    : "text-gray-600 hover:text-gray-800 hover:bg-white/70"
                }`}
              >
                <Users className="h-5 w-5" />
                <span>Gestionnaires</span>
              </button>
              <button 
                onClick={() => setActiveTab("administrateurs")} 
                className={`flex items-center space-x-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === "administrateurs" 
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg" 
                    : "text-gray-600 hover:text-gray-800 hover:bg-white/70"
                }`}
              >
                <Shield className="h-5 w-5" />
                <span>Administrateurs</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div 
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20" 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Formulaire d'ajout */}
          <motion.div 
            className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100" 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }} 
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Plus className="h-5 w-5 mr-2 text-green-600" />
              Ajouter un nouveau {activeTab.slice(0, -1)}
            </h3>
            <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
              <input 
                type="email" 
                placeholder="Adresse email" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
              />
              <div className="flex-1 relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Mot de passe temporaire" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <motion.button 
                onClick={handleAdd} 
                disabled={isAdding}
                whileHover={{ scale: isAdding ? 1 : 1.02 }} 
                whileTap={{ scale: isAdding ? 1 : 0.98 }} 
                className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 shadow-lg font-semibold ${
                  isAdding 
                    ? "bg-gray-400 text-white cursor-not-allowed" 
                    : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                }`}
              >
                {isAdding ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Plus className="h-5 w-5" />
                )}
                <span>{isAdding ? "Création..." : "Créer le compte"}</span>
              </motion.button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Le mot de passe doit contenir au moins 6 caractères
            </p>
          </motion.div>

          {/* Barre de recherche */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Rechercher par email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Tableau des utilisateurs */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-b border-gray-200">
                  <th className="p-4 text-left font-semibold">Utilisateur</th>
                  <th className="p-4 text-left font-semibold">Rôle</th>
                  <th className="p-4 text-left font-semibold">Statut</th>
                  <th className="p-4 text-left font-semibold">Créé le</th>
                  <th className="p-4 text-left font-semibold">Dernière connexion</th>
                  <th className="p-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-600">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                        <p className="mt-2">Chargement des utilisateurs...</p>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-600">
                        <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p>Aucun utilisateur trouvé</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, index) => (
                      <motion.tr 
                        key={user.id} 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -20 }} 
                        transition={{ duration: 0.3, delay: index * 0.05 }} 
                        className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors group"
                      >
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {user.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.email}</p>
                              <p className="text-sm text-gray-500 flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                Email vérifié
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            user.statut === "actif" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              user.statut === "actif" ? "bg-green-500" : "bg-red-500"
                            }`}></div>
                            {user.statut}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-gray-600">
                            {new Date(user.date_creation).toLocaleDateString("fr-FR")}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-gray-600">
                            {user.dernier_connexion 
                              ? new Date(user.dernier_connexion).toLocaleDateString("fr-FR") 
                              : "Jamais"
                            }
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <motion.button 
                              whileHover={{ scale: 1.1 }} 
                              whileTap={{ scale: 0.9 }} 
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                              title="Modifier"
                              onClick={() => {
                                document.dispatchEvent(
                                  new CustomEvent("showToast", {
                                    detail: { 
                                      message: "Fonctionnalité de modification à venir", 
                                      type: "info" 
                                    }
                                  })
                                );
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.1 }} 
                              whileTap={{ scale: 0.9 }} 
                              onClick={() => handleDelete(user.id)} 
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;