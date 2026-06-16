// ============================================================
// Fichier : /components/Dashboard.tsx
// Description : Composant principal du Dashboard de gestion RH/Offres.
// RÃ´le :
// - Affiche les statistiques globales des candidatures et offres.
// - GÃ¨re les onglets : Offres, Candidatures spontanÃ©es, Candidatures par postes, Archives, RÃ©ponses Candidatures.
// - Permet l'ajout, la modification et la suppression des offres d'emploi.
// - Permet la consultation, le tri et la gestion du statut des candidatures.
// - Supporte plusieurs types de candidatures : emploi, stage, PFE, spontanee, stage_spontane.
// - IntÃ¨gre la recherche, le filtrage et le tri des candidatures et des archives.
// - GÃ¨re dynamiquement les champs d'exigences pour les offres.
// - Utilise React, TypeScript, fetch API pour interagir avec le backend et Lucide/Framer Motion pour les icÃ´nes et animations.
// ============================================================
import { useState, useEffect } from "react";
import { formatDateForDisplay } from "../lib/date";
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
} from "lucide-react";
import api, { API_BASE_URL, apiUrl as getApiUrl } from "../lib/api";

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

const diplomeOrder: Record<string, number> = {
  technicien: 1,
  licence: 2,
  master: 3,
  master_ingenieur: 3,
  "cycle d'ingÃ©nieur": 3,
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

  return `${API_BASE_URL}${
    filePath.startsWith("/") ? filePath : "/" + filePath
  }`;
};

// Fonction utilitaire pour gÃ©rer les erreurs API
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = `Erreur HTTP ${response.status}`;
    let errorDetails = "";
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
      errorDetails = errorData.details || "";
    } catch {
      errorMessage = `Erreur ${response.status}: ${response.statusText}`;
    }
    
    const fullError = errorDetails ? `${errorMessage} - ${errorDetails}` : errorMessage;
    console.error(`âŒ Erreur API ${response.status}:`, fullError);
    throw new Error(fullError);
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

const Dashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

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
  const [selectedCandidature, setSelectedCandidature] =
    useState<Candidature | null>(null);
  const [sortBy, setSortBy] = useState<
    "date" | "diplome" | "competence" | "experience"
  >("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [viewMode, setViewMode] = useState<"postes" | "candidatures">("postes");
  const [selectedOffre, setSelectedOffre] = useState<OffreEmploi | null>(null);
  const [ongletCandidatures, setOngletCandidatures] = useState<
    "emploi" | "stage"
  >("emploi");

  const [exigencesFields, setExigencesFields] = useState<string[]>([""]);
  const [editingExigences, setEditingExigences] = useState<string[]>([""]);

  const [archiveFilter, setArchiveFilter] = useState<
    "tous" | "acceptees" | "refusees" | "ignorees"
  >("tous");
  const [searchArchive, setSearchArchive] = useState("");

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  // Ã‰tats pour les notifications
  const [notificationCounts, setNotificationCounts] = useState({
    candidatures: 0,
    candidaturesPostes: 0
  });

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // Charger les donnÃ©es depuis localStorage au montage
useEffect(() => {
  const savedCandidatures = localStorage.getItem('candidatures');
  if (savedCandidatures) {
    try {
      const parsedCandidatures = JSON.parse(savedCandidatures);
      setCandidatures(parsedCandidatures);
    } catch (error) {
      console.error('Erreur parsing localStorage:', error);
    }
  }
}, []);

// Sauvegarder les candidatures dans localStorage Ã  chaque modification
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

  useEffect(() => {
    const fetchOffres = async () => {
      try {
        setLoadingOffres(true);
        setErrorOffres("");

        const { res, data } = await api.get<OffreEmploi[]>("/api/offres", token);

        if (!res.ok) throw new Error("Erreur lors du chargement des offres.");

        setOffres(
          data.map((o) => ({
            id: o.id,
            titre: o.titre,
            description: o.description,
            salaire: o.salaire,
            dateExpiration: o.dateExpiration,
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

useEffect(() => {
  const fetchCandidatures = async () => {
    try {
      setLoadingCandidatures(true);
      setErrorCandidatures("");

      let url = "";
      if (activeTab === "candidatures") {
        url = "/api/candidatures/spontanees/toutes";
      } else if (activeTab === "candidatures-postes" || activeTab === "archives" || activeTab === "reponses-candidatures") {
        url = "/api/candidatures";
      }

      console.log("ðŸ”„ Chargement des candidatures depuis:", url);

      const response = await fetch(getApiUrl(url), {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("ðŸ“¥ RÃ©ponse API brute:", data);

      // Normaliser les donnÃ©es
      let normalizedData: Candidature[] = [];

      if (Array.isArray(data.candidatures)) {
        normalizedData = data.candidatures;
      } else if (Array.isArray(data)) {
        normalizedData = data;
      } else if (data.candidature && typeof data.candidature === 'object') {
        normalizedData = [data.candidature];
      } else {
        normalizedData = [];
      }

      // CORRECTION : Fusion amÃ©liorÃ©e qui prÃ©serve mieux l'Ã©tat local
setCandidatures(prevCandidatures => {
  const localMap = new Map();
  
  // CrÃ©er un Map avec TOUTES les donnÃ©es locales
  prevCandidatures.forEach(c => {
    const key = `${c.id}-${c.type}`;
    localMap.set(key, {
      ...c,
      // PrÃ©server tous les Ã©tats locaux importants
      ignored: c.ignored,
      statut: c.statut,
      dateSoumission: c.dateSoumission
    });
  });

  const merged = normalizedData.map((apiCand: Candidature) => {
    const key = `${apiCand.id}-${apiCand.type}`;
    const localCand = localMap.get(key);
    
    if (localCand) {
      console.log(`âœ… Fusion: ${apiCand.nom} - ignored=${localCand.ignored}, statut=${localCand.statut}`);
      
      // Fusionner intelligemment : prioritÃ© aux donnÃ©es locales
      return {
        ...apiCand,           // donnÃ©es de base de l'API
        ignored: localCand.ignored, // TOUJOURS prendre l'Ã©tat local
        statut: localCand.statut,   // TOUJOURS prendre l'Ã©tat local
        dateSoumission: localCand.dateSoumission // garder la date locale
      };
    }
    
    // Nouvelle candidature depuis l'API
    return {
      ...apiCand,
      ignored: false, // par dÃ©faut non ignorÃ©e
      statut: apiCand.statut || "en_attente"
    };
  });

  // Ajouter les candidatures locales qui ne sont pas dans l'API (au cas oÃ¹)
  const localOnlyCandidates = prevCandidatures.filter(localCand => {
    const key = `${localCand.id}-${localCand.type}`;
    return !normalizedData.some(apiCand => 
      `${apiCand.id}-${apiCand.type}` === key
    );
  });

  const finalMerged = [...merged, ...localOnlyCandidates];
  
  console.log(`âœ… Fusion finale: ${finalMerged.length} total, ${finalMerged.filter(c => c.ignored).length} ignorÃ©es`);
  return finalMerged;
});

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("âŒ Erreur fetchCandidatures:", err);
      setErrorCandidatures(message);
    } finally {
      setLoadingCandidatures(false);
    }
  };

  if (["candidatures", "candidatures-postes", "archives", "reponses-candidatures"].includes(activeTab)) {
    fetchCandidatures();
  }
}, [activeTab, token]);



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

const supprimerCandidature = async (candidature: Candidature) => {
  if (!window.confirm(`Confirmer la suppression de la candidature de ${candidature.nom} ?`))
    return;

  try {
    const { id, type } = candidature;
    console.log("ðŸ—‘ï¸ Suppression:", { id, type, nom: candidature.nom });

    // DÃ©terminer le bon endpoint
    let endpoint = '';
    if (type === 'spontanee' || type === 'stage_spontane') {
      endpoint = `/api/candidatures/spontanees/${id}`;
    } else {
      endpoint = `/api/candidatures/${id}`;
    }

    console.log(`ðŸ”— Endpoint: ${endpoint}`);

    const response = await fetch(getApiUrl(endpoint), {
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`ðŸ“Š RÃ©ponse: ${response.status}`);

    if (response.ok) {
      const result = await response.json();
      console.log("âœ… Suppression rÃ©ussie:", result);

      // Mettre Ã  jour l'Ã©tat local
      setCandidatures((prev) =>
        prev.filter((c) => !(c.id === id && c.type === type))
      );

      // Mettre Ã  jour le localStorage
      const savedCandidatures = JSON.parse(localStorage.getItem('candidatures') || '[]');
      const updatedCandidatures = savedCandidatures.filter((c: Candidature) =>
        !(c.id === id && c.type === type)
      );
      localStorage.setItem('candidatures', JSON.stringify(updatedCandidatures));

      // Fermer le modal si ouvert
      if (selectedCandidature?.id === id && selectedCandidature?.type === type) {
        setSelectedCandidature(null);
      }

      setErrorCandidatures(`âœ… Candidature de ${candidature.nom} supprimÃ©e avec succÃ¨s`);
      setTimeout(() => setErrorCandidatures(""), 3000);

    } else {
      // Essayer de rÃ©cupÃ©rer le message d'erreur
      let errorMessage = `Erreur ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = `Erreur ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("âŒ Erreur suppression:", err);
    setErrorCandidatures(`âŒ Erreur: ${message}`);
  }
};
const envoyerEmailCandidature = async (
  candidature: Candidature,
  statut: "acceptee" | "refusee"
) => {
  try {
    console.log("ðŸ“§ Fonction email appelÃ©e (simulation):", { 
      candidatureId: candidature.id, 
      statut,
      email: candidature.email 
    });

    console.log(`âœ… Simulation email ${statut} pour ${candidature.nom} (${candidature.email})`);
    
    return true;

  } catch (error: unknown) {
    console.warn("âš ï¸ Note: FonctionnalitÃ© email non disponible pour le moment");
    return true;
  }
};

const restaurerCandidature = (candidature: Candidature) => {
  const updatedCandidature = { ...candidature, ignored: false };
  
  setCandidatures((prev) =>
    prev.map((c) =>
      c.id === candidature.id && c.type === candidature.type ? updatedCandidature : c
    )
  );

  const savedCandidatures = JSON.parse(localStorage.getItem('candidatures') || '[]');
  const updatedCandidatures = savedCandidatures.map((c: Candidature) =>
    c.id === candidature.id && c.type === candidature.type ? updatedCandidature : c
  );
  localStorage.setItem('candidatures', JSON.stringify(updatedCandidatures));

  console.log(`âœ… Candidature de ${candidature.nom} restaurÃ©e`);
  setErrorCandidatures(`âœ… Candidature de ${candidature.nom} restaurÃ©e`);
  setTimeout(() => setErrorCandidatures(""), 3000);
};
  
const changerStatut = async (
  candidature: Candidature,
  nouveauStatut: "en_attente" | "acceptee" | "refusee" | "ignorer"
) => {
  try {
    const { id, type } = candidature;

    console.log("ðŸš€ Mise Ã  jour statut:", { id, type, nouveauStatut, currentIgnored: candidature.ignored });

    // Pour "ignorer", on gÃ¨re uniquement en local
    if (nouveauStatut === "ignorer") {
      const updatedCandidature = { 
        ...candidature, 
        statut: "en_attente", // IMPORTANT: statut reste "en_attente"
        ignored: true 
      };
      
      console.log(`ðŸ”• Ignorer: ${candidature.nom}, nouveau ignored=${updatedCandidature.ignored}`);
      
      setCandidatures((prev) =>
        prev.map((c) =>
          c.id === id && c.type === type ? updatedCandidature : c
        )
      );

      // Sauvegarder dans localStorage IMMÃ‰DIATEMENT
      const savedCandidatures = JSON.parse(localStorage.getItem('candidatures') || '[]');
      const updatedCandidatures = savedCandidatures.map((c: Candidature) =>
        c.id === id && c.type === type ? updatedCandidature : c
      );
      localStorage.setItem('candidatures', JSON.stringify(updatedCandidatures));

      setErrorCandidatures(`âœ… Candidature de ${candidature.nom} ignorÃ©e`);
      setTimeout(() => setErrorCandidatures(""), 3000);
      return;
    }

    // Pour les autres statuts, appeler l'API
    const response = await fetch(getApiUrl(`/api/candidatures/statut/${type}/${id}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        statut: nouveauStatut
      }),
    });

    await handleApiError(response);

    const result = await response.json();
    console.log("âœ… RÃ©ponse backend:", result);

    // Mettre Ã  jour l'Ã©tat local
    const updatedCandidature = { 
      ...candidature, 
      statut: nouveauStatut,
      ignored: false // Une candidature acceptÃ©e/refusÃ©e n'est pas ignorÃ©e
    };
    
    setCandidatures((prev) =>
      prev.map((c) =>
        c.id === id && c.type === type ? updatedCandidature : c
      )
    );

    // Sauvegarder dans localStorage
    const savedCandidatures = JSON.parse(localStorage.getItem('candidatures') || '[]');
    const updatedCandidatures = savedCandidatures.map((c: Candidature) =>
      c.id === id && c.type === type ? updatedCandidature : c
    );
    localStorage.setItem('candidatures', JSON.stringify(updatedCandidatures));

    const message = result.message || `âœ… Statut de ${candidature.nom} mis Ã  jour avec succÃ¨s`;
    setErrorCandidatures(message);
    
    setTimeout(() => setErrorCandidatures(""), 3000);

  } catch (err: unknown) {
    console.error("âŒ Erreur dÃ©taillÃ©e:", err);
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    setErrorCandidatures(`âŒ Erreur: ${message}`);
  }
};

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
            onClick={() => setSelectedCandidature(candidature)}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200"
            title="Voir dÃ©tails"
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
            console.log("ðŸŽ¯ SÃ©lection:", selectedValue);
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
          onClick={() => setSelectedCandidature(candidature)}
          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200"
          title="Voir dÃ©tails"
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

const handleLogout = () => {
  localStorage.removeItem("token");
  navigate("/login");
};

const handleChangePassword = async () => {
  try {
    setIsChangingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");

    console.log("ðŸ”„ DÃ©but changement mot de passe...");

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("Tous les champs sont obligatoires");
      return;
    }

    const requestBody = {
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
      confirmPassword: passwordData.confirmPassword
    };

    console.log("ðŸ“¤ Envoi Ã :", `${API_BASE_URL}/api/auth/change-password`);

    // TEST: Essayer d'abord avec la version simplifiÃ©e
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log("ðŸ“¥ RÃ©ponse brute:", response);
      
      if (!response.ok) {
        console.log("âŒ Erreur HTTP:", response.status, response.statusText);
        
        // Essayer POST si PUT Ã©choue
        console.log("ðŸ”„ Essai avec POST...");
        response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });
      }
      
    } catch (fetchError) {
      console.error("âŒ Erreur fetch:", fetchError);
      throw new Error(`Erreur rÃ©seau: ${fetchError.message}`);
    }

    console.log("ðŸ“Š Status final:", response.status, response.statusText);
    
    let data;
    try {
      data = await response.json();
      console.log("ðŸ“‹ DonnÃ©es rÃ©ponse:", data);
    } catch (jsonError) {
      console.error("âŒ Erreur parsing JSON:", jsonError);
      throw new Error("RÃ©ponse invalide du serveur");
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || `Erreur ${response.status}`);
    }

    setPasswordSuccess(data.message || "Mot de passe changÃ© avec succÃ¨s !");
    
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setTimeout(() => {
      setShowChangePassword(false);
      setPasswordSuccess("");
    }, 3000);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue";
    console.error("âŒ Erreur complÃ¨te:", err);
    setPasswordError(message);
  } finally {
    setIsChangingPassword(false);
  }
};

  // Candidatures actives (non ignorÃ©es)
  const candidaturesActives = candidatures.filter(c => !c.ignored);

  // Candidatures pour les onglets principaux
  const candidaturesSpontanees = candidaturesActives.filter(c => 
    c.type === "spontanee" || c.type === "stage_spontane"
  );

  const candidaturesParPostes = candidaturesActives.filter(c => 
    c.type === "emploi" || c.type === "stage" || c.type === "pfe"
  );

  // Candidatures archivÃ©es (acceptÃ©es/refusÃ©es) pour "RÃ©ponses Candidatures"
  const candidaturesArchivees = candidatures.filter((c) => 
    (c.statut === "acceptee" || c.statut === "refusee") && !c.ignored
  );

  // Candidatures ignorÃ©es pour "Archives"
  const candidaturesIgnorees = candidatures.filter((c) => c.ignored);

  // Stats pour les archives
  const statsArchives = {
    total: candidaturesArchivees.length,
    acceptees: candidaturesArchivees.filter((c) => c.statut === "acceptee").length,
    refusees: candidaturesArchivees.filter((c) => c.statut === "refusee").length,
  };

  const statsIgnorees = {
    total: candidaturesIgnorees.length,
  };

  const DisplayDiplome = ({ diplome }: { diplome?: string }) => {
    if (!diplome) {
      return <span className="text-gray-400 italic">Non renseignÃ©</span>;
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
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Total
              </p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {stats.total}
              </p>
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
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                En Attente
              </p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {stats.enAttente}
              </p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <p className="text-xs text-gray-500">Ã€ traiter</p>
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
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                AcceptÃ©es
              </p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {stats.acceptees}
              </p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <p className="text-xs text-gray-500">ValidÃ©es</p>
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
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                RefusÃ©es
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

        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-gray-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                IgnorÃ©es
              </p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {stats.ignorees}
              </p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <p className="text-xs text-gray-500">ArchivÃ©es</p>
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
            {offresFiltrees.length} poste(s) trouvÃ©(s)
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
                : "CrÃ©ez votre premiÃ¨re offre de stage/PFE pour commencer Ã  recevoir des candidatures."}
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
                        <span className="mr-2">ðŸ“…</span>
                        Expire le{" "}
                        {formatDateForDisplay(offre.dateExpiration)}
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
                          AcceptÃ©es: {stats.acceptees}
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-red-400 rounded-full mr-1"></span>
                          RefusÃ©es: {stats.refusees}
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

  const CandidaturesForPoste = ({
    filtreType = "emploi",
  }: {
    filtreType?: "emploi" | "stage";
  }) => {
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
      enAttente: candidaturesPourOffre.filter((c) => c.statut === "en_attente")
        .length,
      acceptees: candidaturesPourOffre.filter((c) => c.statut === "acceptee")
        .length,
      refusees: candidaturesPourOffre.filter((c) => c.statut === "refusee")
        .length,
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
              <h3 className="text-2xl font-bold text-gray-900">
                {selectedOffre.titre}
              </h3>
              <p className="text-gray-600">
                {stats.total} candidature(s){" "}
                {filtreType === "emploi" ? "CDI/CDD" : "Stage/PFE"}
              </p>
            </div>
          </div>

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
              <div className="text-sm text-green-700">AcceptÃ©es</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {stats.refusees}
              </div>
              <div className="text-sm text-red-700">RefusÃ©es</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.total}
              </div>
              <div className="text-sm text-blue-700">Total</div>
            </div>
          </div>
        </div>

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
              <option value="diplome">Trier par diplÃ´me</option>
              <option value="competence">Trier par compÃ©tences</option>
              <option value="experience">Trier par expÃ©rience</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-all duration-200"
            >
              {sortOrder === "asc" ? "â†‘" : "â†“"}
            </button>
          </div>

          <div className="text-sm text-gray-600">
            Affichage de {candidaturesPourOffre.length} candidature(s)
          </div>
        </div>

        {candidaturesPourOffre.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              Aucune candidature
            </h4>
            <p className="text-gray-500 mb-4">
              Aucune candidature n'a Ã©tÃ© trouvÃ©e pour ce poste.
            </p>
            <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
              <p>ðŸ’¡ Debug info:</p>
              <p>Offre ID: {selectedOffre.id}</p>
              <p>Titre: "{selectedOffre.titre}"</p>
              <p>Type: {selectedOffre.type}</p>
              <p>Filtre appliquÃ©: {filtreType}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full table-auto" style={{ tableLayout: 'auto' }}>
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Nom</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">DiplÃ´me</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Score CompÃ©tences</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">ExpÃ©rience</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Date Soumission</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {candidaturesPourOffre.map((cand) => (
                    <tr
                      key={cand.id}
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
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
                        {formatDateForDisplay(cand.dateSoumission)}
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
                          {cand.statut === "en_attente"
                            ? "En attente"
                            : cand.statut === "acceptee"
                            ? "Acceptée"
                            : cand.statut === "refusee"
                            ? "Refusée"
                            : "IgnorÃ©e"}
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

  const ArchivesList = () => {
    return (
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900 text-center">
          Archives
        </h2>

        <div className="text-center mb-8">
          <p className="text-gray-600 text-lg">
            Liste des candidatures que vous avez choisies d'ignorer
          </p>
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 inline-block">
            <p className="text-yellow-800 text-sm">
              <strong>ðŸ’¡ Information :</strong> Ces candidatures ne sont plus visibles dans les autres onglets.
              Vous pouvez les restaurer ou les supprimer dÃ©finitivement.
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
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              Aucune candidature ignorÃ©e
            </h4>
            <p className="text-gray-500">
              Les candidatures que vous ignorez apparaÃ®tront ici.
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
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">DiplÃ´me</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Score</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {candidaturesIgnorees.map((cand) => (
                    <tr
                      key={`${cand.id}-${cand.type}`}
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
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
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        <DisplayDiplome diplome={cand.diplome} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        <DisplayCompetenceScore score={cand.competenceScore} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        {formatDateForDisplay(cand.dateSoumission)}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          IgnorÃ©e
                        </span>
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
                            title="Voir dÃ©tails"
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

{selectedCandidature && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fadeIn">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-2xl font-bold text-gray-800">
          Details de la candidature ignorÃ©e
        </h3>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            IgnorÃ©e
          </span>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto pr-2 max-h-[70vh]">
        <p>
          <strong>Nom :</strong> {selectedCandidature.nom}
        </p>
        <p>
          <strong>Email :</strong> {selectedCandidature.email}
        </p>
        {selectedCandidature.telephone && (
          <p>
            <strong>Telephone :</strong> {selectedCandidature.telephone}
          </p>
        )}
        {selectedCandidature.diplome && (
          <p>
            <strong>Diplome :</strong> {selectedCandidature.diplome}
          </p>
        )}
        {selectedCandidature.experience && (
          <p>
            <strong>Experience :</strong> {selectedCandidature.experience}
          </p>
        )}
        {selectedCandidature.competenceScore && (
          <p>
            <strong>Score de competences :</strong> {selectedCandidature.competenceScore}%
          </p>
        )}
        <p>
          <strong>Date de soumission :</strong>{" "}
          {formatDateForDisplay(selectedCandidature.dateSoumission)}
        </p>
        <p>
          <strong>Type :</strong>
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
            <strong>CV :</strong>{" "}
            <a
              href={getFileUrl(selectedCandidature.cvUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center space-x-1"
            >
              <FileText className="h-4 w-4" />
              <span>TÃ©lÃ©charger le CV</span>
            </a>
          </p>
        )}

        {selectedCandidature.lettreMotivationUrl && (
          <p>
            <strong>Lettre de motivation :</strong>{" "}
            <a
              href={getFileUrl(selectedCandidature.lettreMotivationUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center space-x-1"
            >
              <FileText className="h-4 w-4" />
              <span>TÃ©lÃ©charger la lettre</span>
            </a>
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={() => restaurerCandidature(selectedCandidature)}
          className="flex items-center space-x-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Restaurer</span>
        </button>
        <button
          onClick={() => changerStatut(selectedCandidature, "ignorer")}
          className="flex items-center space-x-2 px-5 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all font-medium"
        >
          <Ban className="h-4 w-4" />
          <span>Ignorer</span>
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
    );
  };

  const ReponsesCandidaturesList = () => {
    // CORRECTION : Utiliser toutes les candidatures pour les rÃ©ponses
    const candidaturesArchivees = candidatures.filter((c) => 
      (c.statut === "acceptee" || c.statut === "refusee") && !c.ignored
    );

    const candidaturesFiltreesArchive =
      archiveFilter === "tous"
        ? candidaturesArchivees
        : archiveFilter === "acceptees"
        ? candidaturesArchivees.filter((c) => c.statut === "acceptee")
        : candidaturesArchivees.filter((c) => c.statut === "refusee");

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

    return (
      <section className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            RÃ©ponses Candidatures
          </h2>
          <p className="text-gray-600 text-lg">
            Consultation des candidatures dÃ©jÃ  traitÃ©es (acceptÃ©es/refusÃ©es)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <Archive className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-900">
              {statsArchives.total}
            </h3>
            <p className="text-gray-600">Total traitÃ©</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-900">
              {statsArchives.acceptees}
            </h3>
            <p className="text-gray-600">Candidatures acceptÃ©es</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-gray-900">
              {statsArchives.refusees}
            </h3>
            <p className="text-gray-600">Candidatures refusÃ©es</p>
          </div>
        </div>

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
                  <option value="tous">Toutes les rÃ©ponses</option>
                  <option value="acceptees">Candidatures acceptÃ©es</option>
                  <option value="refusees">Candidatures refusÃ©es</option>
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
              {candidaturesRecherchees.length} candidature(s) trouvÃ©e(s)
            </div>
          </div>
        </div>

        {loadingCandidatures ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des rÃ©ponses...</p>
          </div>
        ) : candidaturesRecherchees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <Archive className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              {searchArchive
                ? "Aucun résultat trouvé"
                : "Aucune rÃ©ponse de candidature"}
            </h4>
            <p className="text-gray-500">
              {searchArchive
                ? "Aucune candidature ne correspond à votre recherche."
                : "Les candidatures acceptÃ©es ou refusÃ©es apparaÃ®tront ici."}
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
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">DiplÃ´me</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Score</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {candidaturesRecherchees.map((cand) => (
                    <tr
                      key={`${cand.id}-${cand.type}`}
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
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
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        <DisplayDiplome diplome={cand.diplome} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        <DisplayCompetenceScore score={cand.competenceScore} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        {formatDateForDisplay(cand.dateSoumission)}
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
                          {cand.statut === "acceptee"
                            ? "Acceptée"
                            : cand.statut === "refusee"
                            ? "Refusée"
                            : "IgnorÃ©e"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedCandidature(cand)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="Voir dÃ©tails"
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

        {selectedCandidature && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fadeIn">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-2xl font-bold text-gray-800">
                  Details de la candidature traitÃ©e
                </h3>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedCandidature.statut === "acceptee"
                        ? "bg-green-100 text-green-800"
                        : selectedCandidature.statut === "refusee"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {selectedCandidature.statut === "acceptee"
                      ? "Acceptée"
                      : selectedCandidature.statut === "refusee"
                      ? "Refusée"
                      : "IgnorÃ©e"}
                  </span>
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto pr-2 max-h-[70vh]">
                <p>
                  <strong>Nom :</strong> {selectedCandidature.nom}
                </p>
                <p>
                  <strong>Email :</strong> {selectedCandidature.email}
                </p>
                {selectedCandidature.telephone && (
                  <p>
                    <strong>Telephone :</strong>{" "}
                    {selectedCandidature.telephone}
                  </p>
                )}
                {selectedCandidature.diplome && (
                  <p>
                    <strong>Diplome :</strong>{" "}
                    {selectedCandidature.diplome}
                  </p>
                )}
                {selectedCandidature.experience && (
                  <p>
                    <strong>Experience :</strong>{" "}
                    {selectedCandidature.experience}
                  </p>
                )}
                {selectedCandidature.competenceScore && (
                  <p>
                    <strong>Score de competences :</strong>{" "}
                    {selectedCandidature.competenceScore}%
                  </p>
                )}
                <p>
                  <strong>Date de soumission :</strong>{" "}
                  {formatDateForDisplay(selectedCandidature.dateSoumission)}
                </p>
                <p>
                  <strong>Type :</strong>
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
                    <strong>CV :</strong>{" "}
                    <a
                      href={getFileUrl(selectedCandidature.cvUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <FileText className="h-4 w-4" />
                      <span>TÃ©lÃ©charger le CV</span>
                    </a>
                  </p>
                )}

                {selectedCandidature.lettreMotivationUrl && (
                  <p>
                    <strong>Lettre de motivation :</strong>{" "}
                    <a
                      href={getFileUrl(
                        selectedCandidature.lettreMotivationUrl
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <FileText className="h-4 w-4" />
                      <span>TÃ©lÃ©charger la lettre</span>
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
    );
  };

  const getCandidatureStats = (offreId: number) => {
    const candidaturesOffre = candidaturesParPostes.filter((c) => {
      return c.offre_id === offreId;
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
            <button
              onClick={() => setShowChangePassword(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200 font-medium shadow-sm"
            >
              <Key className="h-5 w-5" />
              <span>Changer Mot de Passe</span>
            </button>

            <Link
              to="/timesheet/saisie"
              className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all duration-200 font-medium shadow-sm"
            >
              Saisie Temps
            </Link>

            <Link
              to="/"
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200 font-medium shadow-sm"
            >
              Accueil
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 font-medium shadow-sm"
            >
              <LogOut className="h-5 w-5" />
              <span>DÃ©connexion</span>
            </button>
          </div>
        </div>
      </header>

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
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 relative ${
              activeTab === "candidatures"
                ? "bg-yellow-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <Users className="h-5 w-5" />
            <span>Candidatures SpontanÃ©es - Stage/PFE</span>
            {notificationCounts.candidatures > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {notificationCounts.candidatures}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("candidatures-postes")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 relative ${
              activeTab === "candidatures-postes"
                ? "bg-yellow-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
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
            onClick={() => setActiveTab("reponses-candidatures")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 relative ${
              activeTab === "reponses-candidatures"
                ? "bg-yellow-500 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
          >
            <CheckCircle className="h-5 w-5" />
            <span>RÃ©ponses Candidatures</span>
            {statsArchives.total > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                {statsArchives.total}
              </span>
            )}
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

        {(activeTab === "candidatures" ||
          activeTab === "candidatures-postes") && <StatsOverview />}

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
                    placeholder="Ex: DÃ©veloppeur Full Stack"
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
                    placeholder="Description dÃ©taillÃ©e de l'offre..."
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exigences du poste
                  </label>

                  {editingOffre ? (
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
                            } (ex: DiplÃ´me en gÃ©nie informatique, 3+ ans d'expÃ©rience...)`}
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
                            } (ex: DiplÃ´me en gÃ©nie informatique, 3+ ans d'expÃ©rience...)`}
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
                    Chaque exigence sera stockÃ©e individuellement et pourra Ãªtre
                    utilisÃ©e pour le matching avec les candidats.
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
                      <tr
                        key={offre.id}
                        className="hover:bg-gray-50 transition-colors duration-200"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 text-sm whitespace-nowrap">{offre.titre}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">{offre.type}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">{offre.localisation}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">{offre.salaire || "N/A"}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                          {formatDateForDisplay(offre.dateExpiration)}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              offre.statut === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
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
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Gestion des Candidatures SpontanÃ©es & Stage/PFE
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
                <option value="tous">Toutes les candidatures spontanÃ©es</option>
                <option value="stage_spontane">Stages/PFE SpontanÃ©s</option>
                <option value="spontanee">
                  Candidatures spontanÃ©es gÃ©nÃ©rales
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
                  <option value="diplome">Trier par diplÃ´me</option>
                  <option value="competence">Trier par compÃ©tences</option>
                  <option value="experience">Trier par expÃ©rience</option>
                </select>
                <button
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="p-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-all duration-200"
                >
                  {sortOrder === "asc" ? "â†‘" : "â†“"}
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
                Chargement des candidatures spontanÃ©es...
              </div>
            )}

            {["stage_spontane", "spontanee"].map((type) => {
              if (filterType !== "tous" && filterType !== type) return null;

              const candidaturesByType = candidaturesSpontanees.filter((c) => 
                type === "stage_spontane" ? c.type === "stage_spontane" : c.type === "spontanee"
              );

              const sortedCandidatures = getSortedCandidatures(
                candidaturesByType,
                sortBy,
                sortOrder
              );

              return (
                <div
                  key={type}
                  className="bg-white rounded-xl shadow-lg overflow-hidden mb-6 w-full"
                >
                  <h3 className="text-lg font-semibold text-gray-700 bg-gray-100 px-6 py-3 capitalize">
                    {type === "stage_spontane"
                      ? "Candidatures Spontanées Stage/PFE"
                      : "Candidatures SpontanÃ©es GÃ©nÃ©rales"}{ " "}
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
                          : "spontanÃ©e gÃ©nÃ©rale"}
                      </h4>
                      <p className="text-gray-500">
                        {type === "stage_spontane"
                          ? "Aucune candidature spontanée de stage ou PFE n'a été reçue pour le moment."
                          : "Aucune candidature spontanÃ©e gÃ©nÃ©rale n'a Ã©tÃ© reÃ§ue pour le moment."}
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
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">DiplÃ´me</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Score CompÃ©tences</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">ExpÃ©rience</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Date Soumission</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Statut</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                          {sortedCandidatures.map((cand) => (
                            <tr
                              key={cand.id}
                              className="hover:bg-gray-50 transition-colors duration-200"
                            >
                              <td className="px-4 py-3 font-medium text-gray-900 text-sm whitespace-nowrap capitalize flex items-center space-x-2">
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
                                    ? "Candidature"
                                    : cand.type}
                                </span>
                              </td>
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
                                {formatDateForDisplay(cand.dateSoumission)}
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
                                  {cand.statut === "en_attente"
                                    ? "En attente"
                                    : cand.statut === "acceptee"
                                    ? "Acceptée"
                                    : cand.statut === "refusee"
                                    ? "Refusée"
                                    : "IgnorÃ©e"}
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

            {selectedCandidature && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fadeIn">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-2xl font-bold text-gray-800">
                      Details de la candidature
                    </h3>
                  </div>

                  <div className="space-y-3 overflow-y-auto pr-2 max-h-[70vh] custom-scrollbar">
                    <p>
                      <strong>Nom :</strong> {selectedCandidature.nom}
                    </p>
                    <p>
                      <strong>Email :</strong> {selectedCandidature.email}
                    </p>
                    {selectedCandidature.telephone && (
                      <p>
                        <strong>Telephone :</strong>{" "}
                        {selectedCandidature.telephone}
                      </p>
                    )}
                    {selectedCandidature.diplome && (
                      <p>
                        <strong>Diplome :</strong>{" "}
                        {selectedCandidature.diplome}
                      </p>
                    )}
                    {selectedCandidature.experience && (
                      <p>
                        <strong>Experience :</strong>{" "}
                        {selectedCandidature.experience}
                      </p>
                    )}
                    {selectedCandidature.competenceScore && (
                      <p>
                        <strong>Score de competences :</strong>{" "}
                        {selectedCandidature.competenceScore}%
                      </p>
                    )}
                    <p>
                      <strong>Date de soumission :</strong>{" "}
                      {formatDateForDisplay(selectedCandidature.dateSoumission)}
                    </p>

                    <p>
                      <strong>Type de candidature :</strong>
                      <span
                        className={`ml-2 px-2 py-1 rounded-full text-xs ${
                          selectedCandidature.type === "stage_spontane"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {selectedCandidature.type === "stage_spontane"
                          ? "Stage/PFE spontane
                          : "Spontanee generale"}
                      </span>
                    </p>

                    {selectedCandidature.cvUrl && (
                      <p>
                        <strong>CV :</strong>{" "}
                        <a
                          href={getFileUrl(selectedCandidature.cvUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Telecharger le CV (PDF)</span>
                        </a>
                      </p>
                    )}

                    {selectedCandidature.lettreMotivationUrl && (
                      <p>
                        <strong>Lettre de motivation :</strong>{" "}
                        <a
                          href={getFileUrl(
                            selectedCandidature.lettreMotivationUrl
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Telecharger la lettre de motivation (PDF)</span>
                        </a>
                      </p>
                    )}

                    {selectedCandidature.motivation &&
                      !selectedCandidature.lettreMotivationUrl && (
                        <div className="bg-gray-50 p-3 rounded-lg border text-sm text-gray-700 max-h-40 overflow-y-auto">
                          <strong>Lettre de motivation :</strong>
                          <p className="whitespace-pre-wrap mt-1">
                            {selectedCandidature.motivation}
                          </p>
                        </div>
                      )}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
          onClick={() => changerStatut(selectedCandidature, "ignorer")}
          className="flex items-center space-x-2 px-5 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all font-medium"
        >
          <Ban className="h-4 w-4" />
          <span>Ignorer</span>
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
              Gestion des Candidatures par Postes
            </h2>

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

            {viewMode === "postes" && (
              <PostesList filtreType={ongletCandidatures} />
            )}
            {viewMode === "candidatures" && selectedOffre && (
              <CandidaturesForPoste filtreType={ongletCandidatures} />
            )}

            {selectedCandidature && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fadeIn">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-2xl font-bold text-gray-800">
                      Details de la candidature
                      <span className="text-blue-600 font-semibold">
                        {" "}
                        â€” {selectedCandidature.poste || "Poste"}
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
                      <strong>Nom :</strong> {selectedCandidature.nom}
                    </p>
                    <p>
                      <strong>Email :</strong> {selectedCandidature.email}
                    </p>
                    {selectedCandidature.telephone && (
                      <p>
                        <strong>Telephone :</strong>{" "}
                        {selectedCandidature.telephone}
                      </p>
                    )}

                    <p>
                      <strong>Type :</strong>
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
                          <strong>Experience :</strong>{" "}
                          {selectedCandidature.experience}
                        </p>
                      )}

                    {(selectedCandidature.type === "stage" ||
                      selectedCandidature.type === "pfe") &&
                      selectedCandidature.diplome && (
                        <p>
                          <strong>Diplome/Niveau :</strong>{" "}
                          {selectedCandidature.diplome}
                        </p>
                      )}

                    {selectedCandidature.diplome &&
                      selectedCandidature.type === "emploi" && (
                        <p>
                          <strong>Diplome :</strong>{" "}
                          {selectedCandidature.diplome}
                        </p>
                      )}

                    {selectedCandidature.competenceScore && (
                      <p>
                        <strong>Score de competences :</strong>{" "}
                        {selectedCandidature.competenceScore}%
                      </p>
                    )}
                    <p>
                      <strong>Date de soumission :</strong>{" "}
                      {formatDateForDisplay(selectedCandidature.dateSoumission)}
                    </p>

                    {selectedCandidature.cvUrl && (
                      <p>
                        <strong>CV :</strong>{" "}
                        <a
                          href={getFileUrl(selectedCandidature.cvUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Telecharger le CV (PDF)</span>
                        </a>
                      </p>
                    )}

                    {selectedCandidature.lettreMotivationUrl && (
                      <p>
                        <strong>Lettre de motivation :</strong>{" "}
                        <a
                          href={getFileUrl(
                            selectedCandidature.lettreMotivationUrl
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Telecharger la lettre de motivation (PDF)</span>
                        </a>
                      </p>
                    )}

                    {selectedCandidature.motivation &&
                      !selectedCandidature.lettreMotivationUrl && (
                        <div className="bg-gray-50 p-3 rounded-lg border text-sm text-gray-700 max-h-40 overflow-y-auto">
                          <strong>Lettre de motivation :</strong>
                          <p className="whitespace-pre-wrap mt-1">
                            {selectedCandidature.motivation}
                          </p>
                        </div>
                      )}

                    {selectedCandidature.domaine && (
                      <p>
                        <strong>ðŸŒ Domaine :</strong>{" "}
                        {selectedCandidature.domaine}
                      </p>
                    )}

                    {(selectedCandidature.type === "stage" ||
                      selectedCandidature.type === "pfe") &&
                      selectedCandidature.duree && (
                        <p>
                          <strong>â±ï¸ DurÃ©e :</strong>{" "}
                          {selectedCandidature.duree}
                        </p>
                      )}

                    <p>
                      <strong>Type de candidature :</strong>
                      <span
                        className={`ml-1 px-2 py-1 rounded-full text-xs ${
                          selectedCandidature.offreId
                            ? "bg-purple-100 text-purple-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {selectedCandidature.offreId
                          ? "Sur offre spécifique"
                          : "Candidature spontanÃ©e"}
                      </span>
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                                       <button
          onClick={() => changerStatut(selectedCandidature, "ignorer")}
          className="flex items-center space-x-2 px-5 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all font-medium"
        >
          <Ban className="h-4 w-4" />
          <span>Ignorer</span>
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

        {activeTab === "archives" && <ArchivesList />}

        {activeTab === "reponses-candidatures" && <ReponsesCandidaturesList />}
      </div>
    </div>
  );
};

export default Dashboard;
