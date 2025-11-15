// ============================================================
// Fichier : /components/Dashboard.tsx
// Description : Composant principal du Dashboard de gestion RH/Offres.
// Rôle :
// - Affiche les statistiques globales des candidatures et offres.
// - Gère les onglets : Offres, Candidatures spontanées, Candidatures par postes, Candidatures traitées, Archives.
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
  statut: "en_attente" | "acceptee" | "refusee" | "archivee";
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
    "offres" | "candidatures" | "candidatures-postes" | "candidatures-traitees" | "archives"
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
      } else if (activeTab === "candidatures-traitees" || activeTab === "archives") {
        const { res, data } = await api.get<Candidature[]>("/api/candidatures", token);

        if (!res.ok)
          throw new Error("Erreur lors du chargement des données.");

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

  if (["candidatures", "candidatures-postes", "candidatures-traitees", "archives"].includes(activeTab)) {
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
  const supprimerCandidature = async (candidature: Candidature) => {
    if (
      !window.confirm(
        `Confirmer la suppression de la candidature de ${candidature.nom} ?`
      )
    )
      return;
    try {
      const { id, type } = candidature;

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

  // Fonction pour archiver une candidature
  const archiverCandidature = async (candidature: Candidature) => {
    if (!window.confirm(`Archiver la candidature de ${candidature.nom} ?`)) return;
    
    try {
      const { id, type } = candidature;

      // Mettre à jour localement d'abord
      setCandidatures((prev) =>
        prev.map((c) => 
          c.id === id && c.type === type ? { ...c, statut: "archivee" } : c
        )
      );

      // Appel API pour archiver
      let typeAPI = type;
      if (type === "stage_spontane") {
        typeAPI = "stage";
      }

      const res = await fetch(
        getApiUrl(`/api/candidatures/statut/${typeAPI}/${id}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ statut: "archivee" }),
        }
      );

      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }

      console.log("✅ Candidature archivée avec succès");
      
      // Fermer la modale si ouverte
      if (selectedCandidature?.id === id && selectedCandidature?.type === type) {
        setSelectedCandidature(null);
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("❌ Erreur:", err);
      setErrorCandidatures(`Échec de l'archivage: ${message}`);
      
      // Recharger les données en cas d'erreur
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
  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setPasswordError("Veuillez remplir tous les champs.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/auth/change-password"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erreur lors du changement de mot de passe.");
      }

      setPasswordSuccess("Mot de passe changé avec succès !");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      // Fermer la modale après 2 secondes
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess("");
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setPasswordError(message);
    }
  };

  // Fonctions utilitaires pour les candidatures
  const getCandidaturesEnCours = (candidaturesList: Candidature[]) => {
    return candidaturesList.filter(c => c.statut === "en_attente");
  };

  const getCandidaturesTraitees = (candidaturesList: Candidature[]) => {
    return candidaturesList.filter(c => c.statut === "acceptee" || c.statut === "refusee");
  };

  const getCandidaturesArchivees = (candidaturesList: Candidature[]) => {
    return candidaturesList.filter(c => c.statut === "archivee");
  };

  // Fonctions pour les candidatures traitées
  const candidaturesTraitees = getCandidaturesTraitees(candidatures);
  const candidaturesArchivees = getCandidaturesArchivees(candidatures);

  const candidaturesFiltreesTraitees =
    archiveFilter === "tous"
      ? candidaturesTraitees
      : candidaturesTraitees.filter((c) =>
          archiveFilter === "acceptees"
            ? c.statut === "acceptee"
            : c.statut === "refusee"
        );

  const candidaturesRecherchees = candidaturesFiltreesTraitees.filter(
    (c) =>
      c.nom.toLowerCase().includes(searchArchive.toLowerCase()) ||
      c.email.toLowerCase().includes(searchArchive.toLowerCase()) ||
      (c.poste && c.poste.toLowerCase().includes(searchArchive.toLowerCase()))
  );

  const candidaturesArchiveesFiltrees = candidaturesArchivees.filter(
    (c) =>
      c.nom.toLowerCase().includes(searchArchive.toLowerCase()) ||
      c.email.toLowerCase().includes(searchArchive.toLowerCase()) ||
      (c.poste && c.poste.toLowerCase().includes(searchArchive.toLowerCase()))
  );

  const statsTraitees = {
    total: candidaturesTraitees.length,
    acceptees: candidaturesTraitees.filter((c) => c.statut === "acceptee")
      .length,
    refusees: candidaturesTraitees.filter((c) => c.statut === "refusee")
      .length,
  };

  const statsArchives = {
    total: candidaturesArchivees.length,
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
    const candidaturesEnCours = getCandidaturesEnCours(candidatures);
    const candidaturesTraitees = getCandidaturesTraitees(candidatures);

    const stats = {
      enAttente: candidaturesEnCours.length,
      traitees: candidaturesTraitees.length,
      acceptees: candidatures.filter((c) => c.statut === "acceptee").length,
      refusees: candidatures.filter((c) => c.statut === "refusee").length,
      offresActives: offres.filter((o) => o.statut === "active").length,
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        {/* Traitées */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Traitées
              </p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {stats.traitees}
              </p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <p className="text-xs text-gray-500">Avec réponse</p>
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors duration-300">
              <Archive className="h-6 w-6 text-purple-600" />
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
                          Candidatures en attente
                        </span>
                        <span className="text-lg font-bold text-blue-600">
                          {stats.enAttente}
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
                        disabled={stats.enAttente === 0}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>
                          {stats.enAttente === 0
                            ? "Aucune en attente"
                            : `Voir (${stats.enAttente})`}
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

      // FILTRER POUR N'AFFICHER QUE LES EN COURS
      return candidaturesPourOffre.filter(c => c.statut === "en_attente");
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
                {stats.total} candidature(s) en attente{" "}
                {filtreType === "emploi" ? "CDI/CDD" : "Stage/PFE"}
              </p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-4 mt-4">
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
            Affichage de {candidaturesPourOffre.length} candidature(s) en attente
          </div>
        </div>

        {/* Tableau des candidatures */}
        {candidaturesPourOffre.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              Aucune candidature en attente
            </h4>
            <p className="text-gray-500 mb-4">
              Toutes les candidatures pour ce poste ont été traitées.
            </p>
            <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
              <p>💡 Les candidatures traitées sont disponibles dans l'onglet "Candidatures Traitées"</p>
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
                          <option value="archivee">Archiver</option>
                        </select>
                        <button
                          onClick={() => setSelectedCandidature(cand)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="Voir détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => archiverCandidature(cand)}
                          className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          title="Archiver cette candidature"
                        >
                          <Archive className="h-4 w-4" />
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
            <span>Candidatures Spontanées</span>
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
            onClick={() => setActiveTab("candidatures-traitees")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "candidatures-traitees"
                ? "bg-yellow-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <CheckCircle className="h-5 w-5" />
            <span>Candidatures Traitées</span>
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

            {/* ... Le reste du code pour les offres reste inchangé ... */}
          </section>
        )}

        {activeTab === "candidatures" && (
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Candidatures Spontanées - En Cours
            </h2>

            <div className="flex justify-center mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-blue-700">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Affichage des candidatures en attente de traitement</span>
                </div>
                <p className="text-blue-600 text-sm mt-1">
                  Les candidatures acceptées ou refusées sont disponibles dans l'onglet "Candidatures Traitées"
                </p>
              </div>
            </div>

            {/* ... Le reste du code pour les candidatures spontanées ... */}

            {["stage_spontane", "spontanee"].map((type) => {
              if (filterType !== "tous" && filterType !== type) return null;

              const candidaturesByType = candidatures.filter((c) => c.type === type);
              const candidaturesEnCours = getCandidaturesEnCours(candidaturesByType);
              
              const sortedCandidatures = getSortedCandidatures(
                candidaturesEnCours,
                sortBy,
                sortOrder
              );

              return (
                <div
                  key={type}
                  className="bg-white rounded-xl shadow-lg overflow-hidden mb-6 w-full max-w-[98vw] mx-auto"
                >
                  <h3 className="text-lg font-semibold text-gray-700 bg-gray-100 px-6 py-3 capitalize">
                    {type === "stage_spontane"
                      ? "Candidatures Spontanées Stage/PFE - En Cours"
                      : "Candidatures Spontanées Générales - En Cours"}{" "}
                    <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      {sortedCandidatures.length} en attente
                    </span>
                  </h3>

                  {sortedCandidatures.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-700 mb-2">
                        Aucune candidature en attente
                      </h4>
                      <p className="text-gray-500">
                        Toutes les candidatures {type === "stage_spontane" ? "de stage/PFE" : "générales"} ont été traitées.
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
                                  <option value="archivee">Archiver</option>
                                </select>
                                <button
                                  onClick={() => setSelectedCandidature(cand)}
                                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  title="Voir détails"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => archiverCandidature(cand)}
                                  className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  title="Archiver cette candidature"
                                >
                                  <Archive className="h-4 w-4" />
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

            {/* Modal de détails */}
            {selectedCandidature && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fadeIn">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-2xl font-bold text-gray-800">
                      Détails de la candidature
                    </h3>
                  </div>

                  <div className="space-y-3 overflow-y-auto pr-2 max-h-[70vh] custom-scrollbar">
                    {/* ... Détails de la candidature ... */}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => archiverCandidature(selectedCandidature)}
                      className="flex items-center space-x-2 px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-medium"
                    >
                      <Archive className="h-4 w-4" />
                      <span>Archiver</span>
                    </button>
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
              Candidatures par Postes - En Cours
            </h2>

            <div className="flex justify-center mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-blue-700">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Affichage des candidatures en attente de traitement</span>
                </div>
                <p className="text-blue-600 text-sm mt-1">
                  Les candidatures acceptées ou refusées sont disponibles dans l'onglet "Candidatures Traitées"
                </p>
              </div>
            </div>

            {/* ... Le reste du code pour les candidatures par postes ... */}
          </section>
        )}

        {activeTab === "candidatures-traitees" && (
          <section className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Candidatures Traitées
              </h2>
              <p className="text-gray-600 text-lg">
                Historique des candidatures avec réponse (acceptation ou refus)
              </p>
            </div>

            {/* ... Le reste du code pour les candidatures traitées ... */}
          </section>
        )}

        {activeTab === "archives" && (
          <section className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Archives des Candidatures
              </h2>
              <p className="text-gray-600 text-lg">
                Candidatures archivées pour conservation
              </p>
            </div>

            {/* Statistiques des archives */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <Archive className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-gray-900">
                  {statsArchives.total}
                </h3>
                <p className="text-gray-600">Total archivé</p>
              </div>
            </div>

            {/* Filtres archives */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full">
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
                  {candidaturesArchiveesFiltrees.length} candidature(s) archivée(s)
                </div>
              </div>
            </div>

            {/* Tableau des archives */}
            {loadingCandidatures ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Chargement des archives...</p>
              </div>
            ) : candidaturesArchiveesFiltrees.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <Archive className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-700 mb-2">
                  {searchArchive ? "Aucun résultat trouvé" : "Aucune candidature archivée"}
                </h4>
                <p className="text-gray-500">
                  {searchArchive
                    ? "Aucune candidature ne correspond à votre recherche."
                    : "Les candidatures archivées apparaîtront ici."}
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
                          Poste
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
                      {candidaturesArchiveesFiltrees.map((cand) => (
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
                            {cand.poste || "Spontanée"}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {new Date(cand.dateSoumission).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                cand.statut === "archivee"
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              Archivée
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setSelectedCandidature(cand)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className={`px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800`}
                      >
                        Archivée
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