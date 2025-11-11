// ============================================================
// Fichier : /components/Dashboard.tsx
// Description : Composant principal du Dashboard de gestion RH/Offres.
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Search,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// 1) Base API et Helpers URL / Fetch
// ────────────────────────────────────────────────────────────
const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL ||
  "https://c4e-website-back.onrender.com"; // fallback prod

// Construit une URL sûre sans doubles slash et gère les chemins relatifs
const buildUrl = (path: string) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(p, API_BASE_URL).toString(); // normalisation sûre
};

// Un petit wrapper fetch standardisé (avec gestion token, JSON et erreurs)
async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {},
  token?: string | null
): Promise<{ ok: boolean; status: number; json: T | null; res: Response }> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(buildUrl(path), { ...init, headers });
  let data: any = null;
  try {
    // On essaie de parser du JSON si possible
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, json: data, res };
}

// Normalise toute URL de fichier : remplace localhost par API_BASE_URL si présent
const normalizeFileUrl = (filePath?: string): string | null => {
  if (!filePath) return null;
  try {
    // Si c’est déjà une URL absolue :
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      const u = new URL(filePath);
      // Remap si host = localhost / 127.0.0.1
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        return buildUrl(u.pathname + u.search + u.hash);
      }
      return u.toString();
    }
    // Sinon, on construit par rapport à l’API
    return buildUrl(filePath);
  } catch {
    // En cas d’URL bizarre, on tente un fallback propre
    return buildUrl(filePath.startsWith("/") ? filePath : `/${filePath}`);
  }
};

// ────────────────────────────────────────────────────────────
// 2) Types
// ────────────────────────────────────────────────────────────
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
  email: string;
  cvUrl?: string;
  lettreMotivationUrl?: string;
  offreId?: number; // legacy éventuel
  offre_id?: number; // champ BD
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

// ────────────────────────────────────────────────────────────
// 3) Utils métier
// ────────────────────────────────────────────────────────────
function getSortedCandidatures(
  candidatures: Candidature[],
  sortBy: "date" | "diplome" | "competence" | "experience",
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
        valA = diplomeOrder[a.diplome?.toLowerCase() || ""] || 0;
        valB = diplomeOrder[b.diplome?.toLowerCase() || ""] || 0;
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

// ────────────────────────────────────────────────────────────
// 4) Composant
// ────────────────────────────────────────────────────────────
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
    "tous" | "acceptees" | "refusees"
  >("tous");
  const [searchArchive, setSearchArchive] = useState("");

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // Chargement Offres
  useEffect(() => {
    const fetchOffres = async () => {
      try {
        setLoadingOffres(true);
        setErrorOffres("");
        const { ok, json, status } = await apiFetch<ApiOffre[]>(
          "/api/offres",
          { method: "GET" },
          token
        );
        if (!ok || !json)
          throw new Error(`Erreur chargement offres (HTTP ${status})`);
        const data = json as ApiOffre[];
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
      } catch (err: any) {
        setErrorOffres(err?.message || "Erreur connexion backend.");
      } finally {
        setLoadingOffres(false);
      }
    };
    if (activeTab === "offres" || activeTab === "candidatures-postes")
      fetchOffres();
  }, [activeTab, token]);

  // Chargement Candidatures (selon onglet)
  useEffect(() => {
    const fetchCandidatures = async () => {
      try {
        setLoadingCandidatures(true);
        setErrorCandidatures("");

        if (activeTab === "candidatures") {
          // Candidatures spontanées uniquement
          const { ok, json, status } = await apiFetch<Candidature[]>(
            "/api/candidatures/spontanees/toutes",
            { method: "GET" },
            token
          );
          if (!ok || !json)
            throw new Error(`Erreur chargement (HTTP ${status})`);
          setCandidatures(json);
        } else if (activeTab === "candidatures-postes") {
          // Charger tout puis filtrer vers emploi/stage/pfe
          const { ok, json, status } = await apiFetch<Candidature[]>(
            "/api/candidatures",
            { method: "GET" },
            token
          );
          if (!ok || !json)
            throw new Error(`Erreur chargement (HTTP ${status})`);
          const candidaturesSurOffres = json.filter(
            (c) => c.type === "emploi" || c.type === "stage" || c.type === "pfe"
          );
          setCandidatures(candidaturesSurOffres);
        } else if (activeTab === "archives") {
          const { ok, json, status } = await apiFetch<Candidature[]>(
            "/api/candidatures",
            { method: "GET" },
            token
          );
          if (!ok || !json)
            throw new Error(`Erreur chargement (HTTP ${status})`);
          setCandidatures(json);
        }
      } catch (err: any) {
        setErrorCandidatures(err?.message || "Erreur connexion backend.");
      } finally {
        setLoadingCandidatures(false);
      }
    };

    if (
      ["candidatures", "candidatures-postes", "archives"].includes(activeTab)
    ) {
      fetchCandidatures();
    }
  }, [activeTab, token]);

  // Gestion exigences (création/édition)
  const ajouterChampExigence = () => setExigencesFields((x) => [...x, ""]);
  const supprimerChampExigence = (index: number) =>
    setExigencesFields((x) =>
      x.length > 1 ? x.filter((_, i) => i !== index) : x
    );
  const mettreAJourChampExigence = (index: number, valeur: string) =>
    setExigencesFields((x) => x.map((v, i) => (i === index ? valeur : v)));

  const ajouterChampExigenceEdit = () => setEditingExigences((x) => [...x, ""]);
  const supprimerChampExigenceEdit = (index: number) =>
    setEditingExigences((x) =>
      x.length > 1 ? x.filter((_, i) => i !== index) : x
    );
  const mettreAJourChampExigenceEdit = (index: number, valeur: string) =>
    setEditingExigences((x) => x.map((v, i) => (i === index ? valeur : v)));

  const handleEditClick = (offre: OffreEmploi) => {
    setEditingOffre(offre);
    setEditingExigences(
      offre.exigences.length > 0 ? [...offre.exigences] : [""]
    );
  };

  // CRUD Offres
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
      const payload = {
        ...nouvelleOffre,
        date_expiration: nouvelleOffre.dateExpiration,
        exigences: exigencesArray,
      };
      const { ok, json, status } = await apiFetch<{ offre: any }>(
        "/api/offres",
        { method: "POST", body: JSON.stringify(payload) },
        token
      );
      if (!ok || !json) throw new Error(`Erreur ajout offre (HTTP ${status})`);
      const newOffreData = json.offre;
      const newOffre: OffreEmploi = {
        id: newOffreData.id,
        titre: newOffreData.titre,
        description: newOffreData.description,
        salaire: newOffreData.salaire,
        dateExpiration: newOffreData.date_expiration,
        statut: newOffreData.statut ?? "active",
        type: newOffreData.type,
        localisation: newOffreData.localisation,
        exigences: newOffreData.exigences || [],
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
    } catch (err: any) {
      setErrorOffres(err?.message || "Erreur connexion backend.");
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
      const payload = {
        titre: offre.titre,
        description: offre.description,
        salaire: offre.salaire || null,
        date_expiration: offre.dateExpiration,
        type: offre.type,
        localisation: offre.localisation,
        exigences: exigencesArray,
        statut: offre.statut,
      };
      const { ok, status } = await apiFetch(
        `/api/offres/${offre.id}`,
        { method: "PUT", body: JSON.stringify(payload) },
        token
      );
      if (!ok) throw new Error(`Erreur modification offre (HTTP ${status})`);
      setOffres((prev) =>
        prev.map((o) =>
          o.id === offre.id ? { ...offre, exigences: exigencesArray } : o
        )
      );
      setEditingOffre(null);
      setEditingExigences([""]);
      setErrorOffres("");
    } catch (err: any) {
      setErrorOffres(err?.message || "Erreur connexion backend.");
    }
  };

  const supprimerOffre = async (id: number) => {
    if (!window.confirm("Confirmer la suppression ?")) return;
    try {
      const { ok, status } = await apiFetch(
        `/api/offres/${id}`,
        { method: "DELETE" },
        token
      );
      if (!ok) throw new Error(`Erreur suppression offre (HTTP ${status})`);
      setOffres((prev) => prev.filter((o) => o.id !== id));
    } catch (err: any) {
      setErrorOffres(err?.message || "Erreur connexion backend.");
    }
  };

  // Suppression candidature (tous types)
  const supprimerCandidature = async (candidature: Candidature) => {
    if (
      !window.confirm(
        `Confirmer la suppression de la candidature de ${candidature.nom} ?`
      )
    )
      return;
    try {
      const { id, type } = candidature;
      const { ok, status } = await apiFetch(
        `/api/candidatures/${type}/${id}`,
        { method: "DELETE" },
        token
      );
      if (!ok) throw new Error(`Erreur suppression (HTTP ${status})`);
      setCandidatures((prev) =>
        prev.filter((c) => !(c.id === id && c.type === type))
      );
      if (selectedCandidature?.id === id && selectedCandidature?.type === type)
        setSelectedCandidature(null);
    } catch (err: any) {
      setErrorCandidatures(`Échec: ${err?.message || "Erreur inconnue"}`);
    }
  };

  // Changer statut
  const changerStatut = async (
    candidature: Candidature,
    statut: Candidature["statut"]
  ) => {
    try {
      const { id, type } = candidature;
      // Optimistic UI
      setCandidatures((prev) =>
        prev.map((c) => (c.id === id && c.type === type ? { ...c, statut } : c))
      );

      let typeAPI: Candidature["type"] | "stage" = type;
      if (type === "stage_spontane") typeAPI = "stage"; // mapping côté API

      const { ok, status } = await apiFetch(
        `/api/candidatures/statut/${typeAPI}/${id}`,
        { method: "PUT", body: JSON.stringify({ statut }) },
        token
      );

      if (!ok) throw new Error(`Erreur mise à jour (HTTP ${status})`);
    } catch (err: any) {
      setErrorCandidatures(`Échec: ${err?.message || "Erreur inconnue"}`);
      // rollback pragmatique : recharger rapidement la liste
      (async () => {
        try {
          const { ok, json } = await apiFetch<Candidature[]>(
            "/api/candidatures",
            { method: "GET" },
            token
          );
          if (ok && json) {
            const normalized = json.map((c) => ({
              ...c,
              offreId: c.offreId || c.offre_id,
            }));
            setCandidatures(normalized);
          }
        } catch {}
      })();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // ────────────────────────────────────────────────────────────
  // 5) Sélecteurs / Stats / UI helpers
  // ────────────────────────────────────────────────────────────
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
      (c.nom || "").toLowerCase().includes(searchArchive.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(searchArchive.toLowerCase()) ||
      (c.poste || "").toLowerCase().includes(searchArchive.toLowerCase())
  );

  const statsArchives = {
    total: candidaturesArchivees.length,
    acceptees: candidaturesArchivees.filter((c) => c.statut === "acceptee")
      .length,
    refusees: candidaturesArchivees.filter((c) => c.statut === "refusee")
      .length,
  };

  const DisplayDiplome = ({ diplome }: { diplome?: string }) =>
    !diplome ? (
      <span className="text-gray-400 italic">Non renseigné</span>
    ) : (
      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
        {diplome}
      </span>
    );

  const DisplayCompetenceScore = ({ score }: { score?: number }) =>
    !score ? (
      <span className="text-gray-400 italic">N/A</span>
    ) : (
      <div className="flex items-center space-x-2">
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full"
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
        <span className="text-sm font-medium">{score}%</span>
      </div>
    );

  const DisplayExperience = ({ experience }: { experience?: string }) =>
    !experience || experience === "0" ? (
      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
        0
      </span>
    ) : (
      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
        {experience}
      </span>
    );

  const getCandidatureStats = (offreId: number) => {
    const candidaturesOffre = candidatures.filter(
      (c) => c.offre_id === offreId
    );
    return {
      total: candidaturesOffre.length,
      enAttente: candidaturesOffre.filter((c) => c.statut === "en_attente")
        .length,
      acceptees: candidaturesOffre.filter((c) => c.statut === "acceptee")
        .length,
      refusees: candidaturesOffre.filter((c) => c.statut === "refusee").length,
    };
  };

  // ────────────────────────────────────────────────────────────
  // 6) Rendu (UI inchangé sauf appels corrigés & getFileUrl→normalizeFileUrl)
  // ────────────────────────────────────────────────────────────

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
            <img
              src="/logo.png"
              alt="Logo C4E Africa"
              className="h-10 w-10 rounded-full shadow-md"
            />

            <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Dashboard Gestionnaire
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 font-medium shadow-sm"
          >
            <LogOut className="h-5 w-5" />

            <span>Déconnexion</span>
          </button>
        </div>
      </header>

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
