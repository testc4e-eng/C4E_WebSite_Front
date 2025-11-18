// ============================================================
// Fichier : /components/DashboardAdmin.tsx
// Description : Composant principal du Dashboard Administrateur avec vue modulaire.
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LogOut,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  Briefcase,
  Book,
  Mail,
  Filter,
  ArrowLeft,
  UserCheck,
  FileText,
  Archive,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Home,
  Search,
  Key,
  UserPlus,
  Shield,
  ArrowRight,
  Settings,
} from "lucide-react";
import api from "../lib/api";

// === Configuration API ===
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://c4e-website-back.onrender.com";
const getApiUrl = (path: string) =>
  `${API_BASE_URL}${path.startsWith("/") ? path : "/" + path}`;

// === Interfaces ===
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
  offre_type?: string;
  motivation?: string;
  telephone?: string;
  dateSoumission: string;
  statut: "en_attente" | "acceptee" | "refusee";
  competenceScore?: number;
  poste?: string;
  diplome?: string;
  competences?: { [key: string]: number };
  domaine?: string;
  duree?: string;
  experience?: string;
  source?: "offre" | "spontanee";
  universite?: string;
  type_etablissement?: string;
}

interface User {
  id: number;
  nom: string;
  email: string;
  role: "admin" | "gestionnaire";
  date_creation: string;
  statut: "actif" | "inactif";
}

const diplomeOrder: Record<string, number> = {
  technicien: 1,
  licence: 2,
  master: 3,
  master_ingenieur: 3,
  "cycle d'ingénieur": 3,
  ingenieur: 3,
  doctorat: 4,
  bac: 0,
  bts: 1,
  dut: 1,
};

// Fonction utilitaire pour les URLs de fichiers
const getFileUrl = (filePath?: string) => {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  return `${API_BASE_URL}${filePath.startsWith("/") ? filePath : "/" + filePath}`;
};

// Fonction de tri des candidatures
function getSortedCandidatures(
  candidatures: Candidature[],
  sortBy: string,
  sortOrder: "asc" | "desc"
) {
  return [...candidatures].sort((a, b) => {
    let valA: string | number;
    let valB: string | number;

    switch (sortBy) {
      case "date":
        valA = new Date(a.dateSoumission).getTime();
        valB = new Date(b.dateSoumission).getTime();
        break;
      case "diplome":
        valA = diplomeOrder[a.diplome?.toLowerCase()] || 0;
        valB = diplomeOrder[b.diplome?.toLowerCase()] || 0;
        break;
      case "competence":
        valA = a.competenceScore || 0;
        valB = b.competenceScore || 0;
        break;
      case "experience":
        valA = a.experience || "";
        valB = b.experience || "";
        break;
      default:
        valA = new Date(a.dateSoumission).getTime();
        valB = new Date(b.dateSoumission).getTime();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });
}

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // États principaux de navigation
  const [currentView, setCurrentView] = useState<"main" | "gestion-utilisateurs" | "gestion-candidatures">("main");

  // États pour la gestion des utilisateurs
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    nom: "",
    email: "",
    password: "",
    role: "gestionnaire" as "admin" | "gestionnaire",
  });

  // États pour la gestion des candidatures
  const [activeTab, setActiveTab] = useState<
    "offres" | "candidatures" | "candidatures-postes" | "archives"
  >("offres");
  const [offres, setOffres] = useState<OffreEmploi[]>([]);
  const [loadingOffres, setLoadingOffres] = useState(true);
  const [errorOffres, setErrorOffres] = useState("");
  const [nouvelleOffre, setNouvelleOffre] = useState({
    titre: "",
    description: "",
    salaire: "",
    dateExpiration: "",
    type: "CDI" as OffreEmploi["type"],
    localisation: "",
  });
  const [editingOffre, setEditingOffre] = useState<OffreEmploi | null>(null);
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [loadingCandidatures, setLoadingCandidatures] = useState(true);
  const [errorCandidatures, setErrorCandidatures] = useState("");
  const [filterType, setFilterType] = useState<
    "tous" | "stage_spontane" | "spontanee"
  >("tous");
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [sortBy, setSortBy] = useState<
    "date" | "diplome" | "competence" | "experience"
  >("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"postes" | "candidatures">("postes");
  const [selectedOffre, setSelectedOffre] = useState<OffreEmploi | null>(null);
  const [ongletCandidatures, setOngletCandidatures] = useState<"emploi" | "stage">("emploi");
  const [exigencesFields, setExigencesFields] = useState<string[]>([""]);
  const [editingExigences, setEditingExigences] = useState<string[]>([""]);
  const [archiveFilter, setArchiveFilter] = useState<"tous" | "acceptees" | "refusees">("tous");
  const [searchArchive, setSearchArchive] = useState("");

  // États pour le changement de mot de passe
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // Chargement des données selon la vue
  useEffect(() => {
    if (currentView === "gestion-utilisateurs") {
      fetchUsers();
    } else if (currentView === "gestion-candidatures") {
      if (activeTab === "offres" || activeTab === "candidatures-postes") {
        fetchOffres();
      }
    }
  }, [currentView, activeTab, token]);

  // Fonctions pour charger les données
  const fetchOffres = async () => {
    try {
      setLoadingOffres(true);
      setErrorOffres("");
      const { res, data } = await api.get<OffreEmploi[]>("/api/offres", token);
      if (!res.ok) throw new Error("Erreur lors du chargement des offres.");
      setOffres(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur connexion backend.";
      setErrorOffres(message);
    } finally {
      setLoadingOffres(false);
    }
  };

  const fetchCandidatures = async () => {
    try {
      setLoadingCandidatures(true);
      setErrorCandidatures("");

      if (activeTab === "candidatures") {
        const { res, data } = await api.get<Candidature[]>("/api/candidatures/spontanees/toutes", token);
        if (!res.ok) throw new Error("Erreur lors du chargement des candidatures spontanées.");
        setCandidatures(data);
      } else if (activeTab === "candidatures-postes") {
        const { res, data } = await api.get<Candidature[]>("/api/candidatures", token);
        if (!res.ok) throw new Error("Erreur lors du chargement des candidatures par offres.");
        const candidaturesSurOffres = data.filter(
          (c) => c.type === "emploi" || c.type === "stage" || c.type === "pfe"
        );
        setCandidatures(candidaturesSurOffres);
      } else if (activeTab === "archives") {
        const { res, data } = await api.get<Candidature[]>("/api/candidatures", token);
        if (!res.ok) throw new Error("Erreur lors du chargement des archives.");
        setCandidatures(data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur connexion backend.";
      setErrorCandidatures(message);
    } finally {
      setLoadingCandidatures(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setErrorUsers("");
      const { res, data } = await api.get<User[]>("/api/users", token);
      if (!res.ok) throw new Error("Erreur lors du chargement des utilisateurs.");
      setUsers(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur connexion backend.";
      setErrorUsers(message);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fonctions pour la gestion des utilisateurs
  const handleAddUser = async () => {
    try {
      setErrorUsers("");
      const { res, data } = await api.post("/api/users", newUser, token);
      if (!res.ok) throw new Error(data.message || "Erreur lors de la création de l'utilisateur.");
      setUsers(prev => [...prev, data.user]);
      setShowAddUser(false);
      setNewUser({ nom: "", email: "", password: "", role: "gestionnaire" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setErrorUsers(message);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
    try {
      const { res } = await api.delete(`/api/users/${userId}`, token);
      if (!res.ok) throw new Error("Erreur lors de la suppression de l'utilisateur.");
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setErrorUsers(message);
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "actif" ? "inactif" : "actif";
      const { res, data } = await api.put(
        `/api/users/${userId}/status`,
        { statut: newStatus },
        token
      );
      if (!res.ok) throw new Error("Erreur lors de la modification du statut.");
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, statut: newStatus } : user
      ));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setErrorUsers(message);
    }
  };

  // Fonctions pour la gestion des offres et candidatures (conservées du code précédent)
  const ajouterChampExigence = () => setExigencesFields([...exigencesFields, ""]);
  const supprimerChampExigence = (index: number) => {
    if (exigencesFields.length > 1) {
      setExigencesFields(exigencesFields.filter((_, i) => i !== index));
    }
  };
  const mettreAJourChampExigence = (index: number, valeur: string) => {
    const nouvellesExigences = [...exigencesFields];
    nouvellesExigences[index] = valeur;
    setExigencesFields(nouvellesExigences);
  };

  const ajouterChampExigenceEdit = () => setEditingExigences([...editingExigences, ""]);
  const supprimerChampExigenceEdit = (index: number) => {
    if (editingExigences.length > 1) {
      setEditingExigences(editingExigences.filter((_, i) => i !== index));
    }
  };
  const mettreAJourChampExigenceEdit = (index: number, valeur: string) => {
    const nouvellesExigences = [...editingExigences];
    nouvellesExigences[index] = valeur;
    setEditingExigences(nouvellesExigences);
  };

  const handleEditClick = (offre: OffreEmploi) => {
    setEditingOffre(offre);
    setEditingExigences(offre.exigences.length > 0 ? [...offre.exigences] : [""]);
  };

  const ajouterOffre = async () => {
    if (!nouvelleOffre.titre || !nouvelleOffre.description || !nouvelleOffre.dateExpiration || !nouvelleOffre.localisation) {
      setErrorOffres("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    try {
      const exigencesArray = exigencesFields.filter((req) => req.trim() !== "");
      const res = await fetch(getApiUrl("/api/offres"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...nouvelleOffre,
          date_expiration: nouvelleOffre.dateExpiration,
          exigences: exigencesArray,
        }),
      });
      if (!res.ok) throw new Error("Erreur ajout offre.");
      const newOffreData = await res.json();
      setOffres((prev) => [...prev, newOffreData.offre]);
      setNouvelleOffre({ titre: "", description: "", salaire: "", dateExpiration: "", type: "CDI", localisation: "" });
      setExigencesFields([""]);
      setErrorOffres("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur connexion backend.";
      setErrorOffres(message);
    }
  };

  const modifierOffre = async (offre: OffreEmploi) => {
    if (!offre.titre || !offre.description || !offre.dateExpiration || !offre.localisation) {
      setErrorOffres("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    try {
      const exigencesArray = editingExigences.filter((req) => req.trim() !== "");
      const res = await fetch(getApiUrl(`/api/offres/${offre.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          titre: offre.titre,
          description: offre.description,
          salaire: offre.salaire || null,
          date_expiration: offre.dateExpiration,
          type: offre.type,
          localisation: offre.localisation,
          exigences: exigencesArray,
          statut: offre.statut,
        }),
      });
      if (!res.ok) throw new Error("Erreur modification offre.");
      const updatedOffre = { ...offre, exigences: exigencesArray };
      setOffres((prev) => prev.map((o) => (o.id === offre.id ? updatedOffre : o)));
      setEditingOffre(null);
      setEditingExigences([""]);
      setErrorOffres("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur connexion backend.";
      setErrorOffres(message);
    }
  };

  const supprimerOffre = async (id: number) => {
    if (!window.confirm("Confirmer la suppression ?")) return;
    try {
      const res = await fetch(getApiUrl(`/api/offres/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur suppression offre.");
      setOffres((prev) => prev.filter((o) => o.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur connexion backend.";
      setErrorOffres(message);
    }
  };

  const supprimerCandidature = async (candidature: Candidature) => {
    if (!window.confirm(`Confirmer la suppression de la candidature de ${candidature.nom} ?`)) return;
    try {
      const { id, type } = candidature;
      const url = getApiUrl(`/api/candidatures/${type}/${id}`);
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setCandidatures((prev) => prev.filter((c) => !(c.id === id && c.type === type)));
      if (selectedCandidature?.id === id && selectedCandidature?.type === type) {
        setSelectedCandidature(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setErrorCandidatures(`Échec: ${message}`);
    }
  };

  const changerStatut = async (candidature: Candidature, statut: Candidature["statut"]) => {
    try {
      const { id, type } = candidature;
      setCandidatures((prev) => prev.map((c) => (c.id === id && c.type === type ? { ...c, statut } : c)));
      let typeAPI = type;
      if (type === "stage_spontane") typeAPI = "stage";
      const res = await fetch(getApiUrl(`/api/candidatures/statut/${typeAPI}/${id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setErrorCandidatures(`Échec: ${message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    try {
      const response = await fetch(getApiUrl("/api/auth/change-password"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Erreur HTTP ${response.status}`);
      setPasswordSuccess(data.message || "Mot de passe changé avec succès !");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setPasswordError(error.message || "Une erreur inconnue est survenue");
    }
  };

  // Composants d'affichage
  const DisplayDiplome = ({ diplome }: { diplome?: string }) => {
    if (!diplome) return <span className="text-gray-400 italic">Non renseigné</span>;
    return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">{diplome}</span>;
  };

  const DisplayCompetenceScore = ({ score }: { score?: number }) => {
    if (!score) return <span className="text-gray-400 italic">N/A</span>;
    return (
      <div className="flex items-center space-x-2">
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(score, 100)}%` }}></div>
        </div>
        <span className="text-sm font-medium">{score}%</span>
      </div>
    );
  };

  const DisplayExperience = ({ experience }: { experience?: string }) => {
    if (!experience || experience === "0") {
      return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">0</span>;
    }
    return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">{experience}</span>;
  };

  // VUE PRINCIPALE
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
          onClick={() => setCurrentView("gestion-utilisateurs")}
        >
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Gestion des Utilisateurs
            </h3>
            <p className="text-gray-600 mb-6">
              Créez et gérez les comptes administrateurs et gestionnaires
            </p>
            <div className="flex items-center justify-center text-blue-600 group-hover:text-blue-700">
              <span className="font-semibold">Accéder</span>
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
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
            <div className="flex items-center justify-center text-purple-600 group-hover:text-purple-700">
              <span className="font-semibold">Accéder</span>
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );

  // VUE GESTION DES UTILISATEURS
  const GestionUtilisateursView = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Header avec bouton retour */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentView("main")}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour au tableau de bord</span>
          </button>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h2>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-md transition-all duration-200 font-medium"
        >
          <UserPlus className="h-5 w-5" />
          <span>Ajouter un Utilisateur</span>
        </button>
      </div>

      {errorUsers && (
        <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">
          {errorUsers}
        </div>
      )}

      {loadingUsers ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des utilisateurs...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-700 mb-2">
            Aucun utilisateur trouvé
          </h4>
          <p className="text-gray-500">
            Commencez par créer votre premier utilisateur.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Nom</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Rôle</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Date de création</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Statut</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 text-gray-900">{user.nom}</td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {user.role === "admin" ? "Administrateur" : "Gestionnaire"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(user.date_creation).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        user.statut === "actif" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {user.statut === "actif" ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => handleToggleUserStatus(user.id, user.statut)}
                        className={`p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 ${
                          user.statut === "actif"
                            ? "text-red-600 hover:text-red-800 hover:bg-red-50 focus:ring-red-500"
                            : "text-green-600 hover:text-green-800 hover:bg-green-50 focus:ring-green-500"
                        }`}
                        title={user.statut === "actif" ? "Désactiver" : "Activer"}
                      >
                        {user.statut === "actif" ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                        title="Supprimer cet utilisateur"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal pour ajouter un utilisateur */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">Ajouter un Utilisateur</h3>
              <button onClick={() => setShowAddUser(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              {errorUsers && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errorUsers}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                <input type="text" value={newUser.nom} onChange={(e) => setNewUser({ ...newUser, nom: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Entrez le nom complet" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Entrez l'email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe *</label>
                <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Entrez le mot de passe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rôle *</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "admin" | "gestionnaire" })} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  <option value="gestionnaire">Gestionnaire</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowAddUser(false)} className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium">Annuler</button>
              <button onClick={handleAddUser} disabled={!newUser.nom || !newUser.email || !newUser.password} className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all font-medium disabled:opacity-50">Créer l'utilisateur</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );

  // VUE GESTION DES CANDIDATURES (à compléter avec le code existant)
  const GestionCandidaturesView = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Header avec bouton retour */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentView("main")}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour au tableau de bord</span>
          </button>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Gestion des Candidatures</h2>
      </div>

      {/* Navigation des onglets des candidatures */}
      <div className="flex justify-center mb-8 space-x-1 bg-white/50 rounded-xl p-1 shadow-md">
        <button onClick={() => setActiveTab("offres")} className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === "offres" ? "bg-yellow-500 text-white shadow-lg" : "text-gray-600 hover:text-gray-800 hover:bg-white/50"}`}>
          <Briefcase className="h-5 w-5" />
          <span>Offres d'Emploi</span>
        </button>
        <button onClick={() => setActiveTab("candidatures")} className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === "candidatures" ? "bg-yellow-500 text-white shadow-lg" : "text-gray-600 hover:text-gray-800 hover:bg-white/50"}`}>
          <Users className="h-5 w-5" />
          <span>Candidatures Spontanées</span>
        </button>
        <button onClick={() => setActiveTab("candidatures-postes")} className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === "candidatures-postes" ? "bg-yellow-500 text-white shadow-lg" : "text-gray-600 hover:text-gray-800 hover:bg-white/50"}`}>
          <Briefcase className="h-5 w-5" />
          <span>Candidatures par Postes</span>
        </button>
        <button onClick={() => setActiveTab("archives")} className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${activeTab === "archives" ? "bg-yellow-500 text-white shadow-lg" : "text-gray-600 hover:text-gray-800 hover:bg-white/50"}`}>
          <Archive className="h-5 w-5" />
          <span>Archives</span>
        </button>
      </div>

      {/* Contenu des onglets des candidatures */}
      {/* Ici vous pouvez intégrer tout le code existant pour la gestion des offres et candidatures */}
      <div className="text-center py-12 bg-white rounded-xl shadow-lg">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Gestion des Candidatures
        </h3>
        <p className="text-gray-600 mb-4">
          Interface de gestion des offres et candidatures
        </p>
        <p className="text-sm text-gray-500">
          Onglet actif: {activeTab}
        </p>
      </div>

      {/* Note: Intégrez ici tout le code existant pour la gestion des offres, candidatures, etc. */}
      {/* Vous pouvez copier-coller les sections correspondantes du Dashboard original */}
    </motion.div>
  );

  if (!token) return <div className="flex items-center justify-center min-h-screen">Redirection...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <img src="/logo.png" alt="Logo C4E Africa" className="h-10 w-10 rounded-full shadow-md cursor-pointer" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Dashboard Administrateur
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={() => setShowChangePassword(true)} className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 font-medium shadow-sm">
              <Key className="h-5 w-5" />
              <span>Changer Mot de Passe</span>
            </button>
            <Link to="/" className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200 font-medium shadow-sm">
              Accueil
            </Link>
            <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 font-medium shadow-sm">
              <LogOut className="h-5 w-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {currentView === "main" && <MainView />}
        {currentView === "gestion-utilisateurs" && <GestionUtilisateursView />}
        {currentView === "gestion-candidatures" && <GestionCandidaturesView />}
      </div>

      {/* Modale de changement de mot de passe */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">Changer le mot de passe</h3>
              <button onClick={() => setShowChangePassword(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              {passwordError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{passwordError}</div>}
              {passwordSuccess && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">{passwordSuccess}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel</label>
                <input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Entrez votre mot de passe actuel" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
                <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Entrez le nouveau mot de passe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le nouveau mot de passe</label>
                <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Confirmez le nouveau mot de passe" />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowChangePassword(false)} className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium">Annuler</button>
              <button onClick={handleChangePassword} className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all font-medium">Changer le mot de passe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAdmin;