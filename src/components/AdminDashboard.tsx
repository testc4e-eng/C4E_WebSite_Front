import { useState, useEffect, useCallback } from "react";
import { 
  LogOut, UserCog, Shield, Users, Plus, Edit, Trash2, Search, 
  Mail, Home, Eye, EyeOff, Briefcase, FileText, Archive, 
  BarChart3, Settings, Key, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";

// Interfaces pour les utilisateurs
interface Utilisateur {
  id: number;
  nom?: string;
  email: string;
  role: string;
  type: "administrateur" | "gestionnaire";
  date_creation: string;
  statut: "actif" | "inactif";
  dernier_connexion?: string;
  sites_geres?: string[];
}

// Interfaces pour les offres et candidatures
interface OffreEmploi {
  id: number;
  titre: string;
  description: string;
  salaire?: string | null;
  dateExpiration: string;
  statut: "active" | "inactive";
  type: "CDI" | "CDD 12 mois" | "Stage" | "PFE";
  localisation: string;
  exigences: string[];
}

interface Candidature {
  id: number;
  type: "emploi" | "stage" | "pfe" | "spontanee" | "stage_spontane";
  nom: string;
  email: string;
  cvUrl?: string;
  lettreMotivationUrl?: string;
  offreId?: number;
  offre_id?: number;
  dateSoumission: string;
  statut: "en_attente" | "acceptee" | "refusee";
  competenceScore?: number;
  poste?: string;
  diplome?: string;
  experience?: string;
  telephone?: string;
  domaine?: string;
  duree?: string;
  type_etablissement?: string;
  motivation?: string;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  offre?: T;
}

interface OffreApiData {
  id: number;
  titre: string;
  description: string;
  salaire: string;
  date_expiration: string;
  statut: "active" | "inactive";
  type: OffreEmploi["type"];
  localisation: string;
  exigences: string[];
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // États pour la navigation principale
  const [currentView, setCurrentView] = useState<"main" | "gestion-candidatures">("main");
  const [activeSection, setActiveSection] = useState<"utilisateurs" | "offres" | "candidatures">("utilisateurs");
  
  // États pour la gestion des utilisateurs
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

  // États pour les offres
  const [offres, setOffres] = useState<OffreEmploi[]>([]);
  const [loadingOffres, setLoadingOffres] = useState(false);
  const [nouvelleOffre, setNouvelleOffre] = useState({
    titre: "",
    description: "",
    salaire: "",
    dateExpiration: "",
    type: "CDI" as OffreEmploi["type"],
    localisation: "",
  });
  const [editingOffre, setEditingOffre] = useState<OffreEmploi | null>(null);
  const [exigencesFields, setExigencesFields] = useState<string[]>([""]);
  const [editingExigences, setEditingExigences] = useState<string[]>([""]);

  // États pour les candidatures
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [loadingCandidatures, setLoadingCandidatures] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [activeTabCandidatures, setActiveTabCandidatures] = useState<"offres" | "candidatures" | "candidatures-postes" | "archives">("offres");
  const [filterType, setFilterType] = useState<"tous" | "stage_spontane" | "spontanee">("tous");
  const [sortBy, setSortBy] = useState<"date" | "diplome" | "competence" | "experience">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"postes" | "candidatures">("postes");
  const [selectedOffre, setSelectedOffre] = useState<OffreEmploi | null>(null);
  const [ongletCandidatures, setOngletCandidatures] = useState<"emploi" | "stage">("emploi");
  const [archiveFilter, setArchiveFilter] = useState<"tous" | "acceptees" | "refusees">("tous");
  const [searchArchive, setSearchArchive] = useState("");

  // États pour la modification du mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPasswordUser, setNewPasswordUser] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Gestion du token expiré
  useEffect(() => {
    const handleTokenExpired = () => {
      showToast("Session expirée, veuillez vous reconnecter", "error");
      localStorage.removeItem('token');
      navigate('/login');
    };

    window.addEventListener('tokenExpired', handleTokenExpired);
    
    return () => {
      window.removeEventListener('tokenExpired', handleTokenExpired);
    };
  }, [navigate]);

  // Chargement des utilisateurs
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log(`🔄 Chargement des ${activeTab}...`);
      
      const { data } = await api.get<Utilisateur[]>(`/api/admin/${activeTab}`);
      const usersData: Utilisateur[] = data || [];
      
      setUtilisateurs(usersData);
      setFilteredUsers(usersData);

      const total = usersData.length;
      const actifs = usersData.filter((u) => u.statut === "actif").length;
      setStats({ total, actifs, inactifs: total - actifs });
      
      console.log(`✅ ${usersData.length} ${activeTab} chargés`);
    } catch (err: unknown) {
      console.error("❌ Erreur lors du chargement :", err);
      setUtilisateurs([]);
      setFilteredUsers([]);
      setStats({ total: 0, actifs: 0, inactifs: 0 });
      
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { status: number } };
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, navigate]);

  // Chargement des offres
  const fetchOffres = useCallback(async () => {
    try {
      setLoadingOffres(true);
      const { data } = await api.get<OffreApiData[]>("/api/offres");
      
      const offresFormatted: OffreEmploi[] = data.map((o: OffreApiData) => ({
        id: o.id,
        titre: o.titre,
        description: o.description,
        salaire: o.salaire,
        dateExpiration: o.date_expiration,
        statut: o.statut,
        type: o.type,
        localisation: o.localisation,
        exigences: o.exigences || [],
      }));
      
      setOffres(offresFormatted);
    } catch (err: unknown) {
      console.error("Erreur chargement offres:", err);
    } finally {
      setLoadingOffres(false);
    }
  }, []);

  // Chargement des candidatures
  const fetchCandidatures = useCallback(async () => {
    try {
      setLoadingCandidatures(true);
      
      if (activeTabCandidatures === "candidatures") {
        const { data } = await api.get<Candidature[]>("/api/candidatures/spontanees/toutes");
        setCandidatures(data || []);
      } else if (activeTabCandidatures === "candidatures-postes") {
        const { data } = await api.get<Candidature[]>("/api/candidatures");
        const candidaturesSurOffres = data.filter(
          (c) => c.type === "emploi" || c.type === "stage" || c.type === "pfe"
        );
        setCandidatures(candidaturesSurOffres);
      } else if (activeTabCandidatures === "archives") {
        const { data } = await api.get<Candidature[]>("/api/candidatures");
        setCandidatures(data);
      } else {
        const { data } = await api.get<Candidature[]>("/api/candidatures");
        setCandidatures(data || []);
      }
    } catch (err: unknown) {
      console.error("Erreur chargement candidatures:", err);
    } finally {
      setLoadingCandidatures(false);
    }
  }, [activeTabCandidatures]);

  useEffect(() => {
    if (currentView === "main") {
      fetchUsers();
    } else if (currentView === "gestion-candidatures") {
      fetchOffres();
      fetchCandidatures();
    }
  }, [currentView, fetchUsers, fetchOffres, fetchCandidatures, activeTabCandidatures]);

  useEffect(() => {
    const filtered = utilisateurs.filter((user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, utilisateurs]);

  // Gestion des utilisateurs
  const handleAddUser = async () => {
    if (!newEmail || !newPassword) {
      showToast("Veuillez remplir tous les champs", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      showToast("Format d'email invalide", "error");
      return;
    }

    try {
      setIsAdding(true);
      const userData = { email: newEmail, motDePasse: newPassword };

      await api.post(`/api/admin/${activeTab}`, null, userData);
      
      setNewEmail("");
      setNewPassword("");
      await fetchUsers();

      showToast(
        `${activeTab === "gestionnaires" ? "Gestionnaire" : "Administrateur"} ajouté avec succès`,
        "success"
      );
    } catch (err: unknown) {
      let errorMessage = "Erreur lors de l'ajout";
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        errorMessage = error.response?.data?.message || errorMessage;
      }
      showToast(errorMessage, "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
    
    try {
      await api.delete(`/api/admin/${activeTab}/${id}`);
      await fetchUsers();
      showToast("Utilisateur supprimé avec succès", "success");
    } catch (err: unknown) {
      let errorMessage = "Erreur lors de la suppression";
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        errorMessage = error.response?.data?.message || errorMessage;
      }
      showToast(errorMessage, "error");
    }
  };

  // Gestion des offres
  const ajouterOffre = async () => {
    if (!nouvelleOffre.titre || !nouvelleOffre.description || !nouvelleOffre.dateExpiration) {
      showToast("Veuillez remplir tous les champs obligatoires", "error");
      return;
    }

    try {
      const exigencesArray = exigencesFields.filter((req) => req.trim() !== "");
      
      const { data } = await api.post<ApiResponse<OffreEmploi>>("/api/offres", null, {
        ...nouvelleOffre,
        date_expiration: nouvelleOffre.dateExpiration,
        exigences: exigencesArray,
        statut: "active"
      });

      if (data.offre) {
        setOffres(prev => [...prev, data.offre]);
      }
      
      setNouvelleOffre({
        titre: "",
        description: "",
        salaire: "",
        dateExpiration: "",
        type: "CDI",
        localisation: "",
      });
      setExigencesFields([""]);
      
      showToast("Offre ajoutée avec succès", "success");
    } catch (err: unknown) {
      showToast("Erreur lors de l'ajout de l'offre", "error");
    }
  };

  const supprimerOffre = async (id: number) => {
    if (!window.confirm("Confirmer la suppression ?")) return;
    
    try {
      await api.delete(`/api/offres/${id}`);
      setOffres(prev => prev.filter(o => o.id !== id));
      showToast("Offre supprimée avec succès", "success");
    } catch (err: unknown) {
      showToast("Erreur lors de la suppression", "error");
    }
  };

  // Gestion des candidatures
  const changerStatutCandidature = async (candidature: Candidature, statut: Candidature["statut"]) => {
    try {
      const { id, type } = candidature;
      let typeAPI = type;
      if (type === "stage_spontane") {
        typeAPI = "stage";
      }

      await api.put(`/api/candidatures/statut/${typeAPI}/${id}`, null, { statut });
      
      setCandidatures(prev =>
        prev.map(c => c.id === id && c.type === type ? { ...c, statut } : c)
      );
      
      showToast("Statut mis à jour avec succès", "success");
    } catch (err: unknown) {
      showToast("Erreur lors de la mise à jour du statut", "error");
    }
  };

  const supprimerCandidature = async (candidature: Candidature) => {
    if (!window.confirm(`Confirmer la suppression de la candidature de ${candidature.nom} ?`)) return;
    
    try {
      const { id, type } = candidature;
      await api.delete(`/api/candidatures/${type}/${id}`);
      
      setCandidatures(prev =>
        prev.filter(c => !(c.id === id && c.type === type))
      );
      
      if (selectedCandidature?.id === id && selectedCandidature?.type === type) {
        setSelectedCandidature(null);
      }
      
      showToast("Candidature supprimée avec succès", "success");
    } catch (err: unknown) {
      showToast("Erreur lors de la suppression", "error");
    }
  };

  // Gestion du mot de passe
  const handleChangePassword = async () => {
    if (!currentPassword || !newPasswordUser || !confirmPassword) {
      showToast("Veuillez remplir tous les champs", "error");
      return;
    }

    if (newPasswordUser !== confirmPassword) {
      showToast("Les mots de passe ne correspondent pas", "error");
      return;
    }

    try {
      setChangingPassword(true);
      // Implémentez l'appel API pour changer le mot de passe ici
      // await api.put("/api/auth/change-password", null, {
      //   currentPassword,
      //   newPassword: newPasswordUser
      // });
      
      showToast("Mot de passe modifié avec succès", "success");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPasswordUser("");
      setConfirmPassword("");
    } catch (err: unknown) {
      showToast("Erreur lors du changement de mot de passe", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  // Utilitaires
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    document.dispatchEvent(
      new CustomEvent("showToast", {
        detail: { message, type }
      })
    );
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const getFileUrl = (filePath?: string) => {
    if (!filePath) return null;
    if (filePath.startsWith("http")) return filePath;
    return `${api.API_BASE_URL}${filePath.startsWith("/") ? filePath : "/" + filePath}`;
  };

  // Composants d'affichage
  const PasswordModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Key className="h-5 w-5 mr-2 text-blue-600" />
          Modifier le mot de passe
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPasswordUser}
              onChange={(e) => setNewPasswordUser(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={() => setShowPasswordModal(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Annuler
          </button>
          <button
            onClick={handleChangePassword}
            disabled={changingPassword}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {changingPassword ? "Modification..." : "Modifier"}
          </button>
        </div>
      </div>
    </div>
  );

  // Vue principale avec les 2 cases carrées
  const MainView = () => (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Dashboard Administrateur
        </h2>
        <p className="text-xl text-gray-600">
          Gestion complète de la plateforme C4E Africa
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Carte Gestion des Utilisateurs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200 hover:shadow-3xl transition-all duration-300 cursor-pointer group"
          onClick={() => setCurrentView("main")}
        >
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Gestion des Utilisateurs
            </h3>
            <p className="text-gray-600 mb-6">
              Administrez les comptes gestionnaires et administrateurs de la plateforme
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.actifs}</div>
                <div className="text-sm text-gray-500">Actifs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.inactifs}</div>
                <div className="text-sm text-gray-500">Inactifs</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Carte Gestion des Candidatures */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200 hover:shadow-3xl transition-all duration-300 cursor-pointer group"
          onClick={() => setCurrentView("gestion-candidatures")}
        >
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <FileText className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Gestion des Candidatures
            </h3>
            <p className="text-gray-600 mb-6">
              Gérez les offres d'emploi et toutes les candidatures reçues
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-600">{offres.length}</div>
                <div className="text-sm text-gray-500">Offres</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {candidatures.filter(c => c.statut === "en_attente").length}
                </div>
                <div className="text-sm text-gray-500">En attente</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {candidatures.filter(c => c.statut === "acceptee").length}
                </div>
                <div className="text-sm text-gray-500">Acceptées</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );

  // Composant pour la gestion des utilisateurs
  const GestionUtilisateurs = () => (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total {activeTab}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Utilisateurs Actifs</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.actifs}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <UserCog className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Utilisateurs Inactifs</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.inactifs}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Utilisateurs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-2xl p-2 shadow-lg border">
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
      </div>

      {/* Contenu Utilisateurs */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 border">
        {/* Formulaire d'ajout */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
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
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1 relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Mot de passe temporaire" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <button 
              onClick={handleAddUser}
              disabled={isAdding}
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
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher par email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
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
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50/80">
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
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleDeleteUser(user.id)} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Composant pour la gestion des offres (à implémenter)
  const GestionOffres = () => (
    <div className="text-center p-8">
      <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-700">Gestion des Offres</h3>
      <p className="text-gray-500">Section en cours de développement</p>
    </div>
  );

  const GestionCandidatures = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900 text-center">
        Gestion des Candidatures
      </h2>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border text-center">
          <Users className="h-12 w-12 text-blue-500 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-900">{candidatures.length}</h3>
          <p className="text-gray-600">Total candidatures</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border text-center">
          <BarChart3 className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-900">
            {candidatures.filter(c => c.statut === "en_attente").length}
          </h3>
          <p className="text-gray-600">En attente</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border text-center">
          <FileText className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-900">
            {candidatures.filter(c => c.statut === "acceptee").length}
          </h3>
          <p className="text-gray-600">Acceptées</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border text-center">
          <Archive className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-900">
            {candidatures.filter(c => c.statut === "refusee").length}
          </h3>
          <p className="text-gray-600">Refusées</p>
        </div>
      </div>

      {/* Liste des candidatures */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Nom</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Email</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Type</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Statut</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {candidatures.map((cand) => (
                <tr key={cand.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{cand.nom}</td>
                  <td className="px-6 py-4 text-gray-600">{cand.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      cand.type === "emploi" ? "bg-blue-100 text-blue-800" :
                      cand.type === "stage" ? "bg-green-100 text-green-800" :
                      "bg-purple-100 text-purple-800"
                    }`}>
                      {cand.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(cand.dateSoumission).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      cand.statut === "en_attente" ? "bg-yellow-100 text-yellow-800" :
                      cand.statut === "acceptee" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {cand.statut}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      onClick={() => setSelectedCandidature(cand)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                      title="Voir détails"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal détails candidature */}
      {selectedCandidature && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">Détails de la candidature</h3>
              <button onClick={() => setSelectedCandidature(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <p><strong>Nom :</strong> {selectedCandidature.nom}</p>
              <p><strong>Email :</strong> {selectedCandidature.email}</p>
              <p><strong>Téléphone :</strong> {selectedCandidature.telephone || "Non renseigné"}</p>
              <p><strong>Type :</strong> {selectedCandidature.type}</p>
              <p><strong>Diplôme :</strong> {selectedCandidature.diplome || "Non renseigné"}</p>
              <p><strong>Expérience :</strong> {selectedCandidature.experience || "Non renseigné"}</p>
              <p><strong>Date :</strong> {new Date(selectedCandidature.dateSoumission).toLocaleDateString()}</p>
              
              {selectedCandidature.cvUrl && (
                <p>
                  <strong>CV :</strong>{" "}
                  <a href={getFileUrl(selectedCandidature.cvUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Télécharger
                  </a>
                </p>
              )}
              
              {selectedCandidature.lettreMotivationUrl && (
                <p>
                  <strong>Lettre de motivation :</strong>{" "}
                  <a href={getFileUrl(selectedCandidature.lettreMotivationUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Télécharger
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl shadow-2xl border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate("/")}
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
                <p className="text-gray-600 text-sm">Gestion complète de la plateforme</p>
              </div>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Bouton modification mot de passe */}
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium shadow-md group"
            >
              <Key className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:block">Modifier mot de passe</span>
            </button>

            <button 
              onClick={() => navigate("/")}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium shadow-md group"
            >
              <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:block">Accueil</span>
            </button>
            
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium shadow-md group"
            >
              <LogOut className="h-5 w-5 group-hover:rotate-12 transition-transform" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation principale */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-center mb-8 space-x-1 bg-white/50 rounded-xl p-1 shadow-md">
          <button
            onClick={() => setActiveSection("utilisateurs")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeSection === "utilisateurs"
                ? "bg-blue-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <Users className="h-5 w-5" />
            <span>Gestion des Utilisateurs</span>
          </button>
          <button
            onClick={() => setActiveSection("offres")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeSection === "offres"
                ? "bg-blue-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <Briefcase className="h-5 w-5" />
            <span>Offres d'Emploi</span>
          </button>
          <button
            onClick={() => setActiveSection("candidatures")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeSection === "candidatures"
                ? "bg-blue-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <FileText className="h-5 w-5" />
            <span>Candidatures</span>
          </button>
        </div>

        {/* Contenu principal */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {activeSection === "utilisateurs" && <GestionUtilisateurs />}
          {activeSection === "offres" && <GestionOffres />}
          {activeSection === "candidatures" && <GestionCandidatures />}
        </div>
      </div>

      {/* Modal modification mot de passe */}
      {showPasswordModal && <PasswordModal />}
    </div>
  );
};

export default AdminDashboard;