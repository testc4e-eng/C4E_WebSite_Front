// ============================================================
// Fichier : /components/AdminDashboard.tsx
// Description : Dashboard Administrateur avec gestion complète des utilisateurs et candidatures
// Rôle :
// - Même design et structure que GestionnaireDashboard
// - Gestion complète des utilisateurs (CRUD)
// - Accès total à toutes les candidatures
// - Gestion des rôles (Admin/Gestionnaire)
// - Protection RBAC intégrée
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Shield,
  UserCog,
} from "lucide-react";

// === Types et Interfaces ===
type UserRole = 'admin' | 'gestionnaire';

interface User {
  id: number;
  nom: string;
  email: string;
  role: UserRole;
  dateCreation: string;
  statut: 'active' | 'inactive';
  telephone?: string;
}

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
  statut: "en_attente" | "acceptee" | "refusee" | "ignorer";
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

// === Configuration API ===
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://c4e-website-back.onrender.com";
const getApiUrl = (path: string) => `${API_BASE_URL}${path.startsWith("/") ? path : "/" + path}`;

// === Fonctions utilitaires ===
const getFileUrl = (filePath?: string) => {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  return `${API_BASE_URL}${filePath.startsWith("/") ? filePath : "/" + filePath}`;
};

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

// === Hook d'authentification ===
const useAuth = () => {
  const [user, setUser] = useState<{ role: UserRole; nom: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
          try {
            const userObj = JSON.parse(userData);
            if (userObj.role === 'admin') {
              setUser(userObj);
            }
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { user, loading };
};

// === Composant Principal AdminDashboard ===
const AdminDashboard = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // États de navigation
  const [activeTab, setActiveTab] = useState<"accueil" | "candidatures" | "utilisateurs">("accueil");
  
  // États pour la gestion des utilisateurs
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState("");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    nom: "",
    email: "",
    role: "gestionnaire" as UserRole,
    telephone: "",
    password: "",
  });

  // États pour les candidatures (repris du GestionnaireDashboard)
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [loadingCandidatures, setLoadingCandidatures] = useState(true);
  const [errorCandidatures, setErrorCandidatures] = useState("");
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "diplome" | "competence" | "experience">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterType, setFilterType] = useState<"tous" | "stage_spontane" | "spontanee">("tous");

  // États pour les offres
  const [offres, setOffres] = useState<OffreEmploi[]>([]);
  const [loadingOffres, setLoadingOffres] = useState(false);

  // Redirection si non admin
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Chargement des données
  useEffect(() => {
    if (user?.role === 'admin') {
      if (activeTab === "utilisateurs") {
        fetchUsers();
      } else if (activeTab === "candidatures") {
        fetchCandidatures();
        fetchOffres();
      }
    }
  }, [activeTab, user]);

  // === API Calls ===
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setErrorUsers("");
      const token = localStorage.getItem('token');
      
      const response = await fetch(getApiUrl('/api/admin/users'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Erreur lors du chargement des utilisateurs');
      
      const data = await response.json();
      setUsers(data);
    } catch (err: unknown) {
      setErrorUsers(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchCandidatures = async () => {
    try {
      setLoadingCandidatures(true);
      setErrorCandidatures("");
      const token = localStorage.getItem('token');

      const response = await fetch(getApiUrl('/api/admin/candidatures'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Erreur lors du chargement des candidatures');
      
      const data = await response.json();
      setCandidatures(data);
    } catch (err: unknown) {
      setErrorCandidatures(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoadingCandidatures(false);
    }
  };

  const fetchOffres = async () => {
    try {
      setLoadingOffres(true);
      const token = localStorage.getItem('token');

      const response = await fetch(getApiUrl('/api/offres'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOffres(data);
      }
    } catch (error) {
      console.error('Erreur chargement offres:', error);
    } finally {
      setLoadingOffres(false);
    }
  };

  // === Gestion des Utilisateurs ===
  const createUser = async () => {
    try {
      setErrorUsers("");
      const token = localStorage.getItem('token');

      const response = await fetch(getApiUrl('/api/admin/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) throw new Error('Erreur lors de la création de l\'utilisateur');
      
      const userData = await response.json();
      setUsers(prev => [...prev, userData]);
      setShowUserForm(false);
      setNewUser({ nom: "", email: "", role: "gestionnaire", telephone: "", password: "" });
    } catch (err: unknown) {
      setErrorUsers(err instanceof Error ? err.message : 'Erreur de connexion');
    }
  };

  const updateUser = async (user: User) => {
    try {
      setErrorUsers("");
      const token = localStorage.getItem('token');

      const response = await fetch(getApiUrl(`/api/admin/users/${user.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(user),
      });

      if (!response.ok) throw new Error('Erreur lors de la modification de l\'utilisateur');
      
      setUsers(prev => prev.map(u => u.id === user.id ? user : u));
      setEditingUser(null);
    } catch (err: unknown) {
      setErrorUsers(err instanceof Error ? err.message : 'Erreur de connexion');
    }
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm('Confirmer la suppression de cet utilisateur ?')) return;
    
    try {
      setErrorUsers("");
      const token = localStorage.getItem('token');

      const response = await fetch(getApiUrl(`/api/admin/users/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression de l\'utilisateur');
      
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err: unknown) {
      setErrorUsers(err instanceof Error ? err.message : 'Erreur de connexion');
    }
  };

  // === Gestion des Candidatures (reprise du GestionnaireDashboard) ===
  const changerStatutCandidature = async (candidature: Candidature, nouveauStatut: "en_attente" | "acceptee" | "refusee" | "ignorer") => {
    try {
      const { id, type } = candidature;
      const token = localStorage.getItem('token');

      // Mise à jour immédiate dans l'état local
      setCandidatures(prev =>
        prev.map(c =>
          c.id === id && c.type === type
            ? { ...c, statut: nouveauStatut, ignored: nouveauStatut === "ignorer" }
            : c
        )
      );

      // Appel API
      let endpoint = "";
      if (type === "spontanee") {
        endpoint = `/api/candidatures/spontanees/${id}/statut`;
      } else if (type === "stage_spontane") {
        endpoint = `/api/candidatures/statut/stage_spontane/${id}`;
      } else {
        endpoint = `/api/candidatures/statut/${type}/${id}`;
      }

      await fetch(getApiUrl(endpoint), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ statut: nouveauStatut }),
      });

    } catch (error) {
      console.error("Erreur mise à jour statut:", error);
      setErrorCandidatures("Erreur lors de la mise à jour du statut");
    }
  };

  const supprimerCandidature = async (candidature: Candidature) => {
    if (!window.confirm(`Confirmer la suppression de la candidature de ${candidature.nom} ?`)) return;
    
    try {
      const { id, type } = candidature;
      const token = localStorage.getItem('token');

      const response = await fetch(getApiUrl(`/api/candidatures/${type}/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setCandidatures(prev => prev.filter(c => !(c.id === id && c.type === type)));
        if (selectedCandidature?.id === id && selectedCandidature?.type === type) {
          setSelectedCandidature(null);
        }
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
      setErrorCandidatures("Erreur lors de la suppression");
    }
  };

  // === Fonctions de tri et filtrage ===
  const getSortedCandidatures = (candidatures: Candidature[], sortBy: string, sortOrder: "asc" | "desc") => {
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
  };

  // === Composants d'affichage ===
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

  const ActionsSelectCandidature = ({ candidature }: { candidature: Candidature }) => {
    return (
      <div className="flex items-center space-x-2">
        <select
          value={candidature.statut}
          onChange={(e) => {
            const selectedValue = e.target.value as "en_attente" | "acceptee" | "refusee" | "ignorer";
            changerStatutCandidature(candidature, selectedValue);
          }}
          className="p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          <option value="en_attente">En attente</option>
          <option value="acceptee">Accepter</option>
          <option value="refusee">Refuser</option>
          <option value="ignorer">Ignorer</option>
        </select>
        <button
          onClick={() => setSelectedCandidature(candidature)}
          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200"
          title="Voir détails"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={() => supprimerCandidature(candidature)}
          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200"
          title="Supprimer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  // === Composants des différentes vues ===
  const AccueilAdmin = () => {
    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.statut === 'active').length,
      totalCandidatures: candidatures.length,
      candidaturesEnAttente: candidatures.filter(c => c.statut === 'en_attente').length,
      totalOffres: offres.length,
      offresActives: offres.filter(o => o.statut === 'active').length,
    };

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Tableau de Bord Administrateur</h2>
          <p className="text-xl text-gray-600">Gestion complète de la plateforme</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase">Utilisateurs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                <p className="text-sm text-gray-500">{stats.activeUsers} actifs</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase">Candidatures</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCandidatures}</p>
                <p className="text-sm text-gray-500">{stats.candidaturesEnAttente} en attente</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <FileText className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase">Offres</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalOffres}</p>
                <p className="text-sm text-gray-500">{stats.offresActives} actives</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <Briefcase className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
            <div className="space-y-3">
              <button
                onClick={() => setActiveTab("utilisateurs")}
                className="w-full flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all duration-200"
              >
                <UserPlus className="h-6 w-6 text-blue-600" />
                <span className="font-medium text-blue-700">Gérer les utilisateurs</span>
              </button>
              <button
                onClick={() => setActiveTab("candidatures")}
                className="w-full flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-all duration-200"
              >
                <FileText className="h-6 w-6 text-green-600" />
                <span className="font-medium text-green-700">Voir toutes les candidatures</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dernières activités</h3>
            <div className="space-y-3">
              {users.slice(0, 3).map(user => (
                <div key={user.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Shield className={`h-5 w-5 ${user.role === 'admin' ? 'text-purple-600' : 'text-blue-600'}`} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.nom}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    user.statut === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.statut}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const GestionUtilisateurs = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h2>
          <button
            onClick={() => setShowUserForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all duration-200"
          >
            <UserPlus className="h-5 w-5" />
            <span>Nouvel Utilisateur</span>
          </button>
        </div>

        {errorUsers && (
          <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">
            {errorUsers}
          </div>
        )}

        {loadingUsers ? (
          <div className="text-center py-8 text-gray-600">
            Chargement des utilisateurs...
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full table-auto">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Nom</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Rôle</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Date Création</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-4 py-3 font-medium text-gray-900">{user.nom}</td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          <Shield className="h-3 w-3" />
                          <span>{user.role}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          user.statut === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {new Date(user.dateCreation).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200"
                            title="Supprimer"
                          >
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

        {/* Formulaire de création/modification d'utilisateur */}
        {(showUserForm || editingUser) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fadeIn">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                {editingUser ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                  <input
                    type="text"
                    value={editingUser ? editingUser.nom : newUser.nom}
                    onChange={(e) => editingUser 
                      ? setEditingUser({...editingUser, nom: e.target.value})
                      : setNewUser({...newUser, nom: e.target.value})
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editingUser ? editingUser.email : newUser.email}
                    onChange={(e) => editingUser
                      ? setEditingUser({...editingUser, email: e.target.value})
                      : setNewUser({...newUser, email: e.target.value})
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
                  <select
                    value={editingUser ? editingUser.role : newUser.role}
                    onChange={(e) => editingUser
                      ? setEditingUser({...editingUser, role: e.target.value as UserRole})
                      : setNewUser({...newUser, role: e.target.value as UserRole})
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="gestionnaire">Gestionnaire</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                )}

                {editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                    <select
                      value={editingUser.statut}
                      onChange={(e) => setEditingUser({...editingUser, statut: e.target.value as 'active' | 'inactive'})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUserForm(false);
                    setEditingUser(null);
                    setNewUser({ nom: "", email: "", role: "gestionnaire", telephone: "", password: "" });
                  }}
                  className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={() => editingUser ? updateUser(editingUser) : createUser()}
                  className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all"
                >
                  {editingUser ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const GestionCandidatures = () => {
    const candidaturesFiltrees = candidatures.filter(c => {
      if (filterType === "tous") return true;
      if (filterType === "stage_spontane") return c.type === "stage_spontane";
      if (filterType === "spontanee") return c.type === "spontanee";
      return true;
    });

    const candidaturesTriees = getSortedCandidatures(candidaturesFiltrees, sortBy, sortOrder);

    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900 text-center">Gestion des Candidatures</h2>

        {/* Filtres et tris */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex flex-wrap gap-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as "tous" | "stage_spontane" | "spontanee")}
                className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="tous">Toutes les candidatures</option>
                <option value="stage_spontane">Stages/PFE Spontanés</option>
                <option value="spontanee">Candidatures spontanées</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "diplome" | "competence" | "experience")}
                className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="date">Trier par date</option>
                <option value="diplome">Trier par diplôme</option>
                <option value="competence">Trier par compétences</option>
                <option value="experience">Trier par expérience</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="p-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-all duration-200"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>

            <div className="text-sm text-gray-600">
              {candidaturesTriees.length} candidature(s) trouvée(s)
            </div>
          </div>
        </div>

        {errorCandidatures && (
          <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">
            {errorCandidatures}
          </div>
        )}

        {loadingCandidatures ? (
          <div className="text-center py-8 text-gray-600">
            Chargement des candidatures...
          </div>
        ) : candidaturesTriees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">Aucune candidature</h4>
            <p className="text-gray-500">Aucune candidature ne correspond aux critères sélectionnés.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full table-auto">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Nom</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Diplôme</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Score</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {candidaturesTriees.map((cand) => (
                    <tr key={`${cand.id}-${cand.type}`} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          cand.type === "emploi" ? "bg-blue-100 text-blue-800" :
                          cand.type === "stage" ? "bg-green-100 text-green-800" :
                          cand.type === "pfe" ? "bg-purple-100 text-purple-800" :
                          cand.type === "stage_spontane" ? "bg-teal-100 text-teal-800" :
                          "bg-orange-100 text-orange-800"
                        }`}>
                          {cand.type === "spontanee" ? "Spontanée" :
                           cand.type === "emploi" ? "CDI/CDD" :
                           cand.type === "stage" ? "Stage" :
                           cand.type === "pfe" ? "PFE" :
                           cand.type === "stage_spontane" ? "Stage Spontané" : cand.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{cand.nom}</td>
                      <td className="px-4 py-3 text-gray-600">{cand.email}</td>
                      <td className="px-4 py-3">
                        <DisplayDiplome diplome={cand.diplome} />
                      </td>
                      <td className="px-4 py-3">
                        <DisplayCompetenceScore score={cand.competenceScore} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {new Date(cand.dateSoumission).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          cand.statut === "en_attente" ? "bg-yellow-100 text-yellow-800" :
                          cand.statut === "acceptee" ? "bg-green-100 text-green-800" :
                          cand.statut === "refusee" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {cand.statut === "en_attente" ? "En attente" :
                           cand.statut === "acceptee" ? "Acceptée" :
                           cand.statut === "refusee" ? "Refusée" : "Ignorée"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ActionsSelectCandidature candidature={cand} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de détails de candidature */}
        {selectedCandidature && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fadeIn">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-2xl font-bold text-gray-800">Détails de la candidature</h3>
              </div>

              <div className="space-y-3 overflow-y-auto pr-2 max-h-[70vh]">
                <p><strong>👤 Nom :</strong> {selectedCandidature.nom}</p>
                <p><strong>📧 Email :</strong> {selectedCandidature.email}</p>
                {selectedCandidature.telephone && <p><strong>📞 Téléphone :</strong> {selectedCandidature.telephone}</p>}
                {selectedCandidature.diplome && <p><strong>🎓 Diplôme :</strong> {selectedCandidature.diplome}</p>}
                {selectedCandidature.experience && <p><strong>💼 Expérience :</strong> {selectedCandidature.experience}</p>}
                {selectedCandidature.competenceScore && <p><strong>⭐ Score :</strong> {selectedCandidature.competenceScore}%</p>}
                <p><strong>📅 Date :</strong> {new Date(selectedCandidature.dateSoumission).toLocaleDateString()}</p>
                
                <p><strong>📋 Type :</strong>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    selectedCandidature.type === "emploi" ? "bg-blue-100 text-blue-800" :
                    selectedCandidature.type === "stage" ? "bg-green-100 text-green-800" :
                    selectedCandidature.type === "pfe" ? "bg-purple-100 text-purple-800" :
                    selectedCandidature.type === "stage_spontane" ? "bg-teal-100 text-teal-800" :
                    "bg-orange-100 text-orange-800"
                  }`}>
                    {selectedCandidature.type === "spontanee" ? "Spontanée" :
                     selectedCandidature.type === "emploi" ? "CDI/CDD" :
                     selectedCandidature.type === "stage" ? "Stage" :
                     selectedCandidature.type === "pfe" ? "PFE" :
                     selectedCandidature.type === "stage_spontane" ? "Stage Spontané" : selectedCandidature.type}
                  </span>
                </p>

                {selectedCandidature.cvUrl && (
                  <p>
                    <strong>📎 CV :</strong>{" "}
                    <a href={getFileUrl(selectedCandidature.cvUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>Télécharger le CV</span>
                    </a>
                  </p>
                )}

                {selectedCandidature.lettreMotivationUrl && (
                  <p>
                    <strong>📝 Lettre de motivation :</strong>{" "}
                    <a href={getFileUrl(selectedCandidature.lettreMotivationUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>Télécharger la lettre</span>
                    </a>
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedCandidature(null)}
                  className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // === Rendu principal ===
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null; // La redirection est gérée par useEffect
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-md flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600">Connecté en tant que {user.nom}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200 font-medium shadow-sm"
            >
              <Home className="h-5 w-5" />
              <span>Dashboard Gestionnaire</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 font-medium shadow-sm"
            >
              <LogOut className="h-5 w-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-center mb-8 space-x-1 bg-white/50 rounded-xl p-1 shadow-md">
          <button
            onClick={() => setActiveTab("accueil")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "accueil"
                ? "bg-purple-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span>Accueil Admin</span>
          </button>
          <button
            onClick={() => setActiveTab("candidatures")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "candidatures"
                ? "bg-purple-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <FileText className="h-5 w-5" />
            <span>Candidatures</span>
          </button>
          <button
            onClick={() => setActiveTab("utilisateurs")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "utilisateurs"
                ? "bg-purple-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <UserCog className="h-5 w-5" />
            <span>Utilisateurs</span>
          </button>
        </div>

        {/* Contenu principal */}
        <div className="container mx-auto px-6 py-8">
          {activeTab === "accueil" && <AccueilAdmin />}
          {activeTab === "candidatures" && <GestionCandidatures />}
          {activeTab === "utilisateurs" && <GestionUtilisateurs />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;