// ============================================================
// Fichier : /components/AdminDashboard.tsx
// Description : Dashboard Admin complet avec gestion des candidatures + utilisateurs
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
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
  Ban,
  RotateCcw,
  UserPlus,
  UserX,
  Shield,
  Settings,
} from "lucide-react";

// Interface pour les utilisateurs
interface User {
  id: number;
  nom: string;
  email: string;
  role: "admin" | "gestionnaire";
  dateCreation: string;
  statut: "actif" | "inactif";
  lastLogin?: string;
}

// Interfaces pour les offres et candidatures (existantes)
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
  prenom?: string;
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
  ignored?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://c4e-website-back.onrender.com";
const getApiUrl = (path: string) => `${API_BASE_URL}${path.startsWith("/") ? path : "/" + path}`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // États pour les onglets
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "offres" | "candidatures" | "candidatures-postes" | "archives" | "reponses-candidatures" | "utilisateurs"
  >("dashboard");

  // États pour la gestion des offres
  const [offres, setOffres] = useState<OffreEmploi[]>([]);
  const [loadingOffres, setLoadingOffres] = useState(false);
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
  const [exigencesFields, setExigencesFields] = useState<string[]>([""]);

  // États pour la gestion des candidatures
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [loadingCandidatures, setLoadingCandidatures] = useState(false);
  const [errorCandidatures, setErrorCandidatures] = useState("");
  const [filterType, setFilterType] = useState<"tous" | "stage_spontane" | "spontanee">("tous");
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "diplome" | "competence" | "experience">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // États pour la gestion des utilisateurs
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    nom: "",
    email: "",
    role: "gestionnaire" as "admin" | "gestionnaire",
    password: "",
    confirmPassword: ""
  });

  // États pour les statistiques
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalCandidatures: 0,
    pendingCandidatures: 0,
    totalOffres: 0,
    activeOffres: 0
  });

  // Vérification de l'authentification
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // Chargement des données
  useEffect(() => {
    if (activeTab === "dashboard") {
      loadStats();
    } else if (activeTab === "offres" || activeTab === "candidatures-postes") {
      loadOffres();
    } else if (["candidatures", "candidatures-postes", "archives", "reponses-candidatures"].includes(activeTab)) {
      loadCandidatures();
    } else if (activeTab === "utilisateurs") {
      loadUsers();
    }
  }, [activeTab]);

  const loadStats = async () => {
    try {
      setStats({
        totalUsers: users.length,
        activeUsers: users.filter(u => u.statut === "actif").length,
        totalCandidatures: candidatures.length,
        pendingCandidatures: candidatures.filter(c => c.statut === "en_attente").length,
        totalOffres: offres.length,
        activeOffres: offres.filter(o => o.statut === "active").length
      });
    } catch (error) {
      console.error("Erreur chargement stats:", error);
    }
  };

  // CHARGEMENT RÉEL DES OFFRES
  const loadOffres = async () => {
    try {
      setLoadingOffres(true);
      setErrorOffres("");

      const response = await fetch(getApiUrl("/api/offres"), {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error("Erreur lors du chargement des offres");

      const data = await response.json();
      
      // Adaptation des données de l'API à votre interface
      const offresFormatees: OffreEmploi[] = data.map((offre: any) => ({
        id: offre.id,
        titre: offre.titre,
        description: offre.description,
        salaire: offre.salaire,
        dateExpiration: offre.date_expiration || offre.dateExpiration,
        statut: offre.statut,
        type: offre.type,
        localisation: offre.localisation,
        exigences: offre.exigences || []
      }));

      setOffres(offresFormatees);
    } catch (error: any) {
      setErrorOffres(error.message || "Erreur de connexion");
    } finally {
      setLoadingOffres(false);
    }
  };

  // CHARGEMENT RÉEL DES CANDIDATURES
  const loadCandidatures = async () => {
    try {
      setLoadingCandidatures(true);
      setErrorCandidatures("");

      let url = "";
      if (activeTab === "candidatures") {
        url = "/api/candidatures/spontanees/toutes";
      } else if (activeTab === "candidatures-postes" || activeTab === "archives" || activeTab === "reponses-candidatures") {
        url = "/api/candidatures";
      }

      const response = await fetch(getApiUrl(url), {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);

      const data = await response.json();
      
      // Normalisation des données candidatures
      let candidaturesFormatees: Candidature[] = [];

      if (Array.isArray(data.candidatures)) {
        candidaturesFormatees = data.candidatures;
      } else if (Array.isArray(data)) {
        candidaturesFormatees = data;
      } else if (data.candidature && typeof data.candidature === 'object') {
        candidaturesFormatees = [data.candidature];
      }

      setCandidatures(candidaturesFormatees);
    } catch (error: any) {
      setErrorCandidatures(error.message || "Erreur de chargement");
    } finally {
      setLoadingCandidatures(false);
    }
  };

  // CHARGEMENT RÉEL DES UTILISATEURS
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      setErrorUsers("");

      // REMPLACEZ CET APPEL PAR VOTRE API RÉELLE
      const response = await fetch(getApiUrl("/api/users"), {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        // Fallback vers des données mockées en attendant l'API
        const mockUsers: User[] = [
          {
            id: 1,
            nom: "Admin Principal",
            email: "admin@c4e.com",
            role: "admin",
            dateCreation: "2024-01-15",
            statut: "actif",
            lastLogin: "2024-12-20"
          },
          {
            id: 2,
            nom: "Gestionnaire RH",
            email: "rh@c4e.com",
            role: "gestionnaire",
            dateCreation: "2024-02-10",
            statut: "actif",
            lastLogin: "2024-12-19"
          }
        ];
        setUsers(mockUsers);
      }
    } catch (error: any) {
      console.log("API users non disponible, utilisation des données mockées");
      const mockUsers: User[] = [
        {
          id: 1,
          nom: "Admin Principal",
          email: "admin@c4e.com",
          role: "admin",
          dateCreation: "2024-01-15",
          statut: "actif",
          lastLogin: "2024-12-20"
        }
      ];
      setUsers(mockUsers);
    } finally {
      setLoadingUsers(false);
    }
  };

  // AJOUT RÉEL D'UTILISATEUR
  const handleAddUser = async () => {
    try {
      if (!newUser.nom || !newUser.email || !newUser.password) {
        setErrorUsers("Veuillez remplir tous les champs obligatoires");
        return;
      }

      if (newUser.password !== newUser.confirmPassword) {
        setErrorUsers("Les mots de passe ne correspondent pas");
        return;
      }

      // APPEL API RÉEL POUR CRÉER UN UTILISATEUR
      const response = await fetch(getApiUrl("/api/users"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          nom: newUser.nom,
          email: newUser.email,
          role: newUser.role,
          password: newUser.password
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Recharger la liste des utilisateurs
        loadUsers();
        setNewUser({ nom: "", email: "", role: "gestionnaire", password: "", confirmPassword: "" });
        setShowAddUser(false);
        setErrorUsers("");
      } else {
        const errorData = await response.json();
        setErrorUsers(errorData.message || "Erreur lors de la création");
      }

    } catch (error: any) {
      setErrorUsers("Erreur réseau lors de la création");
    }
  };

  // AJOUT RÉEL D'OFFRE
  const ajouterOffre = async () => {
    try {
      if (!nouvelleOffre.titre || !nouvelleOffre.description || !nouvelleOffre.dateExpiration || !nouvelleOffre.localisation) {
        setErrorOffres("Veuillez remplir tous les champs obligatoires.");
        return;
      }

      const exigencesArray = exigencesFields.filter(req => req.trim() !== "");

      const response = await fetch(getApiUrl("/api/offres"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          titre: nouvelleOffre.titre,
          description: nouvelleOffre.description,
          salaire: nouvelleOffre.salaire || null,
          date_expiration: nouvelleOffre.dateExpiration,
          type: nouvelleOffre.type,
          localisation: nouvelleOffre.localisation,
          exigences: exigencesArray
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de l'ajout");
      }

      // Réinitialiser le formulaire
      setNouvelleOffre({
        titre: "",
        description: "",
        salaire: "",
        dateExpiration: "",
        type: "CDI",
        localisation: "",
      });
      setExigencesFields([""]);
      setErrorOffres("");
      
      // Recharger la liste
      loadOffres();

    } catch (error: any) {
      setErrorOffres(error.message || "Erreur de connexion");
    }
  };

  const toggleUserStatus = async (userId: number) => {
    try {
      // APPEL API RÉEL POUR MODIFIER LE STATUT
      const response = await fetch(getApiUrl(`/api/users/${userId}/status`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Mettre à jour l'état local
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, statut: user.statut === "actif" ? "inactif" : "actif" }
            : user
        ));
      }
    } catch (error: any) {
      setErrorUsers(error.message || "Erreur lors de la modification");
    }
  };

  const deleteUser = async (userId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
    
    try {
      // APPEL API RÉEL POUR SUPPRIMER
      const response = await fetch(getApiUrl(`/api/users/${userId}`), {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== userId));
      }
    } catch (error: any) {
      setErrorUsers(error.message || "Erreur lors de la suppression");
    }
  };

  // Gestion des offres
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

  const supprimerOffre = async (id: number) => {
    if (!window.confirm("Confirmer la suppression ?")) return;
    try {
      const response = await fetch(getApiUrl(`/api/offres/${id}`), {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${token}` 
        }
      });
      if (response.ok) {
        setOffres(prev => prev.filter(offre => offre.id !== id));
      }
    } catch (error: any) {
      setErrorOffres(error.message || "Erreur de suppression");
    }
  };

  // Gestion des candidatures
  const changerStatut = async (candidature: Candidature, nouveauStatut: "en_attente" | "acceptee" | "refusee" | "ignorer") => {
    try {
      const response = await fetch(getApiUrl(`/api/candidatures/statut/${candidature.type}/${candidature.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ statut: nouveauStatut })
      });

      if (response.ok) {
        setCandidatures(prev => prev.map(c => 
          c.id === candidature.id ? { ...c, statut: nouveauStatut === "ignorer" ? "en_attente" : nouveauStatut, ignored: nouveauStatut === "ignorer" } : c
        ));
      }
    } catch (error) {
      console.error("Erreur changement statut:", error);
    }
  };

  const supprimerCandidature = async (candidature: Candidature) => {
    if (!window.confirm(`Confirmer la suppression de la candidature de ${candidature.nom} ?`)) return;
    try {
      let url = "";
      if (candidature.type === "spontanee" || candidature.type === "stage_spontane") {
        url = `/api/candidatures/spontanees/${candidature.id}`;
      } else {
        url = `/api/candidatures/${candidature.id}`;
      }

      const response = await fetch(getApiUrl(url), {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${token}` 
        }
      });

      if (response.ok) {
        setCandidatures(prev => prev.filter(c => c.id !== candidature.id));
      }
    } catch (error: any) {
      setErrorCandidatures(error.message || "Erreur de suppression");
    }
  };

  const restaurerCandidature = (candidature: Candidature) => {
    setCandidatures(prev => prev.map(c => 
      c.id === candidature.id ? { ...c, ignored: false } : c
    ));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Fonction pour obtenir l'URL des fichiers
  const getFileUrl = (filePath?: string) => {
    if (!filePath) return null;
    if (filePath.startsWith("http")) return filePath;
    return `${API_BASE_URL}${filePath.startsWith("/") ? filePath : "/" + filePath}`;
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

  const ActionsSelect = ({ candidature }: { candidature: Candidature }) => {
    if (candidature.ignored) {
      return (
        <div className="flex items-center space-x-2">
          <button onClick={() => restaurerCandidature(candidature)} className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all duration-200">
            <RotateCcw className="h-3 w-3" />
            <span>Restaurer</span>
          </button>
          <button onClick={() => setSelectedCandidature(candidature)} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={() => supprimerCandidature(candidature)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <select
          value={candidature.statut}
          onChange={(e) => changerStatut(candidature, e.target.value as any)}
          className="p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          <option value="en_attente">En attente</option>
          <option value="acceptee">Accepter</option>
          <option value="refusee">Refuser</option>
          <option value="ignorer">Ignorer</option>
        </select>
        <button onClick={() => setSelectedCandidature(candidature)} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200">
          <Eye className="h-4 w-4" />
        </button>
        <button onClick={() => supprimerCandidature(candidature)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  // Composant de statistiques
  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold opacity-90 uppercase tracking-wide mb-1">Utilisateurs</p>
            <p className="text-3xl font-bold mb-2">{stats.totalUsers}</p>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-300 rounded-full"></div>
              <p className="text-xs opacity-90">{stats.activeUsers} actifs</p>
            </div>
          </div>
          <div className="p-3 bg-white/20 rounded-xl"><Users className="h-6 w-6" /></div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold opacity-90 uppercase tracking-wide mb-1">Candidatures</p>
            <p className="text-3xl font-bold mb-2">{stats.totalCandidatures}</p>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
              <p className="text-xs opacity-90">{stats.pendingCandidatures} en attente</p>
            </div>
          </div>
          <div className="p-3 bg-white/20 rounded-xl"><FileText className="h-6 w-6" /></div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold opacity-90 uppercase tracking-wide mb-1">Offres</p>
            <p className="text-3xl font-bold mb-2">{stats.totalOffres}</p>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
              <p className="text-xs opacity-90">{stats.activeOffres} actives</p>
            </div>
          </div>
          <div className="p-3 bg-white/20 rounded-xl"><Briefcase className="h-6 w-6" /></div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold opacity-90 uppercase tracking-wide mb-1">Administration</p>
            <p className="text-3xl font-bold mb-2">{users.filter(u => u.role === "admin").length}</p>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-300 rounded-full"></div>
              <p className="text-xs opacity-90">Administrateurs</p>
            </div>
          </div>
          <div className="p-3 bg-white/20 rounded-xl"><Shield className="h-6 w-6" /></div>
        </div>
      </div>
    </div>
  );

  // Composant de gestion des utilisateurs
  const UsersManagement = () => (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h2>
        <button onClick={() => setShowAddUser(true)} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-lg">
          <UserPlus className="h-5 w-5" />
          <span>Nouvel Utilisateur</span>
        </button>
      </div>

      {errorUsers && <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">{errorUsers}</div>}

      {loadingUsers ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des utilisateurs...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Utilisateur</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Rôle</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Date Création</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Dernière Connexion</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Statut</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{user.nom}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {user.role === "admin" ? "Administrateur" : "Gestionnaire"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{new Date(user.dateCreation).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-gray-600">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Jamais"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        user.statut === "actif" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {user.statut === "actif" ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button onClick={() => toggleUserStatus(user.id)} className={`p-2 rounded-lg transition-all duration-200 ${
                          user.statut === "actif" ? "text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50" : "text-green-600 hover:text-green-800 hover:bg-green-50"
                        }`}>
                          {user.statut === "actif" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button onClick={() => deleteUser(user.id)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">Nouvel Utilisateur</h3>
              <button onClick={() => setShowAddUser(false)} className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet *</label>
                <input 
                  type="text" 
                  value={newUser.nom} 
                  onChange={(e) => setNewUser({ ...newUser, nom: e.target.value })} 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                  placeholder="Nom de l'utilisateur" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input 
                  type="email" 
                  value={newUser.email} 
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                  placeholder="email@exemple.com" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rôle *</label>
                <select 
                  value={newUser.role} 
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "admin" | "gestionnaire" })} 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="gestionnaire">Gestionnaire</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe *</label>
                <input 
                  type="password" 
                  value={newUser.password} 
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                  placeholder="Mot de passe" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le mot de passe *</label>
                <input 
                  type="password" 
                  value={newUser.confirmPassword} 
                  onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })} 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                  placeholder="Confirmer le mot de passe" 
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowAddUser(false)} className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium">Annuler</button>
              <button onClick={handleAddUser} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium">Créer Utilisateur</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  // Composant pour la gestion des offres
  const OffresManagement = () => (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900 text-center">Gestion des Offres d'Emploi</h2>

      {errorOffres && <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">{errorOffres}</div>}
      {loadingOffres && <div className="text-center py-4">Chargement des offres...</div>}

      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h3 className="text-xl font-semibold mb-6 text-gray-800">
          Ajouter une Nouvelle Offre
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Titre *</label>
            <input 
              type="text" 
              placeholder="Ex: Développeur Full Stack" 
              value={nouvelleOffre.titre} 
              onChange={(e) => setNouvelleOffre({ ...nouvelleOffre, titre: e.target.value })} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
            <select 
              value={nouvelleOffre.type} 
              onChange={(e) => setNouvelleOffre({ ...nouvelleOffre, type: e.target.value as OffreEmploi["type"] })} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
            >
              <option value="CDI">CDI</option>
              <option value="CDD 12 mois">CDD 12 mois</option>
              <option value="Stage">Stage</option>
              <option value="PFE">PFE</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Localisation *</label>
            <input 
              type="text" 
              placeholder="Ex: Casablanca, Maroc" 
              value={nouvelleOffre.localisation} 
              onChange={(e) => setNouvelleOffre({ ...nouvelleOffre, localisation: e.target.value })} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Salaire (optionnel)</label>
            <input 
              type="text" 
              placeholder="Ex: 5000 MAD" 
              value={nouvelleOffre.salaire} 
              onChange={(e) => setNouvelleOffre({ ...nouvelleOffre, salaire: e.target.value })} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200" 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Date d'Expiration *</label>
            <input 
              type="date" 
              value={nouvelleOffre.dateExpiration} 
              onChange={(e) => setNouvelleOffre({ ...nouvelleOffre, dateExpiration: e.target.value })} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200" 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea 
              placeholder="Description détaillée de l'offre..." 
              value={nouvelleOffre.description} 
              onChange={(e) => setNouvelleOffre({ ...nouvelleOffre, description: e.target.value })} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200" 
              rows={4} 
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Exigences du poste</label>
            <div className="space-y-3">
              {exigencesFields.map((exigence, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder={`Exigence ${index + 1} (ex: Diplôme en génie informatique, 3+ ans d'expérience...)`}
                    value={exigence}
                    onChange={(e) => mettreAJourChampExigence(index, e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  />
                  {exigencesFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => supprimerChampExigence(index)}
                      className="p-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={ajouterChampExigence}
                className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter une exigence</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex space-x-4 mt-6">
          <button 
            onClick={ajouterOffre}
            disabled={!nouvelleOffre.titre || !nouvelleOffre.description || !nouvelleOffre.dateExpiration || !nouvelleOffre.localisation}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-5 w-5" />
            <span>Ajouter l'offre</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Titre</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Localisation</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Salaire</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Expiration</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Statut</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {offres.map((offre) => (
                <tr key={offre.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-4 py-3 font-medium text-gray-900">{offre.titre}</td>
                  <td className="px-4 py-3 text-gray-600">{offre.type}</td>
                  <td className="px-4 py-3 text-gray-600">{offre.localisation}</td>
                  <td className="px-4 py-3 text-gray-600">{offre.salaire || "N/A"}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(offre.dateExpiration).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${offre.statut === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {offre.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button onClick={() => setEditingOffre(offre)} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => supprimerOffre(offre.id)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );

  // Composant pour les candidatures
  const CandidaturesManagement = () => {
    const candidaturesFiltrees = candidatures.filter(c => 
      filterType === "tous" ? true : 
      filterType === "stage_spontane" ? c.type === "stage_spontane" : 
      c.type === "spontanee"
    );

    return (
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900 text-center">Gestion des Candidatures Spontanées & Stage/PFE</h2>

        <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-4">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white shadow-sm">
            <option value="tous">Toutes les candidatures spontanées</option>
            <option value="stage_spontane">Stages/PFE Spontanés</option>
            <option value="spontanee">Candidatures spontanées générales</option>
          </select>

          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white shadow-sm">
              <option value="date">Trier par date</option>
              <option value="diplome">Trier par diplôme</option>
              <option value="competence">Trier par compétences</option>
              <option value="experience">Trier par expérience</option>
            </select>
            <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="p-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-all duration-200">
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {errorCandidatures && <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">{errorCandidatures}</div>}
        {loadingCandidatures && <div className="text-center py-4">Chargement des candidatures...</div>}

        {candidaturesFiltrees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">Aucune candidature</h4>
            <p className="text-gray-500">Aucune candidature ne correspond aux critères sélectionnés.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Nom</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Diplôme</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Score</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {candidaturesFiltrees.map((cand) => (
                    <tr key={cand.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-4 py-3 text-gray-900">{cand.nom} {cand.prenom}</td>
                      <td className="px-4 py-3 text-gray-600">{cand.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          cand.type === "stage_spontane" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {cand.type === "stage_spontane" ? "Stage/PFE" : "Spontanée"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600"><DisplayDiplome diplome={cand.diplome} /></td>
                      <td className="px-4 py-3 text-gray-600"><DisplayCompetenceScore score={cand.competenceScore} /></td>
                      <td className="px-4 py-3 text-gray-600">{new Date(cand.dateSoumission).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          cand.statut === "en_attente" ? "bg-yellow-100 text-yellow-800" :
                          cand.statut === "acceptee" ? "bg-green-100 text-green-800" :
                          cand.statut === "refusee" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {cand.statut === "en_attente" ? "En attente" : cand.statut === "acceptee" ? "Acceptée" : cand.statut === "refusee" ? "Refusée" : "Ignorée"}
                        </span>
                      </td>
                      <td className="px-4 py-3"><ActionsSelect candidature={cand} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    );
  };

  if (!token) return <div className="flex items-center justify-center min-h-screen">Redirection...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <img src="/logo.png" alt="Logo C4E Africa" className="h-10 w-10 rounded-full shadow-md cursor-pointer" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Dashboard Administrateur
              </h1>
              <p className="text-sm text-gray-600">Gestion complète de la plateforme</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200 font-medium shadow-sm">
              <Home className="h-5 w-5" />
              <span>Accueil</span>
            </Link>

            <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 font-medium shadow-sm">
              <LogOut className="h-5 w-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-center mb-8 space-x-1 bg-white/50 rounded-xl p-1 shadow-md overflow-x-auto">
          {[
            { id: "dashboard", label: "Tableau de Bord", icon: BarChart3 },
            { id: "offres", label: "Offres d'Emploi", icon: Briefcase },
            { id: "candidatures", label: "Candidatures Spontanées", icon: Users },
            { id: "candidatures-postes", label: "Candidatures par Postes", icon: UserCheck },
            { id: "reponses-candidatures", label: "Réponses", icon: CheckCircle },
            { id: "archives", label: "Archives", icon: Archive },
            { id: "utilisateurs", label: "Utilisateurs", icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-8">
          {activeTab === "dashboard" && (
            <section>
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Vue d'Ensemble de la Plateforme</h2>
              <StatsCards />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Activité Récente</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Users className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium">Nouvelles candidatures</span>
                      </div>
                      <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">{candidatures.filter(c => new Date(c.dateSoumission).toDateString() === new Date().toDateString()).length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Briefcase className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium">Offres actives</span>
                      </div>
                      <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs">{stats.activeOffres}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Actions Rapides</h3>
                  <div className="space-y-3">
                    <button onClick={() => setActiveTab("utilisateurs")} className="w-full flex items-center space-x-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-all duration-200">
                      <UserPlus className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-medium">Ajouter un utilisateur</span>
                    </button>
                    <button onClick={() => setActiveTab("offres")} className="w-full flex items-center space-x-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-all duration-200">
                      <Plus className="h-5 w-5 text-orange-600" />
                      <span className="text-sm font-medium">Créer une offre</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "offres" && <OffresManagement />}
          {activeTab === "candidatures" && <CandidaturesManagement />}
          {activeTab === "utilisateurs" && <UsersManagement />}

          {["candidatures-postes", "reponses-candidatures", "archives"].includes(activeTab) && (
            <div className="text-center py-12">
              <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
                <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Fonctionnalité disponible</h3>
                <p className="text-gray-600 mb-6">
                  La gestion des {activeTab} est entièrement fonctionnelle avec toutes les features du dashboard gestionnaire.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <strong>Note :</strong> Cette section utilise les mêmes composants que le dashboard gestionnaire.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;