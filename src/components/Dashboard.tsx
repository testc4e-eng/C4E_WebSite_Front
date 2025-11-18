// ============================================================
// Fichier : /components/Dashboard.tsx
// Description : Composant principal du Dashboard de gestion RH/Offres.
// Rôle :
// - Affiche les statistiques globales des candidatures et offres.
// - Gère les onglets : Offres, Candidatures spontanées, Candidatures par postes, Archives.
// - Permet l'ajout, la modification et la suppression des offres d'emploi.
// - Permet la consultation, le tri et la gestion du statut des candidatures.
// - Supporte plusieurs types de candidatures : emploi, stage, PFE, spontanee, stage_spontane.
// - Intègre la recherche, le filtrage et le tri des candidatures et des archives.
// - Gère dynamiquement les champs d'exigences pour les offres.
// - Utilise React, TypeScript, fetch API pour interagir avec le backend et Lucide/Framer Motion pour les icônes et animations.
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
} from "lucide-react";
import api from "../lib/api";

// === Ajout pour API dynamique ===
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://c4e-website-back.onrender.com";
const getApiUrl = (path: string) =>
  `${API_BASE_URL}${path.startsWith("/") ? path : "/" + path}`;

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

interface ApiOffre {
  id: number;
  titre: string;
  description: string;
  salaire: string | null;
  date_expiration: string;
  statut: "active" | "inactive";
  type: "CDI" | "CDD 12 mois" | "Stage" | "PFE";
  localisation: string;
  exigences: string[];
}

// CORRECTION : Ajout du type 'stage_spontane'
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

  // Si déjà une URL complète (cas Render ou lien absolu)
  if (filePath.startsWith("http")) return filePath;

  // Construction correcte de l'URL finale
  return `${API_BASE_URL}${
    filePath.startsWith("/") ? filePath : "/" + filePath
  }`;
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

const Dashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

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
  // CORRECTION : Ajout du type 'stage_spontane'
  const [filterType, setFilterType] = useState<
    "tous" | "stage_spontane" | "spontanee"
  >("tous");
  const [selectedCandidature, setSelectedCandidature] =
    useState<Candidature | null>(null);
  const [sortBy, setSortBy] = useState<
    "date" | "diplome" | "competence" | "experience"
  >("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // NOUVEAUX STATES pour la gestion par postes
  const [viewMode, setViewMode] = useState<"postes" | "candidatures">("postes");
  const [selectedOffre, setSelectedOffre] = useState<OffreEmploi | null>(null);
  const [ongletCandidatures, setOngletCandidatures] = useState<
    "emploi" | "stage"
  >("emploi");

  // États pour gérer les exigences dynamiques
  const [exigencesFields, setExigencesFields] = useState<string[]>([""]);
  const [editingExigences, setEditingExigences] = useState<string[]>([""]);

  // États pour les archives
  const [archiveFilter, setArchiveFilter] = useState<
    "tous" | "acceptees" | "refusees"
  >("tous");
  const [searchArchive, setSearchArchive] = useState("");

  // État pour la modale de changement de mot de passe
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

  useEffect(() => {
 const fetchOffres = async () => {
  try {
    setLoadingOffres(true);
    setErrorOffres("");

    const { res, data } = await api.get<Offre[]>("/api/offres", token);

    if (!res.ok) throw new Error("Erreur lors du chargement des offres.");

    setOffres(
      data.map((o) => ({
        id: o.id,
        titre: o.titre,
        description: o.description,
        salaire: o.salaire,
        dateExpiration: o.date_expiration,
        statut: o.statut,
        type: o.type,
        localisation: o.localisation,
        exigences: o.exigences || [],
      }))
    );
  } catch (err: unknown) {
    console.error("Catch error:", err);
    const message =
      err instanceof Error ? err.message : "Erreur connexion backend.";
    setErrorOffres(message);
  } finally {
    setLoadingOffres(false);
  }
};
    if (activeTab === "offres" || activeTab === "candidatures-postes")
      fetchOffres();
  }, [activeTab, token]);

  // REMPLACEZ le useEffect existant par celui-ci :
  // REMPLACEZ le useEffect existant par celui-ci :
useEffect(() => {
  const fetchCandidatures = async () => {
    try {
      setLoadingCandidatures(true);
      setErrorCandidatures("");

      if (activeTab === "candidatures") {
        const { res, data } = await api.get<Candidature[]>("/api/candidatures/spontanees/toutes", token);

        if (!res.ok)
          throw new Error("Erreur lors du chargement des candidatures spontanées.");

        console.log("Données spontanées :", data);
        setCandidatures(data);
      } else if (activeTab === "candidatures-postes") {
        const { res, data } = await api.get<Candidature[]>("/api/candidatures", token);

        if (!res.ok)
          throw new Error("Erreur lors du chargement des candidatures par offres.");

        const candidaturesSurOffres = data.filter(
          (c) => c.type === "emploi" || c.type === "stage" || c.type === "pfe"
        );

        setCandidatures(candidaturesSurOffres);
      } else if (activeTab === "archives") {
        const { res, data } = await api.get<Candidature[]>("/api/candidatures", token);

        if (!res.ok)
          throw new Error("Erreur lors du chargement des archives.");

        setCandidatures(data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur connexion backend.";
      console.error("Erreur fetch:", err);
      setErrorCandidatures(message);
    } finally {
      setLoadingCandidatures(false);
    }
  };

  if (["candidatures", "candidatures-postes", "archives"].includes(activeTab)) {
    fetchCandidatures();
  }
}, [activeTab, token]);

  // Fonctions pour gérer les exigences dynamiques
  const ajouterChampExigence = () => {
    setExigencesFields([...exigencesFields, ""]);
  };

  const supprimerChampExigence = (index: number) => {
    if (exigencesFields.length > 1) {
      const nouvellesExigences = exigencesFields.filter((_, i) => i !== index);
      setExigencesFields(nouvellesExigences);
    }
  };

  const mettreAJourChampExigence = (index: number, valeur: string) => {
    const nouvellesExigences = [...exigencesFields];
    nouvellesExigences[index] = valeur;
    setExigencesFields(nouvellesExigences);
  };

  const ajouterChampExigenceEdit = () => {
    setEditingExigences([...editingExigences, ""]);
  };

  const supprimerChampExigenceEdit = (index: number) => {
    if (editingExigences.length > 1) {
      const nouvellesExigences = editingExigences.filter((_, i) => i !== index);
      setEditingExigences(nouvellesExigences);
    }
  };

  const mettreAJourChampExigenceEdit = (index: number, valeur: string) => {
    const nouvellesExigences = [...editingExigences];
    nouvellesExigences[index] = valeur;
    setEditingExigences(nouvellesExigences);
  };

  const handleEditClick = (offre: OffreEmploi) => {
    setEditingOffre(offre);
    setEditingExigences(
      offre.exigences.length > 0 ? [...offre.exigences] : [""]
    );
  };

  const ajouterOffre = async () => {
    if (
      !nouvelleOffre.titre ||
      !nouvelleOffre.description ||
      !nouvelleOffre.dateExpiration ||
      !nouvelleOffre.localisation
    ) {
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
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Erreur ajout offre.");
      }
      const newOffreData = await res.json();
      const newOffre: OffreEmploi = {
        id: newOffreData.offre.id,
        titre: newOffreData.offre.titre,
        description: newOffreData.offre.description,
        salaire: newOffreData.offre.salaire,
        dateExpiration: newOffreData.offre.date_expiration,
        statut: "active",
        type: newOffreData.offre.type,
        localisation: newOffreData.offre.localisation,
        exigences: newOffreData.offre.exigences,
      };
      setOffres((prev) => [...prev, newOffre]);
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
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur connexion backend.";
      setErrorOffres(message);
    }
  };

  const modifierOffre = async (offre: OffreEmploi) => {
    if (
      !offre.titre ||
      !offre.description ||
      !offre.dateExpiration ||
      !offre.localisation
    ) {
      setErrorOffres("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    try {
      const exigencesArray = editingExigences.filter(
        (req) => req.trim() !== ""
      );
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

      const updatedOffre = {
        ...offre,
        exigences: exigencesArray,
      };

      setOffres((prev) =>
        prev.map((o) => (o.id === offre.id ? updatedOffre : o))
      );
      setEditingOffre(null);
      setEditingExigences([""]);
      setErrorOffres("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur connexion backend.";
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
      const message =
        err instanceof Error ? err.message : "Erreur connexion backend.";
      setErrorOffres(message);
    }
  };

  // CORRECTION : Fonction pour supprimer une candidature avec gestion du type 'stage_spontane'
  // Solution alternative - utiliser la route principale
  const supprimerCandidature = async (candidature: Candidature) => {
    if (
      !window.confirm(
        `Confirmer la suppression de la candidature de ${candidature.nom} ?`
      )
    )
      return;
    try {
      const { id, type } = candidature;

      // CORRECTION : Utiliser la route principale avec paramètres

      const url = getApiUrl(`/api/candidatures/${type}/${id}`);
      console.log("🔗 URL de suppression:", url);

      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Erreur ${res.status}`);

      setCandidatures((prev) =>
        prev.filter((c) => !(c.id === id && c.type === type))
      );

      if (
        selectedCandidature?.id === id &&
        selectedCandidature?.type === type
      ) {
        setSelectedCandidature(null);
      }

      console.log("✅ Supprimé avec succès");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("❌ Erreur:", err);
      setErrorCandidatures(`Échec: ${message}`);
    }
  };

  const changerStatut = async (
    candidature: Candidature,
    statut: Candidature["statut"]
  ) => {
    try {
      const { id, type } = candidature;

      console.log("🚀 Mise à jour statut:", { id, type, nouveau: statut });

      setCandidatures((prev) =>
        prev.map((c) => (c.id === id && c.type === type ? { ...c, statut } : c))
      );

      // Mapping pour l'API
      let typeAPI = type;
      if (type === "stage_spontane") {
        typeAPI = "stage"; // Table candidatures_stage
      }

      const res = await fetch(
        getApiUrl(`/api/candidatures/statut/${typeAPI}/${id}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ statut }),
        }
      );

      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }

      const result = await res.json();
      console.log("✅ Statut mis à jour avec succès:", result);
    } catch (err: unknown) {
      console.error("❌ Erreur:", err);

      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setErrorCandidatures(`Échec: ${message}`);

      const fetchCandidatures = async () => {
        try {
          const res = await fetch(getApiUrl("/api/candidatures"), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data: Candidature[] = await res.json();
            const normalizedData = data.map((cand) => ({
              ...cand,
              offreId: cand.offreId || cand.offre_id,
            }));
            setCandidatures(normalizedData);
          }
        } catch (err) {
          console.error("Erreur rechargement:", err);
        }
      };
      fetchCandidatures();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Fonction pour changer le mot de passe
// Fonction pour changer le mot de passe - VERSION CORRIGÉE
const handleChangePassword = async () => {
  setPasswordError("");
  setPasswordSuccess("");

  try {
    console.log("🔍 DEBUG - Données avant envoi:", {
      currentPassword: passwordData.currentPassword ? "PRÉSENT" : "MANQUANT",
      newPassword: passwordData.newPassword ? "PRÉSENT" : "MANQUANT",
      confirmPassword: passwordData.confirmPassword ? "PRÉSENT" : "MANQUANT",
      tokenLength: token ? token.length : "MANQUANT"
    });

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
    console.log("📥 Réponse complète:", { status: response.status, data });

    if (!response.ok) {
      throw new Error(data.message || `Erreur HTTP ${response.status}`);
    }

    // Succès
    setPasswordSuccess(data.message || "Mot de passe changé avec succès !");
    
    // Réinitialiser le formulaire
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

  } catch (error) {
    console.error("❌ Erreur détaillée:", error);
    setPasswordError(error.message || "Une erreur inconnue est survenue");
  }
};

  // Fonctions pour les archives
  const candidaturesArchivees = candidatures.filter(
    (c) => c.statut === "acceptee" || c.statut === "refusee"
  );

  const candidaturesFiltreesArchive =
    archiveFilter === "tous"
      ? candidaturesArchivees
      : candidaturesArchivees.filter((c) =>
          archiveFilter === "acceptees"
            ? c.statut === "acceptee"
            : c.statut === "refusee"
        );

  const candidaturesRecherchees = candidaturesFiltreesArchive.filter(
    (c) =>
      c.nom.toLowerCase().includes(searchArchive.toLowerCase()) ||
      c.email.toLowerCase().includes(searchArchive.toLowerCase()) ||
      (c.poste && c.poste.toLowerCase().includes(searchArchive.toLowerCase()))
  );

  const statsArchives = {
    total: candidaturesArchivees.length,
    acceptees: candidaturesArchivees.filter((c) => c.statut === "acceptee")
      .length,
    refusees: candidaturesArchivees.filter((c) => c.statut === "refusee")
      .length,
  };

  // Composants d'affichage
  const DisplayDiplome = ({ diplome }: { diplome?: string }) => {
    if (!diplome) {
      return <span className="text-gray-400 italic">Non renseigné</span>;
    }
    return (
      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
        {diplome}
      </span>
    );
  };

  const DisplayCompetenceScore = ({ score }: { score?: number }) => {
    if (!score) {
      return <span className="text-gray-400 italic">N/A</span>;
    }
    return (
      <div className="flex items-center space-x-2">
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full"
            style={{ width: `${Math.min(score, 100)}%` }}
          ></div>
        </div>
        <span className="text-sm font-medium">{score}%</span>
      </div>
    );
  };

  const DisplayExperience = ({ experience }: { experience?: string }) => {
    if (!experience || experience === "0") {
      return (
        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
          0
        </span>
      );
    }
    return (
      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
        {experience}
      </span>
    );
  };

  // Composant pour les statistiques globales
  const StatsOverview = () => {
    const stats = {
      total: candidatures.length,
      enAttente: candidatures.filter((c) => c.statut === "en_attente").length,
      acceptees: candidatures.filter((c) => c.statut === "acceptee").length,
      refusees: candidatures.filter((c) => c.statut === "refusee").length,
      offresActives: offres.filter((o) => o.statut === "active").length,
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Candidatures */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Total
              </p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {stats.total}
              </p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-xs text-gray-500">Candidatures</p>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors duration-300">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* En Attente */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-amber-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                En Attente
              </p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {stats.enAttente}
              </p>
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

        {/* Acceptées */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-emerald-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Acceptées
              </p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {stats.acceptees}
              </p>
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

        {/* Refusées */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-rose-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Refusées
              </p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {stats.refusees}
              </p>
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
      </div>
    );
  };

  // Composant PostesList
  const PostesList = ({
    filtreType = "emploi",
  }: {
    filtreType?: "emploi" | "stage";
  }) => {
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
              Aucun {filtreType === "emploi" ? "poste CDI/CDD" : "stage/PFE"}{" "}
              vacant
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
                        Expire le{" "}
                        {new Date(offre.dateExpiration).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Candidatures
                        </span>
                        <span className="text-lg font-bold text-blue-600">
                          {stats.total}
                        </span>
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

  // Composant CandidaturesForPoste
  const CandidaturesForPoste = ({
    filtreType = "emploi",
  }: {
    filtreType?: "emploi" | "stage";
  }) => {
    if (!selectedOffre) return null;

    const getCandidaturesPourOffre = () => {
      console.log("🔍 DEBUG - Offre sélectionnée:", {
        id: selectedOffre.id,
        titre: selectedOffre.titre,
        type: selectedOffre.type,
      });

      // Filtrer d'abord par type
      const candidaturesFiltreesParType = candidatures.filter((cand) => {
        if (filtreType === "emploi") {
          return cand.type === "emploi";
        } else {
          // Pour Stage/PFE, inclure les deux types
          return cand.type === "stage" || cand.type === "pfe";
        }
      });

      console.log(
        `🔍 DEBUG - Candidatures après filtrage type (${filtreType}):`,
        candidaturesFiltreesParType.length
      );

      // CORRECTION : Utiliser offre_id au lieu de offreId
      const candidaturesPourOffre = candidaturesFiltreesParType.filter(
        (cand) => {
          // MATCHING DIRECT par offre_id
          if (cand.offre_id === selectedOffre.id) {
            console.log(
              `✅ Match direct: ${cand.nom} (offre_id: ${cand.offre_id})`
            );
            return true;
          }

          console.log(
            `❌ Non match: ${cand.nom} | offre_id:${cand.offre_id} vs selected:${selectedOffre.id} | type:${cand.type} vs selected:${selectedOffre.type}`
          );
          return false;
        }
      );

      console.log(
        "🔍 DEBUG - Candidatures finales pour offre:",
        candidaturesPourOffre
      );
      return candidaturesPourOffre;
    };

    const candidaturesPourOffre = getSortedCandidatures(
      getCandidaturesPourOffre(),
      sortBy,
      sortOrder
    );

    const stats = {
      total: candidaturesPourOffre.length,
      enAttente: candidaturesPourOffre.filter((c) => c.statut === "en_attente")
        .length,
      acceptees: candidaturesPourOffre.filter((c) => c.statut === "acceptee")
        .length,
      refusees: candidaturesPourOffre.filter((c) => c.statut === "refusee")
        .length,
    };

    return (
      <div className="space-y-6">
        {/* Header avec stats */}
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
              <h3 className="text-2xl font-bold text-gray-900">
                {selectedOffre.titre}
              </h3>
              <p className="text-gray-600">
                {stats.total} candidature(s){" "}
                {filtreType === "emploi" ? "CDI/CDD" : "Stage/PFE"}
              </p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.enAttente}
              </div>
              <div className="text-sm text-yellow-700">En attente</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.acceptees}
              </div>
              <div className="text-sm text-green-700">Acceptées</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {stats.refusees}
              </div>
              <div className="text-sm text-red-700">Refusées</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.total}
              </div>
              <div className="text-sm text-blue-700">Total</div>
            </div>
          </div>
        </div>

        {/* Filtres et tri */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4 bg-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as
                    | "date"
                    | "diplome"
                    | "competence"
                    | "experience"
                )
              }
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

        {/* Tableau des candidatures */}
        {candidaturesPourOffre.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              Aucune candidature
            </h4>
            <p className="text-gray-500 mb-4">
              Aucune candidature n'a été trouvée pour ce poste.
            </p>
            <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
              <p>💡 Debug info:</p>
              <p>Offre ID: {selectedOffre.id}</p>
              <p>Titre: "{selectedOffre.titre}"</p>
              <p>Type: {selectedOffre.type}</p>
              <p>Filtre appliqué: {filtreType}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Nom
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Diplôme
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Score Compétences
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Expérience
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Date Soumission
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {candidaturesPourOffre.map((cand) => (
                    <tr
                      key={cand.id}
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 text-gray-900">{cand.nom}</td>
                      <td className="px-6 py-4 text-gray-600">{cand.email}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <DisplayDiplome diplome={cand.diplome} />
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <DisplayCompetenceScore score={cand.competenceScore} />
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <DisplayExperience experience={cand.experience} />
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(cand.dateSoumission).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            cand.statut === "en_attente"
                              ? "bg-yellow-100 text-yellow-800"
                              : cand.statut === "acceptee"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {cand.statut}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-2">
                        <select
                          value={cand.statut}
                          onChange={(e) =>
                            changerStatut(
                              cand,
                              e.target.value as Candidature["statut"]
                            )
                          }
                          className="p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        >
                          <option value="en_attente">En attente</option>
                          <option value="acceptee">Acceptée</option>
                          <option value="refusee">Refusée</option>
                        </select>
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

  // Fonctions utilitaires pour les statistiques
  const getCandidatureStats = (offreId: number) => {
    const candidaturesOffre = candidatures.filter((c) => {
      // Vérifier offre_id au lieu de offreId
      return c.offre_id === offreId;
    });

    console.log(`📊 Stats pour offre ${offreId}:`, {
      total: candidaturesOffre.length,
      candidatures: candidaturesOffre.map((c) => ({
        id: c.id,
        type: c.type,
        offre_id: c.offre_id,
        nom: c.nom,
      })),
    });

    return {
      total: candidaturesOffre.length,
      enAttente: candidaturesOffre.filter((c) => c.statut === "en_attente")
        .length,
      acceptees: candidaturesOffre.filter((c) => c.statut === "acceptee")
        .length,
      refusees: candidaturesOffre.filter((c) => c.statut === "refusee").length,
    };
  };

  const getCandidaturesForOffre = (offreId: number) => {
    return getSortedCandidatures(
      candidatures.filter((c) => {
        if (c.offreId === offreId) return true;

        // Fallback: matching par titre pour stages/PFE sans offreId
        if ((c.type === "stage" || c.type === "pfe") && selectedOffre) {
          const posteCandidat = c.poste?.toLowerCase();
          const titreOffre = selectedOffre.titre.toLowerCase();
          return (
            posteCandidat?.includes(titreOffre) ||
            titreOffre.includes(posteCandidat || "")
          );
        }

        return false;
      }),
      sortBy,
      sortOrder
    );
  };

  if (!token)
    return (
      <div className="flex items-center justify-center min-h-screen">
        Redirection...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {/* Logo cliquable */}
            <Link to="/">
              <img
                src="/logo.png"
                alt="Logo C4E Africa"
                className="h-10 w-10 rounded-full shadow-md cursor-pointer"
              />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Dashboard Gestionnaire
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Bouton Changer Mot de Passe */}
            <button
              onClick={() => setShowChangePassword(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 font-medium shadow-sm"
            >
              <Key className="h-5 w-5" />
              <span>Changer Mot de Passe</span>
            </button>

            {/* Bouton Accueil */}
            <Link
              to="/"
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200 font-medium shadow-sm"
            >
              Accueil
            </Link>

            {/* Bouton Déconnexion */}
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

      {/* Modale de changement de mot de passe */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">
                Changer le mot de passe
              </h3>
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
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <XCircle className="h-6 w-6" />
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
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  placeholder="Entrez votre mot de passe actuel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  placeholder="Entrez le nouveau mot de passe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
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
                className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all font-medium"
              >
                Changer le mot de passe
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-8">
        {/* Navigation principale */}
        <div className="flex justify-center mb-8 space-x-1 bg-white/50 rounded-xl p-1 shadow-md">
          <button
            onClick={() => setActiveTab("offres")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "offres"
                ? "bg-yellow-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <Briefcase className="h-5 w-5" />
            <span>Offres d'Emploi</span>
          </button>
          <button
            onClick={() => setActiveTab("candidatures")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "candidatures"
                ? "bg-yellow-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <Users className="h-5 w-5" />
            <span>Candidatures Spontanées - Stage/PFE</span>
          </button>
          <button
            onClick={() => setActiveTab("candidatures-postes")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "candidatures-postes"
                ? "bg-yellow-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <Briefcase className="h-5 w-5" />
            <span>Candidatures par Postes</span>
          </button>
          <button
            onClick={() => setActiveTab("archives")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "archives"
                ? "bg-yellow-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <Archive className="h-5 w-5" />
            <span>Archives</span>
          </button>
        </div>

        {/* Statistiques globales */}
        {(activeTab === "candidatures" ||
          activeTab === "candidatures-postes") && <StatsOverview />}

        {/* Contenu des onglets */}
        {activeTab === "offres" && (
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Gestion des Offres d'Emploi
            </h2>

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

            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
              <h3 className="text-xl font-semibold mb-6 text-gray-800">
                {editingOffre
                  ? "Modifier l'Offre"
                  : "Ajouter une Nouvelle Offre"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Développeur Full Stack"
                    value={
                      editingOffre ? editingOffre.titre : nouvelleOffre.titre
                    }
                    onChange={(e) =>
                      editingOffre
                        ? setEditingOffre({
                            ...editingOffre,
                            titre: e.target.value,
                          })
                        : setNouvelleOffre({
                            ...nouvelleOffre,
                            titre: e.target.value,
                          })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={
                      editingOffre ? editingOffre.type : nouvelleOffre.type
                    }
                    onChange={(e) =>
                      editingOffre
                        ? setEditingOffre({
                            ...editingOffre,
                            type: e.target.value as OffreEmploi["type"],
                          })
                        : setNouvelleOffre({
                            ...nouvelleOffre,
                            type: e.target.value as OffreEmploi["type"],
                          })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="CDI">CDI</option>
                    <option value="CDD 12 mois">CDD 12 mois</option>
                    <option value="Stage">Stage</option>
                    <option value="PFE">PFE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Localisation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Casablanca, Maroc"
                    value={
                      editingOffre
                        ? editingOffre.localisation
                        : nouvelleOffre.localisation
                    }
                    onChange={(e) =>
                      editingOffre
                        ? setEditingOffre({
                            ...editingOffre,
                            localisation: e.target.value,
                          })
                        : setNouvelleOffre({
                            ...nouvelleOffre,
                            localisation: e.target.value,
                          })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salaire (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 5000 MAD"
                    value={
                      editingOffre
                        ? editingOffre.salaire || ""
                        : nouvelleOffre.salaire
                    }
                    onChange={(e) =>
                      editingOffre
                        ? setEditingOffre({
                            ...editingOffre,
                            salaire: e.target.value,
                          })
                        : setNouvelleOffre({
                            ...nouvelleOffre,
                            salaire: e.target.value,
                          })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date d'Expiration <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={
                      editingOffre
                        ? editingOffre.dateExpiration
                        : nouvelleOffre.dateExpiration
                    }
                    onChange={(e) =>
                      editingOffre
                        ? setEditingOffre({
                            ...editingOffre,
                            dateExpiration: e.target.value,
                          })
                        : setNouvelleOffre({
                            ...nouvelleOffre,
                            dateExpiration: e.target.value,
                          })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Description détaillée de l'offre..."
                    value={
                      editingOffre
                        ? editingOffre.description
                        : nouvelleOffre.description
                    }
                    onChange={(e) =>
                      editingOffre
                        ? setEditingOffre({
                            ...editingOffre,
                            description: e.target.value,
                          })
                        : setNouvelleOffre({
                            ...nouvelleOffre,
                            description: e.target.value,
                          })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                    rows={4}
                  />
                </div>

                {/* Section des exigences dynamiques */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exigences du poste
                  </label>

                  {editingOffre ? (
                    // Mode édition
                    <div className="space-y-3">
                      {editingExigences.map((exigence, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="text"
                            placeholder={`Exigence ${
                              index + 1
                            } (ex: Diplôme en génie informatique, 3+ ans d'expérience...)`}
                            value={exigence}
                            onChange={(e) =>
                              mettreAJourChampExigenceEdit(
                                index,
                                e.target.value
                              )
                            }
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                          />
                          {editingExigences.length > 1 && (
                            <button
                              type="button"
                              onClick={() => supprimerChampExigenceEdit(index)}
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
                        onClick={ajouterChampExigenceEdit}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Ajouter une exigence</span>
                      </button>
                    </div>
                  ) : (
                    // Mode création
                    <div className="space-y-3">
                      {exigencesFields.map((exigence, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="text"
                            placeholder={`Exigence ${
                              index + 1
                            } (ex: Diplôme en génie informatique, 3+ ans d'expérience...)`}
                            value={exigence}
                            onChange={(e) =>
                              mettreAJourChampExigence(index, e.target.value)
                            }
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                          />
                          {exigencesFields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => supprimerChampExigence(index)}
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
                        onClick={ajouterChampExigence}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Ajouter une exigence</span>
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    Chaque exigence sera stockée individuellement et pourra être
                    utilisée pour le matching avec les candidats.
                  </p>
                </div>
              </div>
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={
                    editingOffre
                      ? () => modifierOffre(editingOffre)
                      : ajouterOffre
                  }
                  disabled={
                    editingOffre
                      ? !editingOffre.titre ||
                        !editingOffre.description ||
                        !editingOffre.dateExpiration ||
                        !editingOffre.localisation
                      : !nouvelleOffre.titre ||
                        !nouvelleOffre.description ||
                        !nouvelleOffre.dateExpiration ||
                        !nouvelleOffre.localisation
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

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">
                        Titre
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">
                        Localisation
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">
                        Salaire
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">
                        Expiration
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">
                        Statut
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {offres.map((offre) => (
                      <tr
                        key={offre.id}
                        className="hover:bg-gray-50 transition-colors duration-200"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {offre.titre}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {offre.type}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {offre.localisation}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {offre.salaire || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(offre.dateExpiration).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              offre.statut === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {offre.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 space-x-2">
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
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Gestion des Candidatures Spontanées & Stage/PFE
            </h2>

            <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-4">
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(
                    e.target.value as "tous" | "stage_spontane" | "spontanee"
                  )
                }
                className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white shadow-sm"
              >
                <option value="tous">Toutes les candidatures spontanées</option>
                <option value="stage_spontane">Stages/PFE Spontanés</option>
                <option value="spontanee">
                  Candidatures spontanées générales
                </option>
              </select>

              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-600" />
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | "date"
                        | "diplome"
                        | "competence"
                        | "experience"
                    )
                  }
                  className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white shadow-sm"
                >
                  <option value="date">Trier par date</option>
                  <option value="diplome">Trier par diplôme</option>
                  <option value="competence">Trier par compétences</option>
                  <option value="experience">Trier par expérience</option>
                </select>
                <button
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
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

            {["stage_spontane", "spontanee"].map((type) => {
              if (filterType !== "tous" && filterType !== type) return null;

              const candidaturesByType =
                type === "stage_spontane"
                  ? candidatures.filter((c) => c.type === "stage_spontane")
                  : candidatures.filter((c) => c.type === "spontanee");

              // DEBUG: Vérifier le filtrage
              console.log(
                `🔍 DEBUG - Candidatures pour ${type}:`,
                candidaturesByType
              );

              const sortedCandidatures = getSortedCandidatures(
                candidaturesByType,
                sortBy,
                sortOrder
              );

              // Afficher même si vide pour voir le message
              return (
                <div
                  key={type}
                  className="bg-white rounded-xl shadow-lg overflow-hidden mb-6 w-full max-w-[98vw] mx-auto"
                >
                  <h3 className="text-lg font-semibold text-gray-700 bg-gray-100 px-6 py-3 capitalize">
                    {type === "stage_spontane"
                      ? "Candidatures Spontanées Stage/PFE"
                      : "Candidatures Spontanées Générales"}{" "}
                    <span className="ml-2 bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full">
                      {sortedCandidatures.length}
                    </span>
                  </h3>

                  {sortedCandidatures.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Book className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-700 mb-2">
                        Aucune candidature{" "}
                        {type === "stage_spontane"
                          ? "spontanée de stage/PFE"
                          : "spontanée générale"}
                      </h4>
                      <p className="text-gray-500">
                        {type === "stage_spontane"
                          ? "Aucune candidature spontanée de stage ou PFE n'a été reçue pour le moment."
                          : "Aucune candidature spontanée générale n'a été reçue pour le moment."}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <tr>
                            <th className="px-6 py-4 text-left font-semibold text-gray-700">
                              Type
                            </th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-700">
                              Nom
                            </th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-700">
                              Email
                            </th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-700">
                              Diplôme
                            </th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-700">
                              Score Compétences
                            </th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-700">
                              Expérience
                            </th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-700">
                              Date Soumission
                            </th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-700">
                              Statut
                            </th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-700">
                              Actions
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                          {sortedCandidatures.map((cand) => (
                            <tr
                              key={cand.id}
                              className="hover:bg-gray-50 transition-colors duration-200"
                            >
                              <td className="px-6 py-4 font-medium text-gray-900 capitalize flex items-center space-x-2">
                                {cand.type === "stage_spontane" && (
                                  <Book className="h-4 w-4" />
                                )}
                                {cand.type === "spontanee" && (
                                  <Mail className="h-4 w-4" />
                                )}
                                <span>
                                  {cand.type === "stage_spontane"
                                    ? "Stage"
                                    : cand.type === "spontanee"
                                    ? "Candidature Spontanée"
                                    : cand.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-900">
                                {cand.nom}
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                {cand.email}
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                <DisplayDiplome diplome={cand.diplome} />
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                <DisplayCompetenceScore
                                  score={cand.competenceScore}
                                />
                              </td>
                              <td className="px-4 py-2 text-gray-600 w-[100px] text-sm truncate">
                                <DisplayExperience
                                  experience={cand.experience}
                                />
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                {new Date(
                                  cand.dateSoumission
                                ).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                    cand.statut === "en_attente"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : cand.statut === "acceptee"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {cand.statut}
                                </span>
                              </td>
                              <td className="px-6 py-4 space-x-2">
                                <select
                                  value={cand.statut}
                                  onChange={(e) =>
                                    changerStatut(
                                      cand,
                                      e.target.value as Candidature["statut"]
                                    )
                                  }
                                  className="p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                >
                                  <option value="en_attente">En attente</option>
                                  <option value="acceptee">Acceptée</option>
                                  <option value="refusee">Refusée</option>
                                </select>
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

            {selectedCandidature && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fadeIn">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-2xl font-bold text-gray-800">
                      Détails de la candidature
                    </h3>
                  </div>

                  <div className="space-y-3 overflow-y-auto pr-2 max-h-[70vh] custom-scrollbar">
                    <p>
                      <strong>👤 Nom :</strong> {selectedCandidature.nom}
                    </p>
                    <p>
                      <strong>📧 Email :</strong> {selectedCandidature.email}
                    </p>
                    {selectedCandidature.telephone && (
                      <p>
                        <strong>📞 Téléphone :</strong>{" "}
                        {selectedCandidature.telephone}
                      </p>
                    )}
                    {selectedCandidature.diplome && (
                      <p>
                        <strong>🎓 Diplôme :</strong>{" "}
                        {selectedCandidature.diplome}
                      </p>
                    )}
                    {selectedCandidature.experience && (
                      <p>
                        <strong>💼 Expérience :</strong>{" "}
                        {selectedCandidature.experience}
                      </p>
                    )}
                    {selectedCandidature.competenceScore && (
                      <p>
                        <strong>⭐ Score de compétences :</strong>{" "}
                        {selectedCandidature.competenceScore}%
                      </p>
                    )}
                    <p>
                      <strong>📅 Date de soumission :</strong>{" "}
                      {new Date(
                        selectedCandidature.dateSoumission
                      ).toLocaleDateString()}
                    </p>

                    {/* Ajout du type spécifique dans les détails */}
                    <p>
                      <strong>📋 Type de candidature :</strong>
                      <span
                        className={`ml-2 px-2 py-1 rounded-full text-xs ${
                          selectedCandidature.type === "stage_spontane"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {selectedCandidature.type === "stage_spontane"
                          ? "Stage/PFE Spontané"
                          : "Spontanée Générale"}
                      </span>
                    </p>

                    {selectedCandidature.cvUrl && (
                      <p>
                        <strong>📎 CV :</strong>{" "}
                        <a
                          href={getFileUrl(selectedCandidature.cvUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Télécharger le CV (PDF)</span>
                        </a>
                      </p>
                    )}

                    {selectedCandidature.lettreMotivationUrl && (
                      <p>
                        <strong>📝 Lettre de motivation :</strong>{" "}
                        <a
                          href={getFileUrl(
                            selectedCandidature.lettreMotivationUrl
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Télécharger la lettre de motivation (PDF)</span>
                        </a>
                      </p>
                    )}

                    {selectedCandidature.motivation &&
                      !selectedCandidature.lettreMotivationUrl && (
                        <div className="bg-gray-50 p-3 rounded-lg border text-sm text-gray-700 max-h-40 overflow-y-auto">
                          <strong>📝 Lettre de motivation :</strong>
                          <p className="whitespace-pre-wrap mt-1">
                            {selectedCandidature.motivation}
                          </p>
                        </div>
                      )}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => supprimerCandidature(selectedCandidature)}
                      className="flex items-center space-x-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Supprimer</span>
                    </button>
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

        {activeTab === "candidatures-postes" && (
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Gestion des Candidatures par Postes
            </h2>

            {/* Onglets pour filtrer par type d'offre */}
            <div className="flex justify-center mb-8">
              <div className="bg-white rounded-full p-2 shadow-lg border border-gray-200">
                <button
                  onClick={() => {
                    setOngletCandidatures("emploi");
                    setViewMode("postes");
                    setSelectedOffre(null);
                  }}
                  className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                    ongletCandidatures === "emploi"
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                      : "text-gray-600 hover:text-gray-900"
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
                    ongletCandidatures === "stage"
                      ? "bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Stages / PFE
                </button>
              </div>
            </div>

            {/* Affichage conditionnel */}
            {viewMode === "postes" && (
              <PostesList filtreType={ongletCandidatures} />
            )}
            {viewMode === "candidatures" && selectedOffre && (
              <CandidaturesForPoste filtreType={ongletCandidatures} />
            )}

            {/* Modal de détails de candidature */}
            {selectedCandidature && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fadeIn">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-2xl font-bold text-gray-800">
                      Détails de la candidature
                      <span className="text-blue-600 font-semibold">
                        {" "}
                        — {selectedCandidature.poste || "Poste"}
                      </span>
                      <span
                        className={`ml-2 text-sm px-2 py-1 rounded-full ${
                          selectedCandidature.type === "emploi"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {selectedCandidature.type === "emploi"
                          ? "CDI/CDD"
                          : "Stage/PFE"}
                      </span>
                    </h3>
                  </div>

                  <div className="space-y-3 overflow-y-auto pr-2 max-h-[70vh] custom-scrollbar">
                    <p>
                      <strong>👤 Nom :</strong> {selectedCandidature.nom}
                    </p>
                    <p>
                      <strong>📧 Email :</strong> {selectedCandidature.email}
                    </p>
                    {selectedCandidature.telephone && (
                      <p>
                        <strong>📞 Téléphone :</strong>{" "}
                        {selectedCandidature.telephone}
                      </p>
                    )}

                    <p>
                      <strong>📁 Type :</strong>
                      <span
                        className={`ml-1 px-2 py-1 rounded-full text-xs ${
                          selectedCandidature.type === "emploi"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {selectedCandidature.type === "emploi"
                          ? "Emploi (CDI/CDD)"
                          : "Stage/PFE"}
                      </span>
                    </p>

                    {selectedCandidature.type === "emploi" &&
                      selectedCandidature.experience && (
                        <p>
                          <strong>💼 Expérience :</strong>{" "}
                          {selectedCandidature.experience}
                        </p>
                      )}

                    {(selectedCandidature.type === "stage" ||
                      selectedCandidature.type === "pfe") &&
                      selectedCandidature.diplome && (
                        <p>
                          <strong>🎓 Diplôme/Niveau :</strong>{" "}
                          {selectedCandidature.diplome}
                        </p>
                      )}

                    {selectedCandidature.diplome &&
                      selectedCandidature.type === "emploi" && (
                        <p>
                          <strong>🎓 Diplôme :</strong>{" "}
                          {selectedCandidature.diplome}
                        </p>
                      )}

                    {selectedCandidature.competenceScore && (
                      <p>
                        <strong>⭐ Score de compétences :</strong>{" "}
                        {selectedCandidature.competenceScore}%
                      </p>
                    )}
                    <p>
                      <strong>📅 Date de soumission :</strong>{" "}
                      {new Date(
                        selectedCandidature.dateSoumission
                      ).toLocaleDateString()}
                    </p>

                    {selectedCandidature.cvUrl && (
                      <p>
                        <strong>📎 CV :</strong>{" "}
                        <a
                          href={getFileUrl(selectedCandidature.cvUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Télécharger le CV (PDF)</span>
                        </a>
                      </p>
                    )}

                    {selectedCandidature.lettreMotivationUrl && (
                      <p>
                        <strong>📝 Lettre de motivation :</strong>{" "}
                        <a
                          href={getFileUrl(
                            selectedCandidature.lettreMotivationUrl
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Télécharger la lettre de motivation (PDF)</span>
                        </a>
                      </p>
                    )}

                    {selectedCandidature.motivation &&
                      !selectedCandidature.lettreMotivationUrl && (
                        <div className="bg-gray-50 p-3 rounded-lg border text-sm text-gray-700 max-h-40 overflow-y-auto">
                          <strong>📝 Lettre de motivation :</strong>
                          <p className="whitespace-pre-wrap mt-1">
                            {selectedCandidature.motivation}
                          </p>
                        </div>
                      )}

                    {selectedCandidature.domaine && (
                      <p>
                        <strong>🌍 Domaine :</strong>{" "}
                        {selectedCandidature.domaine}
                      </p>
                    )}

                    {(selectedCandidature.type === "stage" ||
                      selectedCandidature.type === "pfe") &&
                      selectedCandidature.duree && (
                        <p>
                          <strong>⏱️ Durée :</strong>{" "}
                          {selectedCandidature.duree}
                        </p>
                      )}

                    <p>
                      <strong>📋 Type de candidature :</strong>
                      <span
                        className={`ml-1 px-2 py-1 rounded-full text-xs ${
                          selectedCandidature.offreId
                            ? "bg-purple-100 text-purple-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {selectedCandidature.offreId
                          ? "Sur offre spécifique"
                          : "Candidature spontanée"}
                      </span>
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => supprimerCandidature(selectedCandidature)}
                      className="flex items-center space-x-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Supprimer</span>
                    </button>
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

        {activeTab === "archives" && (
          <section className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Archives des Candidatures
              </h2>
              <p className="text-gray-600 text-lg">
                Consultation des candidatures déjà traitées (acceptées/refusées)
              </p>
            </div>

            {/* Statistiques des archives */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <Archive className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-gray-900">
                  {statsArchives.total}
                </h3>
                <p className="text-gray-600">Total archivé</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-gray-900">
                  {statsArchives.acceptees}
                </h3>
                <p className="text-gray-600">Candidatures acceptées</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-gray-900">
                  {statsArchives.refusees}
                </h3>
                <p className="text-gray-600">Candidatures refusées</p>
              </div>
            </div>

            {/* Filtres archives */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full">
                  <div className="flex items-center space-x-4 flex-1">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <select
                      value={archiveFilter}
                      onChange={(e) =>
                        setArchiveFilter(
                          e.target.value as "tous" | "acceptees" | "refusees"
                        )
                      }
                      className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white shadow-sm w-full md:w-auto"
                    >
                      <option value="tous">Toutes les archives</option>
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

            {/* Tableau des archives */}
            {loadingCandidatures ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Chargement des archives...</p>
              </div>
            ) : candidaturesRecherchees.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <Archive className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-700 mb-2">
                  {searchArchive
                    ? "Aucun résultat trouvé"
                    : "Aucune candidature archivée"}
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
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">
                          Nom
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">
                          Type
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">
                          Diplôme
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">
                          Score
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">
                          Date
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">
                          Statut
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {candidaturesRecherchees.map((cand) => (
                        <tr
                          key={`${cand.id}-${cand.type}`}
                          className="hover:bg-gray-50 transition-colors duration-200"
                        >
                          <td className="px-6 py-4 text-gray-900">
                            {cand.nom}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {cand.email}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
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
                              {cand.type === "spontanee"
                                ? "Spontanée"
                                : cand.type === "emploi"
                                ? "CDI/CDD"
                                : cand.type === "stage"
                                ? "Stage"
                                : cand.type === "pfe"
                                ? "PFE"
                                : cand.type === "stage_spontane"
                                ? "Stage Spontané"
                                : cand.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            <DisplayDiplome diplome={cand.diplome} />
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            <DisplayCompetenceScore
                              score={cand.competenceScore}
                            />
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {new Date(cand.dateSoumission).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                cand.statut === "acceptee"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {cand.statut === "acceptee"
                                ? "Acceptée"
                                : "Refusée"}
                            </span>
                          </td>
                          <td className="px-6 py-4 space-x-2">
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal de détails pour les archives */}
            {selectedCandidature && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fadeIn">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-2xl font-bold text-gray-800">
                      Détails de la candidature archivée
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedCandidature.statut === "acceptee"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedCandidature.statut === "acceptee"
                          ? "Acceptée"
                          : "Refusée"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 overflow-y-auto pr-2 max-h-[70vh]">
                    <p>
                      <strong>👤 Nom :</strong> {selectedCandidature.nom}
                    </p>
                    <p>
                      <strong>📧 Email :</strong> {selectedCandidature.email}
                    </p>
                    {selectedCandidature.telephone && (
                      <p>
                        <strong>📞 Téléphone :</strong>{" "}
                        {selectedCandidature.telephone}
                      </p>
                    )}
                    {selectedCandidature.diplome && (
                      <p>
                        <strong>🎓 Diplôme :</strong>{" "}
                        {selectedCandidature.diplome}
                      </p>
                    )}
                    {selectedCandidature.experience && (
                      <p>
                        <strong>💼 Expérience :</strong>{" "}
                        {selectedCandidature.experience}
                      </p>
                    )}
                    {selectedCandidature.competenceScore && (
                      <p>
                        <strong>⭐ Score de compétences :</strong>{" "}
                        {selectedCandidature.competenceScore}%
                      </p>
                    )}
                    <p>
                      <strong>📅 Date de soumission :</strong>{" "}
                      {new Date(
                        selectedCandidature.dateSoumission
                      ).toLocaleDateString()}
                    </p>
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

                    {selectedCandidature.cvUrl && (
                      <p>
                        <strong>📎 CV :</strong>{" "}
                        <a
                          href={getFileUrl(selectedCandidature.cvUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Télécharger le CV</span>
                        </a>
                      </p>
                    )}

                    {selectedCandidature.lettreMotivationUrl && (
                      <p>
                        <strong>📝 Lettre de motivation :</strong>{" "}
                        <a
                          href={getFileUrl(
                            selectedCandidature.lettreMotivationUrl
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Télécharger la lettre</span>
                        </a>
                      </p>
                    )}
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
      </div>
    </div>
  );
};

export default Dashboard;