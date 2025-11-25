// ============================================================
// Fichier : /components/DashboardAdmin.tsx
// Description : Composant principal du Dashboard Administrateur avec vue modulaire - VERSION CORRIGÉE
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCallback } from "react";
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
  Ban,
  RotateCcw,
  X,
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

// Fonction utilitaire pour gérer les erreurs API
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = `Erreur HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = `Erreur ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  return response;
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
    motDePasse: "",
    role: "gestionnaire" as "admin" | "gestionnaire"
  });

  // États pour la gestion des candidatures
  const [activeTab, setActiveTab] = useState<
    "offres" | "candidatures" | "candidatures-postes" | "archives" | "reponses-candidatures"
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
  const [archiveFilter, setArchiveFilter] = useState<"tous" | "acceptees" | "refusees" | "ignorees">("tous");
  const [searchArchive, setSearchArchive] = useState("");

  // États pour les notifications
  const [notificationCounts, setNotificationCounts] = useState({
    candidatures: 0,
    candidaturesPostes: 0
  });

  // États pour le changement de mot de passe
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // Charger les données depuis localStorage au montage
  useEffect(() => {
    const savedCandidatures = localStorage.getItem('candidatures');
    if (savedCandidatures) {
      try {
        setCandidatures(JSON.parse(savedCandidatures));
      } catch (error) {
        console.error('Erreur parsing localStorage:', error);
      }
    }
  }, []);

  // Sauvegarder les candidatures dans localStorage à chaque modification
  useEffect(() => {
    localStorage.setItem('candidatures', JSON.stringify(candidatures));
    
    // Calculer les notifications
    const candidaturesEnAttente = candidatures.filter(c => 
      c.statut === "en_attente" && !c.ignored
    );
    
    const candidaturesSpontaneesEnAttente = candidaturesEnAttente.filter(c => 
      c.type === "spontanee" || c.type === "stage_spontane"
    ).length;
    
    const candidaturesPostesEnAttente = candidaturesEnAttente.filter(c => 
      c.type === "emploi" || c.type === "stage" || c.type === "pfe"
    ).length;

    setNotificationCounts({
      candidatures: candidaturesSpontaneesEnAttente,
      candidaturesPostes: candidaturesPostesEnAttente
    });
  }, [candidatures]);

  // Chargement des données selon la vue
  useEffect(() => {
    if (currentView === "gestion-utilisateurs") {
      fetchUsers();
    } else if (currentView === "gestion-candidatures") {
      if (activeTab === "offres" || activeTab === "candidatures-postes") {
        fetchOffres();
      }
      if (["candidatures", "candidatures-postes", "archives", "reponses-candidatures"].includes(activeTab)) {
        fetchCandidatures();
      }
    }
  }, [currentView, activeTab]);

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

      console.log("🔄 Chargement des candidatures...");

      if (activeTab === "candidatures") {
        // Charger TOUTES les candidatures spontanées
        console.log("📥 Chargement des candidatures spontanées...");
        
        try {
          const { res, data } = await api.get("/api/candidatures/spontanees/toutes", token);
          
          if (res.ok && data) {
            console.log(`✅ ${data.length} candidatures spontanées chargées`);
            
            const allCandidatures = data.map((c: any) => ({
              ...c,
              type: c.type || "spontanee",
              ignored: false,
              competenceScore: c.competenceScore || calculateCompetenceScore(c.competences)
            }));
            
            setCandidatures(allCandidatures);
          } else {
            console.warn("⚠️ Aucune candidature spontanée trouvée");
            setCandidatures([]);
          }
        } catch (error) {
          console.error("❌ Erreur chargement candidatures spontanées:", error);
          // Fallback: utiliser les données locales
          const savedCandidatures = localStorage.getItem('candidatures');
          if (savedCandidatures) {
            try {
              setCandidatures(JSON.parse(savedCandidatures));
            } catch (e) {
              console.error("Erreur parsing localStorage:", e);
              setCandidatures([]);
            }
          } else {
            setCandidatures([]);
          }
        }
        
      } else if (activeTab === "candidatures-postes" || activeTab === "archives" || activeTab === "reponses-candidatures") {
        // Charger les candidatures par postes (CDI/CDD)
        console.log("📥 Chargement des candidatures par postes...");
        
        try {
          const { res, data } = await api.get("/api/candidatures", token);
          
          if (res.ok && data) {
            console.log(`✅ ${data.length} candidatures par postes chargées`);
            
            const candidaturesAvecType = data.map((c: any) => ({
              ...c,
              type: c.type || "emploi",
              ignored: false
            }));
            
            setCandidatures(candidaturesAvecType);
          } else {
            console.warn("⚠️ Aucune candidature par poste trouvée");
            setCandidatures([]);
          }
        } catch (error) {
          console.error("❌ Erreur chargement candidatures par postes:", error);
          setCandidatures([]);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur connexion backend.";
      console.error("❌ Erreur fetchCandidatures:", err);
      setErrorCandidatures(message);
      setCandidatures([]);
    } finally {
      setLoadingCandidatures(false);
    }
  };

  // Fonction utilitaire pour calculer le score de compétence
  const calculateCompetenceScore = (competences: any) => {
    if (!competences) return 0;
    
    try {
      const comps = typeof competences === 'string' ? JSON.parse(competences) : competences;
      const values = Object.values(comps).filter(val => typeof val === 'number');
      
      if (values.length === 0) return 0;
      
      const total = values.reduce((sum: number, val: number) => sum + val, 0);
      const average = total / values.length;
      
      // Convertir en pourcentage (sur 5 points)
      return Math.round((average / 5) * 100);
    } catch (error) {
      console.error("Erreur calcul score compétences:", error);
      return 0;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setErrorUsers("");
      
      const { res, data } = await api.get<User[]>("/api/admin/utilisateurs", token);
      
      if (!res.ok) {
        throw new Error(`Erreur ${res.status} lors du chargement des utilisateurs`);
      }
      
      setUsers(data as User[]);
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur connexion backend.";
      console.error("Erreur chargement utilisateurs:", err);
      setErrorUsers(message);
    } finally {
      setLoadingUsers(false);
    }
  };

  // FONCTION CORRIGÉE POUR AJOUTER UN UTILISATEUR
  const handleAddUser = async () => {
    try {
      setErrorUsers("");

      // Validation
      if (!newUser.nom?.trim()) {
        setErrorUsers("Le nom est requis");
        return;
      }
      if (!newUser.email?.trim()) {
        setErrorUsers("L'email est requis");
        return;
      }
      if (!newUser.motDePasse) {
        setErrorUsers("Le mot de passe est requis");
        return;
      }
      if (newUser.motDePasse.length < 6) {
        setErrorUsers("Le mot de passe doit contenir au moins 6 caractères");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUser.email)) {
        setErrorUsers("Veuillez entrer un email valide");
        return;
      }

      const userType = newUser.role === "admin" ? "administrateurs" : "gestionnaires";
      
      // Format des données pour l'API
      const userData = {
        nom: newUser.nom.trim(),
        email: newUser.email.trim(),
        motDePasse: newUser.motDePasse
      };

      console.log("🔄 Création d'utilisateur:", { 
        userType, 
        userData: { ...userData, motDePasse: "***" }
      });

      // Utilisation de l'API avec gestion d'erreur améliorée
      const { res, data } = await api.post(`/api/admin/${userType}`, userData, token);
      
      if (!res.ok) {
        const errorData = data as any;
        throw new Error(errorData?.message || errorData?.error || `Erreur ${res.status}`);
      }

      console.log("✅ Utilisateur créé avec succès:", data);

      // Réinitialiser et fermer
      setNewUser({ nom: "", email: "", motDePasse: "", role: "gestionnaire" });
      setShowAddUser(false);
      
      // Recharger la liste
      fetchUsers();

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue lors de la création";
      console.error("❌ Erreur création utilisateur:", err);
      setErrorUsers(`Erreur: ${message}`);
    }
  };

  // Fonction pour supprimer un utilisateur
  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.nom} ?`)) return;
    try {
      const userType = user.role === "admin" ? "administrateurs" : "gestionnaires";
      
      const { res, data } = await api.delete(`/api/admin/${userType}/${user.id}`, token);
      
      if (!res.ok) {
        const errorData = data as any;
        throw new Error(errorData?.message || errorData?.error || "Erreur lors de la suppression.");
      }
      
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setErrorUsers(message);
    }
  };

  // Fonctions pour la gestion des offres et candidatures
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

  // Fonctions pour gérer les changements de formulaire
  const handleNouvelleOffreChange = useCallback((field: keyof typeof nouvelleOffre, value: string) => {
    setNouvelleOffre(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleEditingOffreChange = useCallback((field: keyof OffreEmploi, value: string) => {
    if (editingOffre) {
      setEditingOffre(prev => ({
        ...prev,
        [field]: value
      }));
    }
  }, [editingOffre]);

  const ajouterOffre = async () => {
    if (!nouvelleOffre.titre.trim() || !nouvelleOffre.description.trim() || !nouvelleOffre.dateExpiration || !nouvelleOffre.localisation.trim()) {
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
    if (!offre.titre.trim() || !offre.description.trim() || !offre.dateExpiration || !offre.localisation.trim()) {
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

  // Fonction pour envoyer des emails
  const envoyerEmailCandidature = async (
    candidature: Candidature,
    statut: "acceptee" | "refusee"
  ) => {
    try {
      const response = await fetch(getApiUrl("/api/candidatures/envoyer-email"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          candidatureId: candidature.id,
          type: candidature.type,
          statut: statut,
          email: candidature.email,
          nom: candidature.nom,
          poste: candidature.poste || "Non spécifié",
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'envoi de l'email");
      }

      const result = await response.json();
      console.log(`✅ Email ${statut} envoyé à ${candidature.email}`, result);
    } catch (error) {
      console.error("❌ Erreur envoi email:", error);
    }
  };

  // Fonction pour restaurer une candidature ignorée
  const restaurerCandidature = (candidature: Candidature) => {
    setCandidatures((prev) =>
      prev.map((c) =>
        c.id === candidature.id && c.type === candidature.type
          ? { ...c, ignored: false }
          : c
      )
    );
  };

  // Fonction pour changer le statut
  const changerStatut = async (
    candidature: Candidature,
    nouveauStatut: "en_attente" | "acceptee" | "refusee" | "ignorer"
  ) => {
    try {
      const { id, type } = candidature;

      if (nouveauStatut === "ignorer") {
        // Marquer comme ignorée localement
        const updatedCandidature = { ...candidature, ignored: true, statut: "en_attente" as const };
        setCandidatures((prev) =>
          prev.map((c) =>
            c.id === id && c.type === type ? updatedCandidature : c
          )
        );
        return;
      }

      // Mettre à jour le statut dans l'UI
      const updatedCandidature = { ...candidature, statut: nouveauStatut, ignored: false };
      setCandidatures((prev) =>
        prev.map((c) =>
          c.id === id && c.type === type ? updatedCandidature : c
        )
      );

      // Déterminer le type d'API correct
      let typeAPI = type;
      if (type === "stage_spontane") {
        typeAPI = "spontanee";
      }

      const endpoint = typeAPI === "spontanee" 
        ? `/api/candidatures/spontanees/${id}`
        : `/api/candidatures/${typeAPI}/${id}`;

      const res = await fetch(
        getApiUrl(endpoint),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            statut: nouveauStatut
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }

      // Envoyer l'email si acceptée ou refusée
      if (nouveauStatut === "acceptee" || nouveauStatut === "refusee") {
        await envoyerEmailCandidature(candidature, nouveauStatut);
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setErrorCandidatures(`Échec mise à jour statut: ${message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("candidatures");
    navigate("/login");
  };

  // Fonction de changement de mot de passe
  const handleChangePassword = async () => {
    try {
      setIsChangingPassword(true);
      setPasswordError("");
      setPasswordSuccess("");

      // Validation
      if (!passwordData.currentPassword) {
        setPasswordError("Le mot de passe actuel est requis");
        return;
      }
      if (!passwordData.newPassword) {
        setPasswordError("Le nouveau mot de passe est requis");
        return;
      }
      if (!passwordData.confirmPassword) {
        setPasswordError("La confirmation du mot de passe est requise");
        return;
      }
      if (passwordData.newPassword.length < 6) {
        setPasswordError("Le nouveau mot de passe doit contenir au moins 6 caractères");
        return;
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError("Les mots de passe ne correspondent pas");
        return;
      }

      const requestBody = {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      };

      const response = await fetch(getApiUrl("/api/auth/change-password"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `Erreur ${response.status}`);
      }

      setPasswordSuccess(data.message || "Mot de passe changé avec succès !");
      
      // Réinitialiser
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess("");
      }, 2000);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      setPasswordError(message);
    } finally {
      setIsChangingPassword(false);
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

  // Composant ActionsSelect pour gérer les actions sur les candidatures
const ActionsSelect = ({ candidature }: { candidature: Candidature }) => {
  if (candidature.ignored) {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => restaurerCandidature(candidature)}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all duration-200"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Restaurer</span>
        </button>
        <button
          onClick={() => {
            console.log("🟡 Clic sur visualiser candidature ignorée:", candidature);
            setSelectedCandidature(candidature);
          }}
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
  }

  return (
    <div className="flex items-center space-x-2">
      <select
        value={candidature.statut}
        onChange={(e) => {
          const selectedValue = e.target.value as "en_attente" | "acceptee" | "refusee" | "ignorer";
          changerStatut(candidature, selectedValue);
        }}
        className="p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
      >
        <option value="en_attente">En attente</option>
        <option value="acceptee">Accepter</option>
        <option value="refusee">Refuser</option>
        <option value="ignorer">Ignorer</option>
      </select>
      <button
        onClick={() => {
          console.log("🟡 Clic sur visualiser candidature active:", candidature);
          setSelectedCandidature(candidature);
        }}
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

  // Filtrage des candidatures pour les différents onglets
  const candidaturesActives = candidatures.filter(c => !c.ignored);
  const candidaturesSpontanees = candidaturesActives.filter(c => 
    c.type === "spontanee" || c.type === "stage_spontane"
  );
  const candidaturesParPostes = candidaturesActives.filter(c => 
    c.type === "emploi" || c.type === "stage" || c.type === "pfe"
  );
  const candidaturesArchivees = candidaturesActives.filter(
    (c) => c.statut === "acceptee" || c.statut === "refusee"
  );
  const candidaturesIgnorees = candidatures.filter((c) => c.ignored);

  const candidaturesFiltreesArchive =
    archiveFilter === "tous"
      ? candidaturesArchivees
      : candidaturesArchivees.filter((c) =>
          archiveFilter === "acceptees"
            ? c.statut === "acceptee"
            : archiveFilter === "refusees"
            ? c.statut === "refusee"
            : c.ignored
        );

  const candidaturesRecherchees = candidaturesFiltreesArchive.filter(
    (c) =>
      c.nom.toLowerCase().includes(searchArchive.toLowerCase()) ||
      c.email.toLowerCase().includes(searchArchive.toLowerCase()) ||
      (c.poste && c.poste.toLowerCase().includes(searchArchive.toLowerCase()))
  );

  const statsArchives = {
    total: candidaturesArchivees.length,
    acceptees: candidaturesArchivees.filter((c) => c.statut === "acceptee").length,
    refusees: candidaturesArchivees.filter((c) => c.statut === "refusee").length,
  };

  const statsIgnorees = {
    total: candidaturesIgnorees.length,
  };

  // Statistiques globales
  const StatsOverview = () => {
    const stats = {
      total: candidaturesActives.length,
      enAttente: candidaturesActives.filter((c) => c.statut === "en_attente").length,
      acceptees: candidaturesActives.filter((c) => c.statut === "acceptee").length,
      refusees: candidaturesActives.filter((c) => c.statut === "refusee").length,
      ignorees: candidaturesIgnorees.length,
      offresActives: offres.filter((o) => o.statut === "active").length,
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Total</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.total}</p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-xs text-gray-500">Candidatures actives</p>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors duration-300">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-amber-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">En Attente</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.enAttente}</p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <p className="text-xs text-gray-500">À traiter</p>
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors duration-300">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-emerald-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Acceptées</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.acceptees}</p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <p className="text-xs text-gray-500">Validées</p>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors duration-300">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-rose-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Refusées</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.refusees}</p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                <p className="text-xs text-gray-500">Non retenues</p>
              </div>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl group-hover:bg-rose-100 transition-colors duration-300">
              <XCircle className="h-6 w-6 text-rose-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-gray-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Ignorées</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.ignorees}</p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <p className="text-xs text-gray-500">Archivées</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors duration-300">
              <Ban className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Fonction pour obtenir les statistiques des candidatures par offre
  const getCandidatureStats = (offreId: number) => {
    const candidaturesOffre = candidaturesParPostes.filter((c) => {
      return c.offre_id === offreId;
    });

    return {
      total: candidaturesOffre.length,
      enAttente: candidaturesOffre.filter((c) => c.statut === "en_attente").length,
      acceptees: candidaturesOffre.filter((c) => c.statut === "acceptee").length,
      refusees: candidaturesOffre.filter((c) => c.statut === "refusee").length,
    };
  };

  // Composant pour la liste des postes
  const PostesList = ({ filtreType = "emploi" }: { filtreType?: "emploi" | "stage" }) => {
    const offresFiltrees = offres.filter((offre) => {
      const typeLower = offre.type.toLowerCase();
      if (filtreType === "emploi") {
        return typeLower.includes("cdi") || typeLower.includes("cdd");
      } else {
        return typeLower.includes("stage") || typeLower.includes("pfe");
      }
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-800">
            {filtreType === "emploi" ? "Postes CDI/CDD" : "Stages/PFE"}
          </h3>
          <div className="text-sm text-gray-600">
            {offresFiltrees.length} poste(s) trouvé(s)
          </div>
        </div>

        {errorOffres && (
          <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">
            {errorOffres}
          </div>
        )}

        {loadingOffres ? (
          <div className="text-center py-8 text-gray-600">
            Chargement des postes...
          </div>
        ) : offresFiltrees.length === 0 ? (
          <div className="text-center py-8 text-gray-600 bg-white rounded-xl shadow-lg p-8">
            <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              Aucun {filtreType === "emploi" ? "poste CDI/CDD" : "stage/PFE"} vacant
            </h4>
            <p className="text-gray-500">
              {filtreType === "emploi"
                ? "Créez votre première offre d'emploi pour commencer à recevoir des candidatures."
                : "Créez votre première offre de stage/PFE pour commencer à recevoir des candidatures."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offresFiltrees.map((offre) => {
              const stats = getCandidatureStats(offre.id);

              return (
                <div
                  key={offre.id}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {offre.titre}
                      </h4>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          offre.statut === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {offre.statut}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Briefcase className="h-4 w-4 mr-2" />
                        {offre.type}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        {offre.localisation}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">📅</span>
                        Expire le {new Date(offre.dateExpiration).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Candidatures</span>
                        <span className="text-lg font-bold text-blue-600">{stats.total}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
                          En attente: {stats.enAttente}
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                          Acceptées: {stats.acceptees}
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-red-400 rounded-full mr-1"></span>
                          Refusées: {stats.refusees}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedOffre(offre);
                          setViewMode("candidatures");
                        }}
                        disabled={stats.total === 0}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>
                          {stats.total === 0
                            ? "Aucune candidature"
                            : `Voir (${stats.total})`}
                        </span>
                      </button>
                      <button
                        onClick={() => supprimerOffre(offre.id)}
                        className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium"
                        title="Supprimer ce poste"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Composant pour les candidatures d'un poste spécifique
  const CandidaturesForPoste = ({ filtreType = "emploi" }: { filtreType?: "emploi" | "stage" }) => {
    if (!selectedOffre) return null;

    const getCandidaturesPourOffre = () => {
      return candidaturesParPostes.filter((cand) => {
        return cand.offre_id === selectedOffre.id;
      });
    };

    const candidaturesPourOffre = getSortedCandidatures(
      getCandidaturesPourOffre(),
      sortBy,
      sortOrder
    );

    const stats = {
      total: candidaturesPourOffre.length,
      enAttente: candidaturesPourOffre.filter((c) => c.statut === "en_attente").length,
      acceptees: candidaturesPourOffre.filter((c) => c.statut === "acceptee").length,
      refusees: candidaturesPourOffre.filter((c) => c.statut === "refusee").length,
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setViewMode("postes");
                  setSelectedOffre(null);
                }}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Retour aux postes</span>
              </button>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-gray-900">{selectedOffre.titre}</h3>
              <p className="text-gray-600">
                {stats.total} candidature(s) {filtreType === "emploi" ? "CDI/CDD" : "Stage/PFE"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.enAttente}</div>
              <div className="text-sm text-yellow-700">En attente</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.acceptees}</div>
              <div className="text-sm text-green-700">Acceptées</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.refusees}</div>
              <div className="text-sm text-red-700">Refusées</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-700">Total</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4 bg-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "date" | "diplome" | "competence" | "experience")}
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white shadow-sm"
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
            Affichage de {candidaturesPourOffre.length} candidature(s)
          </div>
        </div>

        {candidaturesPourOffre.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">Aucune candidature</h4>
            <p className="text-gray-500 mb-4">Aucune candidature n'a été trouvée pour ce poste.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full table-auto" style={{ tableLayout: 'auto' }}>
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Nom</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Diplôme</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Score Compétences</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Expérience</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Date Soumission</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {candidaturesPourOffre.map((cand) => (
                    <tr key={cand.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-4 py-3 text-gray-900 text-sm whitespace-nowrap">{cand.nom}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">{cand.email}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        <DisplayDiplome diplome={cand.diplome} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        <DisplayCompetenceScore score={cand.competenceScore} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        <DisplayExperience experience={cand.experience} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        {new Date(cand.dateSoumission).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            cand.statut === "en_attente"
                              ? "bg-yellow-100 text-yellow-800"
                              : cand.statut === "acceptee"
                              ? "bg-green-100 text-green-800"
                              : cand.statut === "refusee"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {cand.statut === "en_attente" ? "En attente" : cand.statut === "acceptee" ? "Acceptée" : cand.statut === "refusee" ? "Refusée" : "Ignorée"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <ActionsSelect candidature={cand} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Composant pour les archives
  const ArchivesList = () => {
    return (
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900 text-center">Archives</h2>

        <div className="text-center mb-8">
          <p className="text-gray-600 text-lg">Liste des candidatures que vous avez choisies d'ignorer</p>
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 inline-block">
            <p className="text-yellow-800 text-sm">
              <strong>💡 Information :</strong> Ces candidatures ne sont plus visibles dans les autres onglets.
              Vous pouvez les restaurer ou les supprimer définitivement.
            </p>
          </div>
        </div>

        {errorCandidatures && (
          <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">
            {errorCandidatures}
          </div>
        )}

        {candidaturesIgnorees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <Ban className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">Aucune candidature ignorée</h4>
            <p className="text-gray-500">Les candidatures que vous ignorez apparaîtront ici.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full table-auto" style={{ tableLayout: 'auto' }}>
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Nom</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Diplôme</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Score</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {candidaturesIgnorees.map((cand) => (
                    <tr key={`${cand.id}-${cand.type}`} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-4 py-3 text-gray-900 text-sm whitespace-nowrap">{cand.nom}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">{cand.email}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            cand.type === "emploi"
                              ? "bg-blue-100 text-blue-800"
                              : cand.type === "stage"
                              ? "bg-green-100 text-green-800"
                              : cand.type === "pfe"
                              ? "bg-purple-100 text-purple-800"
                              : cand.type === "stage_spontane"
                              ? "bg-teal-100 text-teal-800"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {cand.type === "spontanee" ? "Spontanée" : cand.type === "emploi" ? "CDI/CDD" : cand.type === "stage" ? "Stage" : cand.type === "pfe" ? "PFE" : cand.type === "stage_spontane" ? "Stage Spontané" : cand.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        <DisplayDiplome diplome={cand.diplome} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        <DisplayCompetenceScore score={cand.competenceScore} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        {new Date(cand.dateSoumission).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Ignorée</span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => restaurerCandidature(cand)}
                            className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all duration-200"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Restaurer</span>
                          </button>
                          <button
                            onClick={() => setSelectedCandidature(cand)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200"
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => supprimerCandidature(cand)}
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

// Modale pour afficher les détails des candidatures spontanées
{selectedCandidature && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fadeIn">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-2xl font-bold text-gray-800">
          Détails de la candidature
        </h3>
        <div className="flex items-center space-x-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedCandidature.statut === "en_attente"
                ? "bg-yellow-100 text-yellow-800"
                : selectedCandidature.statut === "acceptee"
                ? "bg-green-100 text-green-800"
                : selectedCandidature.statut === "refusee"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {selectedCandidature.statut === "en_attente" 
              ? "En attente" 
              : selectedCandidature.statut === "acceptee" 
              ? "Acceptée" 
              : selectedCandidature.statut === "refusee" 
              ? "Refusée" 
              : "Ignorée"
            }
          </span>
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto pr-2 max-h-[60vh]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>👤 Nom :</strong> {selectedCandidature.nom}</p>
            <p><strong>📧 Email :</strong> {selectedCandidature.email}</p>
            {selectedCandidature.telephone && (
              <p><strong>📞 Téléphone :</strong> {selectedCandidature.telephone}</p>
            )}
          </div>
          <div>
            <p><strong>📅 Date de soumission :</strong> {new Date(selectedCandidature.dateSoumission).toLocaleDateString()}</p>
            <p>
              <strong>📋 Type :</strong>
              <span
                className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  selectedCandidature.type === "emploi"
                    ? "bg-blue-100 text-blue-800"
                    : selectedCandidature.type === "stage"
                    ? "bg-green-100 text-green-800"
                    : selectedCandidature.type === "pfe"
                    ? "bg-purple-100 text-purple-800"
                    : selectedCandidature.type === "stage_spontane"
                    ? "bg-teal-100 text-teal-800"
                    : "bg-orange-100 text-orange-800"
                }`}
              >
                {selectedCandidature.type === "spontanee"
                  ? "Spontanée"
                  : selectedCandidature.type === "emploi"
                  ? "CDI/CDD"
                  : selectedCandidature.type === "stage"
                  ? "Stage"
                  : selectedCandidature.type === "pfe"
                  ? "PFE"
                  : selectedCandidature.type === "stage_spontane"
                  ? "Stage Spontané"
                  : selectedCandidature.type}
              </span>
            </p>
          </div>
        </div>

        {selectedCandidature.diplome && (
          <div>
            <strong>🎓 Diplôme :</strong> {selectedCandidature.diplome}
          </div>
        )}

        {selectedCandidature.experience && (
          <div>
            <strong>💼 Expérience :</strong> {selectedCandidature.experience}
          </div>
        )}

        {selectedCandidature.competenceScore && (
          <div>
            <strong>⭐ Score de compétences :</strong> {selectedCandidature.competenceScore}%
          </div>
        )}

        {selectedCandidature.motivation && (
          <div>
            <strong>📝 Motivation :</strong>
            <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
              {selectedCandidature.motivation}
            </p>
          </div>
        )}

        <div className="flex flex-col space-y-2">
          {selectedCandidature.cvUrl && (
            <a
              href={getFileUrl(selectedCandidature.cvUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              <FileText className="h-4 w-4" />
              <span>Télécharger le CV</span>
            </a>
          )}

          {selectedCandidature.lettreMotivationUrl && (
            <a
              href={getFileUrl(selectedCandidature.lettreMotivationUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200"
            >
              <FileText className="h-4 w-4" />
              <span>Télécharger la lettre de motivation</span>
            </a>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
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
      </section>
    );
  };

  // Composant pour les réponses de candidatures
  const ReponsesCandidaturesList = () => {
    return (
      <section className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Réponses Candidatures</h2>
          <p className="text-gray-600 text-lg">Consultation des candidatures déjà traitées (acceptées/refusées)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <Archive className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-900">{statsArchives.total}</h3>
            <p className="text-gray-600">Total traité</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-900">{statsArchives.acceptees}</h3>
            <p className="text-gray-600">Candidatures acceptées</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-900">{statsArchives.refusees}</h3>
            <p className="text-gray-600">Candidatures refusées</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full">
              <div className="flex items-center space-x-4 flex-1">
                <Filter className="h-5 w-5 text-gray-600" />
                <select
                  value={archiveFilter}
                  onChange={(e) => setArchiveFilter(e.target.value as "tous" | "acceptees" | "refusees")}
                  className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white shadow-sm w-full md:w-auto"
                >
                  <option value="tous">Toutes les réponses</option>
                  <option value="acceptees">Candidatures acceptées</option>
                  <option value="refusees">Candidatures refusées</option>
                </select>
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email ou poste..."
                  value={searchArchive}
                  onChange={(e) => setSearchArchive(e.target.value)}
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white shadow-sm"
                />
              </div>
            </div>
            <div className="text-sm text-gray-600 whitespace-nowrap">
              {candidaturesRecherchees.length} candidature(s) trouvée(s)
            </div>
          </div>
        </div>

        {loadingCandidatures ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des réponses...</p>
          </div>
        ) : candidaturesRecherchees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <Archive className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              {searchArchive ? "Aucun résultat trouvé" : "Aucune réponse de candidature"}
            </h4>
            <p className="text-gray-500">
              {searchArchive
                ? "Aucune candidature ne correspond à votre recherche."
                : "Les candidatures acceptées ou refusées apparaîtront ici."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full table-auto" style={{ tableLayout: 'auto' }}>
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Nom</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Diplôme</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Score</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {candidaturesRecherchees.map((cand) => (
                    <tr key={`${cand.id}-${cand.type}`} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-4 py-3 text-gray-900 text-sm whitespace-nowrap">{cand.nom}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">{cand.email}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            cand.type === "emploi"
                              ? "bg-blue-100 text-blue-800"
                              : cand.type === "stage"
                              ? "bg-green-100 text-green-800"
                              : cand.type === "pfe"
                              ? "bg-purple-100 text-purple-800"
                              : cand.type === "stage_spontane"
                              ? "bg-teal-100 text-teal-800"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {cand.type === "spontanee" ? "Spontanée" : cand.type === "emploi" ? "CDI/CDD" : cand.type === "stage" ? "Stage" : cand.type === "pfe" ? "PFE" : cand.type === "stage_spontane" ? "Stage Spontané" : cand.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        <DisplayDiplome diplome={cand.diplome} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        <DisplayCompetenceScore score={cand.competenceScore} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        {new Date(cand.dateSoumission).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            cand.statut === "acceptee"
                              ? "bg-green-100 text-green-800"
                              : cand.statut === "refusee"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {cand.statut === "acceptee" ? "Acceptée" : cand.statut === "refusee" ? "Refusée" : "Ignorée"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedCandidature(cand)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => supprimerCandidature(cand)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                            title="Supprimer cette candidature"
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

// Modale pour afficher les détails des candidatures spontanées
{selectedCandidature && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fadeIn">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-2xl font-bold text-gray-800">
          Détails de la candidature
        </h3>
        <div className="flex items-center space-x-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedCandidature.statut === "en_attente"
                ? "bg-yellow-100 text-yellow-800"
                : selectedCandidature.statut === "acceptee"
                ? "bg-green-100 text-green-800"
                : selectedCandidature.statut === "refusee"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {selectedCandidature.statut === "en_attente" 
              ? "En attente" 
              : selectedCandidature.statut === "acceptee" 
              ? "Acceptée" 
              : selectedCandidature.statut === "refusee" 
              ? "Refusée" 
              : "Ignorée"
            }
          </span>
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto pr-2 max-h-[60vh]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>👤 Nom :</strong> {selectedCandidature.nom}</p>
            <p><strong>📧 Email :</strong> {selectedCandidature.email}</p>
            {selectedCandidature.telephone && (
              <p><strong>📞 Téléphone :</strong> {selectedCandidature.telephone}</p>
            )}
          </div>
          <div>
            <p><strong>📅 Date de soumission :</strong> {new Date(selectedCandidature.dateSoumission).toLocaleDateString()}</p>
            <p>
              <strong>📋 Type :</strong>
              <span
                className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  selectedCandidature.type === "emploi"
                    ? "bg-blue-100 text-blue-800"
                    : selectedCandidature.type === "stage"
                    ? "bg-green-100 text-green-800"
                    : selectedCandidature.type === "pfe"
                    ? "bg-purple-100 text-purple-800"
                    : selectedCandidature.type === "stage_spontane"
                    ? "bg-teal-100 text-teal-800"
                    : "bg-orange-100 text-orange-800"
                }`}
              >
                {selectedCandidature.type === "spontanee"
                  ? "Spontanée"
                  : selectedCandidature.type === "emploi"
                  ? "CDI/CDD"
                  : selectedCandidature.type === "stage"
                  ? "Stage"
                  : selectedCandidature.type === "pfe"
                  ? "PFE"
                  : selectedCandidature.type === "stage_spontane"
                  ? "Stage Spontané"
                  : selectedCandidature.type}
              </span>
            </p>
          </div>
        </div>

        {selectedCandidature.diplome && (
          <div>
            <strong>🎓 Diplôme :</strong> {selectedCandidature.diplome}
          </div>
        )}

        {selectedCandidature.experience && (
          <div>
            <strong>💼 Expérience :</strong> {selectedCandidature.experience}
          </div>
        )}

        {selectedCandidature.competenceScore && (
          <div>
            <strong>⭐ Score de compétences :</strong> {selectedCandidature.competenceScore}%
          </div>
        )}

        {selectedCandidature.motivation && (
          <div>
            <strong>📝 Motivation :</strong>
            <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
              {selectedCandidature.motivation}
            </p>
          </div>
        )}

        <div className="flex flex-col space-y-2">
          {selectedCandidature.cvUrl && (
            <a
              href={getFileUrl(selectedCandidature.cvUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              <FileText className="h-4 w-4" />
              <span>Télécharger le CV</span>
            </a>
          )}

          {selectedCandidature.lettreMotivationUrl && (
            <a
              href={getFileUrl(selectedCandidature.lettreMotivationUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200"
            >
              <FileText className="h-4 w-4" />
              <span>Télécharger la lettre de motivation</span>
            </a>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
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
      </section>
    );
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

  // VUE GESTION DES UTILISATEURS - CORRIGÉE
  const GestionUtilisateursView = () => {
    const handleCloseForm = () => {
      setShowAddUser(false);
      setErrorUsers("");
      setNewUser({ nom: "", email: "", motDePasse: "", role: "gestionnaire" });
    };

    return (
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

          <div className="flex items-center space-x-4">
            {!showAddUser && (
              <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-md transition-all duration-200 font-medium"
              >
                <UserPlus className="h-5 w-5" />
                <span>Ajouter un Utilisateur</span>
              </button>
            )}
          </div>
        </div>

        {/* FORMULAIRE D'AJOUT - VERSION CORRIGÉE ET FONCTIONNELLE */}
        {showAddUser && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 mb-8 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Ajouter un Utilisateur</h3>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-600 transition p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {errorUsers && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {errorUsers}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CHAMP NOM */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={newUser.nom}
                    onChange={(e) => setNewUser(prev => ({ ...prev, nom: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                    placeholder="Entrez le nom complet"
                  />
                </div>

                {/* CHAMP EMAIL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                    placeholder="exemple@email.com"
                  />
                </div>

                {/* CHAMP MOT DE PASSE */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe *
                  </label>
                  <input
                    type="password"
                    value={newUser.motDePasse}
                    onChange={(e) => setNewUser(prev => ({ ...prev, motDePasse: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                    placeholder="Entrez le mot de passe"
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
                </div>

                {/* CHAMP RÔLE */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rôle *
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser(prev => ({
                        ...prev,
                        role: e.target.value as "admin" | "gestionnaire"
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="gestionnaire">Gestionnaire</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleCloseForm}
                className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Annuler
              </button>

              <button
                onClick={handleAddUser}
                disabled={
                  !newUser.nom.trim() ||
                  !newUser.email.trim() ||
                  !newUser.motDePasse ||
                  newUser.motDePasse.length < 6
                }
                className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
              >
                Créer l'utilisateur
              </button>
            </div>
          </div>
        )}

        {/* LISTE DES UTILISATEURS */}
        {errorUsers && !showAddUser && (
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
              {showAddUser 
                ? "Remplissez le formulaire ci-dessus pour créer votre premier utilisateur."
                : "Commencez par créer votre premier utilisateur."
              }
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
                    <tr key={user.id} className="hover:bg-gray-50 transition duration-200">
                      <td className="px-6 py-4 text-gray-900">{user.nom}</td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {user.role === "admin" ? "Administrateur" : "Gestionnaire"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(user.date_creation).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            user.statut === "actif"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.statut === "actif" ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition duration-200"
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
      </motion.div>
    );
  };

  // VUE GESTION DES CANDIDATURES
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
        <button 
          onClick={() => setActiveTab("offres")} 
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 relative ${
            activeTab === "offres" ? "bg-yellow-500 text-white shadow-lg" : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
          }`}
        >
          <Briefcase className="h-5 w-5" />
          <span>Offres d'Emploi</span>
        </button>
        <button 
          onClick={() => setActiveTab("candidatures")} 
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 relative ${
            activeTab === "candidatures" ? "bg-yellow-500 text-white shadow-lg" : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
          }`}
        >
          <Users className="h-5 w-5" />
          <span>Candidatures Spontanées - Stage/PFE</span>
          {notificationCounts.candidatures > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {notificationCounts.candidatures}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab("candidatures-postes")} 
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 relative ${
            activeTab === "candidatures-postes" ? "bg-yellow-500 text-white shadow-lg" : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
          }`}
        >
          <Briefcase className="h-5 w-5" />
          <span>Candidatures par Postes</span>
          {notificationCounts.candidaturesPostes > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {notificationCounts.candidaturesPostes}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab("archives")} 
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "archives" ? "bg-yellow-500 text-white shadow-lg" : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
          }`}
        >
          <Archive className="h-5 w-5" />
          <span>Archives</span>
        </button>
        <button 
          onClick={() => setActiveTab("reponses-candidatures")} 
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "reponses-candidatures" ? "bg-gray-500 text-white shadow-lg" : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
          }`}
        >
          <Ban className="h-5 w-5" />
          <span>Réponses Candidatures</span>
        </button>
      </div>

      {/* Statistiques pour les onglets de candidatures */}
      {(activeTab === "candidatures" || activeTab === "candidatures-postes") && <StatsOverview />}

      {/* Contenu selon l'onglet actif */}
      {activeTab === "offres" && (
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center">Gestion des Offres d'Emploi</h2>

          {errorOffres && (
            <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">
              {errorOffres}
            </div>
          )}
          {loadingOffres && (
            <div className="text-center py-8 text-gray-600">
              Chargement des offres...
            </div>
          )}

          {/* Formulaire d'offres */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-xl font-semibold mb-6 text-gray-800">
              {editingOffre ? "Modifier l'Offre" : "Ajouter une Nouvelle Offre"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* TITRE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Développeur Full Stack"
                  value={editingOffre ? editingOffre.titre : nouvelleOffre.titre}
                  onChange={(e) =>
                    editingOffre
                      ? setEditingOffre(prev => prev ? {...prev, titre: e.target.value} : null)
                      : setNouvelleOffre(prev => ({...prev, titre: e.target.value}))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* TYPE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingOffre ? editingOffre.type : nouvelleOffre.type}
                  onChange={(e) =>
                    editingOffre
                      ? setEditingOffre(prev => prev ? {...prev, type: e.target.value as OffreEmploi["type"]} : null)
                      : setNouvelleOffre(prev => ({...prev, type: e.target.value as OffreEmploi["type"]}))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="CDI">CDI</option>
                  <option value="CDD 12 mois">CDD 12 mois</option>
                  <option value="Stage">Stage</option>
                  <option value="PFE">PFE</option>
                </select>
              </div>

              {/* LOCALISATION */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Localisation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Casablanca, Maroc"
                  value={editingOffre ? editingOffre.localisation : nouvelleOffre.localisation}
                  onChange={(e) =>
                    editingOffre
                      ? setEditingOffre(prev => prev ? {...prev, localisation: e.target.value} : null)
                      : setNouvelleOffre(prev => ({...prev, localisation: e.target.value}))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* SALAIRE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salaire (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 5000 MAD"
                  value={editingOffre ? editingOffre.salaire || "" : nouvelleOffre.salaire}
                  onChange={(e) =>
                    editingOffre
                      ? setEditingOffre(prev => prev ? {...prev, salaire: e.target.value} : null)
                      : setNouvelleOffre(prev => ({...prev, salaire: e.target.value}))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* DATE EXPIRATION */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'Expiration <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={editingOffre ? editingOffre.dateExpiration : nouvelleOffre.dateExpiration}
                  onChange={(e) =>
                    editingOffre
                      ? setEditingOffre(prev => prev ? {...prev, dateExpiration: e.target.value} : null)
                      : setNouvelleOffre(prev => ({...prev, dateExpiration: e.target.value}))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* DESCRIPTION */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Description détaillée de l'offre..."
                  value={editingOffre ? editingOffre.description : nouvelleOffre.description}
                  onChange={(e) =>
                    editingOffre
                      ? setEditingOffre(prev => prev ? {...prev, description: e.target.value} : null)
                      : setNouvelleOffre(prev => ({...prev, description: e.target.value}))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  rows={4}
                />
              </div>

              {/* EXIGENCES */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exigences du poste
                </label>

                {editingOffre ? (
                  <div className="space-y-3">
                    {editingExigences.map((exigence, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder={`Exigence ${index + 1} (ex: Diplôme en génie informatique, 3+ ans d'expérience...)`}
                          value={exigence}
                          onChange={(e) => {
                            const newExigences = [...editingExigences];
                            newExigences[index] = e.target.value;
                            setEditingExigences(newExigences);
                          }}
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                        />
                        {editingExigences.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newExigences = editingExigences.filter((_, i) => i !== index);
                              setEditingExigences(newExigences);
                            }}
                            className="p-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Supprimer cette exigence"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setEditingExigences(prev => [...prev, ""])}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Ajouter une exigence</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exigencesFields.map((exigence, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder={`Exigence ${index + 1} (ex: Diplôme en génie informatique, 3+ ans d'expérience...)`}
                          value={exigence}
                          onChange={(e) => {
                            const newExigences = [...exigencesFields];
                            newExigences[index] = e.target.value;
                            setExigencesFields(newExigences);
                          }}
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                        />
                        {exigencesFields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newExigences = exigencesFields.filter((_, i) => i !== index);
                              setExigencesFields(newExigences);
                            }}
                            className="p-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Supprimer cette exigence"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setExigencesFields(prev => [...prev, ""])}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Ajouter une exigence</span>
                    </button>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  Chaque exigence sera stockée individuellement et pourra être utilisée pour le matching avec les candidats.
                </p>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={editingOffre ? () => modifierOffre(editingOffre) : ajouterOffre}
                disabled={
                  editingOffre
                    ? !editingOffre.titre.trim() || !editingOffre.description.trim() || !editingOffre.dateExpiration || !editingOffre.localisation.trim()
                    : !nouvelleOffre.titre.trim() || !nouvelleOffre.description.trim() || !nouvelleOffre.dateExpiration || !nouvelleOffre.localisation.trim()
                }
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 shadow-md transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-5 w-5" />
                <span>{editingOffre ? "Modifier" : "Ajouter"}</span>
              </button>
              
              {editingOffre && (
                <button
                  onClick={() => {
                    setEditingOffre(null);
                    setEditingExigences([""]);
                  }}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-md transition-all duration-200 font-medium"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>

          {/* Liste des offres */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full table-auto" style={{ tableLayout: 'auto' }}>
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Titre</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Localisation</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Salaire</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Expiration</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {offres.map((offre) => (
                    <tr key={offre.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-4 py-3 font-medium text-gray-900 text-sm whitespace-nowrap">{offre.titre}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">{offre.type}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">{offre.localisation}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">{offre.salaire || "N/A"}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        {new Date(offre.dateExpiration).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            offre.statut === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {offre.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditClick(offre)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => supprimerOffre(offre.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
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
        </section>
      )}

      {activeTab === "candidatures" && (
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center">Gestion des Candidatures Spontanées & Stage/PFE</h2>

          <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as "tous" | "stage_spontane" | "spontanee")}
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white shadow-sm"
            >
              <option value="tous">Toutes les candidatures spontanées</option>
              <option value="stage_spontane">Stages/PFE Spontanés</option>
              <option value="spontanee">Candidatures spontanées générales</option>
            </select>

            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "diplome" | "competence" | "experience")}
                className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white shadow-sm"
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
          </div>

          {errorCandidatures && (
            <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">
              {errorCandidatures}
            </div>
          )}
          {loadingCandidatures && (
            <div className="text-center py-8 text-gray-600">
              Chargement des candidatures spontanées...
            </div>
          )}

          {/* Affichage des candidatures par type */}
          {["stage_spontane", "spontanee"].map((type) => {
            if (filterType !== "tous" && filterType !== type) return null;

            const candidaturesByType = candidatures.filter((c) => 
              c.type === type && !c.ignored
            );

            const sortedCandidatures = getSortedCandidatures(
              candidaturesByType,
              sortBy,
              sortOrder
            );

            return (
              <div key={type} className="bg-white rounded-xl shadow-lg overflow-hidden mb-6 w-full">
                <h3 className="text-lg font-semibold text-gray-700 bg-gray-100 px-6 py-3 capitalize">
                  {type === "stage_spontane" ? "Candidatures Spontanées Stage/PFE" : "Candidatures Spontanées Générales"}{" "}
                  <span className="ml-2 bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full">
                    {sortedCandidatures.length}
                  </span>
                </h3>

                {sortedCandidatures.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Book className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-700 mb-2">
                      Aucune candidature{" "}
                      {type === "stage_spontane" ? "spontanée de stage/PFE" : "spontanée générale"}
                    </h4>
                    <p className="text-gray-500">
                      {type === "stage_spontane"
                        ? "Aucune candidature spontanée de stage ou PFE n'a été reçue pour le moment."
                        : "Aucune candidature spontanée générale n'a été reçue pour le moment."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-full table-auto" style={{ tableLayout: 'auto' }}>
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Type</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Nom</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Email</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Diplôme</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Score Compétences</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Expérience</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Date Soumission</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Statut</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200">
                        {sortedCandidatures.map((cand) => (
                          <tr key={`${cand.id}-${cand.type}`} className="hover:bg-gray-50 transition-colors duration-200">
                            <td className="px-4 py-3 font-medium text-gray-900 text-sm whitespace-nowrap capitalize flex items-center space-x-2">
                              {cand.type === "stage_spontane" && <Book className="h-4 w-4" />}
                              {cand.type === "spontanee" && <Mail className="h-4 w-4" />}
                              <span>
                                {cand.type === "stage_spontane" ? "Stage/PFE" : cand.type === "spontanee" ? "Candidature Générale" : cand.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-900 text-sm whitespace-nowrap">
                              {cand.prenom ? `${cand.prenom} ${cand.nom}` : cand.nom}
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">{cand.email}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                              <DisplayDiplome diplome={cand.diplome} />
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                              <DisplayCompetenceScore score={cand.competenceScore} />
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                              <DisplayExperience experience={cand.experience} />
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                              {new Date(cand.dateSoumission).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  cand.statut === "en_attente"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : cand.statut === "acceptee"
                                    ? "bg-green-100 text-green-800"
                                    : cand.statut === "refusee"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {cand.statut === "en_attente" ? "En attente" : cand.statut === "acceptee" ? "Acceptée" : cand.statut === "refusee" ? "Refusée" : "Ignorée"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <ActionsSelect candidature={cand} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {activeTab === "candidatures-postes" && (
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center">Gestion des Candidatures par Postes</h2>

          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-full p-2 shadow-lg border border-gray-200">
              <button
                onClick={() => {
                  setOngletCandidatures("emploi");
                  setViewMode("postes");
                  setSelectedOffre(null);
                }}
                className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                  ongletCandidatures === "emploi" ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                CDI / CDD
              </button>
              <button
                onClick={() => {
                  setOngletCandidatures("stage");
                  setViewMode("postes");
                  setSelectedOffre(null);
                }}
                className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                  ongletCandidatures === "stage" ? "bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Stages / PFE
              </button>
            </div>
          </div>

          {viewMode === "postes" && <PostesList filtreType={ongletCandidatures} />}
          {viewMode === "candidatures" && selectedOffre && <CandidaturesForPoste filtreType={ongletCandidatures} />}

// Modale pour afficher les détails des candidatures spontanées
{selectedCandidature && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fadeIn">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-2xl font-bold text-gray-800">
          Détails de la candidature
        </h3>
        <div className="flex items-center space-x-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedCandidature.statut === "en_attente"
                ? "bg-yellow-100 text-yellow-800"
                : selectedCandidature.statut === "acceptee"
                ? "bg-green-100 text-green-800"
                : selectedCandidature.statut === "refusee"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {selectedCandidature.statut === "en_attente" 
              ? "En attente" 
              : selectedCandidature.statut === "acceptee" 
              ? "Acceptée" 
              : selectedCandidature.statut === "refusee" 
              ? "Refusée" 
              : "Ignorée"
            }
          </span>
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto pr-2 max-h-[60vh]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>👤 Nom :</strong> {selectedCandidature.nom}</p>
            <p><strong>📧 Email :</strong> {selectedCandidature.email}</p>
            {selectedCandidature.telephone && (
              <p><strong>📞 Téléphone :</strong> {selectedCandidature.telephone}</p>
            )}
          </div>
          <div>
            <p><strong>📅 Date de soumission :</strong> {new Date(selectedCandidature.dateSoumission).toLocaleDateString()}</p>
            <p>
              <strong>📋 Type :</strong>
              <span
                className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  selectedCandidature.type === "emploi"
                    ? "bg-blue-100 text-blue-800"
                    : selectedCandidature.type === "stage"
                    ? "bg-green-100 text-green-800"
                    : selectedCandidature.type === "pfe"
                    ? "bg-purple-100 text-purple-800"
                    : selectedCandidature.type === "stage_spontane"
                    ? "bg-teal-100 text-teal-800"
                    : "bg-orange-100 text-orange-800"
                }`}
              >
                {selectedCandidature.type === "spontanee"
                  ? "Spontanée"
                  : selectedCandidature.type === "emploi"
                  ? "CDI/CDD"
                  : selectedCandidature.type === "stage"
                  ? "Stage"
                  : selectedCandidature.type === "pfe"
                  ? "PFE"
                  : selectedCandidature.type === "stage_spontane"
                  ? "Stage Spontané"
                  : selectedCandidature.type}
              </span>
            </p>
          </div>
        </div>

        {selectedCandidature.diplome && (
          <div>
            <strong>🎓 Diplôme :</strong> {selectedCandidature.diplome}
          </div>
        )}

        {selectedCandidature.experience && (
          <div>
            <strong>💼 Expérience :</strong> {selectedCandidature.experience}
          </div>
        )}

        {selectedCandidature.competenceScore && (
          <div>
            <strong>⭐ Score de compétences :</strong> {selectedCandidature.competenceScore}%
          </div>
        )}

        {selectedCandidature.motivation && (
          <div>
            <strong>📝 Motivation :</strong>
            <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
              {selectedCandidature.motivation}
            </p>
          </div>
        )}

        <div className="flex flex-col space-y-2">
          {selectedCandidature.cvUrl && (
            <a
              href={getFileUrl(selectedCandidature.cvUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              <FileText className="h-4 w-4" />
              <span>Télécharger le CV</span>
            </a>
          )}

          {selectedCandidature.lettreMotivationUrl && (
            <a
              href={getFileUrl(selectedCandidature.lettreMotivationUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200"
            >
              <FileText className="h-4 w-4" />
              <span>Télécharger la lettre de motivation</span>
            </a>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
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
        </section>
      )}

      {activeTab === "archives" && <ArchivesList />}
      {activeTab === "reponses-candidatures" && <ReponsesCandidaturesList />}
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
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">Changer le mot de passe</h3>
              <button 
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordError("");
                  setPasswordSuccess("");
                  setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                  {passwordSuccess}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe actuel *
                </label>
                <input 
                  type="password" 
                  value={passwordData.currentPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200"
                  placeholder="Entrez votre mot de passe actuel" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe *
                </label>
                <input 
                  type="password" 
                  value={passwordData.newPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200"
                  placeholder="Entrez le nouveau mot de passe" 
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le nouveau mot de passe *
                </label>
                <input 
                  type="password" 
                  value={passwordData.confirmPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200"
                  placeholder="Confirmez le nouveau mot de passe" 
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordError("");
                  setPasswordSuccess("");
                  setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }} 
                className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium"
              >
                Annuler
              </button>
              <button 
                onClick={handleChangePassword} 
                disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? "Changement..." : "Changer le mot de passe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAdmin;