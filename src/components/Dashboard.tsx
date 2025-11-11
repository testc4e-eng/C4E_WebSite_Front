// ============================================================
// Fichier : /components/Dashboard.tsx
// Description : Composant principal du Dashboard de gestion RH/Offres.
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Plus, Edit, Trash2, Eye, Users, Briefcase, Book, Mail,
  Filter, ArrowLeft, UserCheck, FileText, Archive, CheckCircle, XCircle, Clock, Search
} from "lucide-react";
import api from "../lib/api";

// -------------------- Types --------------------
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

// -------------------- Constantes --------------------
const diplomeOrder: Record<string, number> = {
  technicien: 1, licence: 2, master: 3, master_ingenieur: 3, "cycle d'ingénieur": 3,
  ingenieur: 3, doctorat: 4, bac: 0, bts: 1, dut: 1,
};

const getFileUrl = (filePath?: string) => api.fileUrl(filePath);

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

// ============================================================
const Dashboard = () => {
  const navigate = useNavigate();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [activeTab, setActiveTab] = useState<"offres" | "candidatures" | "candidatures-postes" | "archives">("offres");
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
  const [filterType, setFilterType] = useState<"tous" | "stage_spontane" | "spontanee">("tous");
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "diplome" | "competence" | "experience">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [viewMode, setViewMode] = useState<"postes" | "candidatures">("postes");
  const [selectedOffre, setSelectedOffre] = useState<OffreEmploi | null>(null);
  const [ongletCandidatures, setOngletCandidatures] = useState<"emploi" | "stage">("emploi");

  const [exigencesFields, setExigencesFields] = useState<string[]>([""]);
  const [editingExigences, setEditingExigences] = useState<string[]>([""]);

  const [archiveFilter, setArchiveFilter] = useState<"tous" | "acceptees" | "refusees">("tous");
  const [searchArchive, setSearchArchive] = useState("");

  // Auth guard
  useEffect(() => { if (!token) navigate("/login"); }, [token, navigate]);

  // Chargement des offres
  useEffect(() => {
    const fetchOffres = async () => {
      try {
        setLoadingOffres(true);
        setErrorOffres("");
        const { data } = await api.get<ApiOffre[]>("/api/offres", token);
        const mapped = (data || []).map(o => ({
          id: o.id, titre: o.titre, description: o.description, salaire: o.salaire,
          dateExpiration: o.date_expiration, statut: o.statut, type: o.type,
          localisation: o.localisation, exigences: o.exigences || [],
        }));
        setOffres(mapped);
      } catch (err: any) {
        setErrorOffres(err?.message || "Erreur connexion backend.");
      } finally {
        setLoadingOffres(false);
      }
    };
    if (activeTab === "offres" || activeTab === "candidatures-postes") fetchOffres();
  }, [activeTab, token]);

  // Chargement des candidatures
  useEffect(() => {
    const fetchCandidatures = async () => {
      try {
        setLoadingCandidatures(true);
        setErrorCandidatures("");
        if (activeTab === "candidatures") {
          const { data } = await api.get<Candidature[]>("/api/candidatures/spontanees/toutes", token);
          setCandidatures(data || []);
        } else if (activeTab === "candidatures-postes" || activeTab === "archives") {
          const { data } = await api.get<Candidature[]>("/api/candidatures", token);
          const filtrées =
            activeTab === "candidatures-postes"
              ? (data || []).filter(c => c.type === "emploi" || c.type === "stage" || c.type === "pfe")
              : data || [];
          setCandidatures(filtrées);
        }
      } catch (err: any) {
        setErrorCandidatures(err?.message || "Erreur connexion backend.");
      } finally {
        setLoadingCandidatures(false);
      }
    };
    if (["candidatures", "candidatures-postes", "archives"].includes(activeTab)) {
      fetchCandidatures();
    }
  }, [activeTab, token]);

  // Exigences dynamiques (création et édition)
  const ajouterChampExigence = () => setExigencesFields(prev => [...prev, ""]);
  const supprimerChampExigence = (index: number) => {
    if (exigencesFields.length > 1) setExigencesFields(exigencesFields.filter((_, i) => i !== index));
  };
  const mettreAJourChampExigence = (index: number, valeur: string) => {
    const copie = [...exigencesFields]; copie[index] = valeur; setExigencesFields(copie);
  };
  const ajouterChampExigenceEdit = () => setEditingExigences(prev => [...prev, ""]);
  const supprimerChampExigenceEdit = (index: number) => {
    if (editingExigences.length > 1) setEditingExigences(editingExigences.filter((_, i) => i !== index));
  };
  const mettreAJourChampExigenceEdit = (index: number, valeur: string) => {
    const copie = [...editingExigences]; copie[index] = valeur; setEditingExigences(copie);
  };

  const handleEditClick = (offre: OffreEmploi) => {
    setEditingOffre(offre);
    setEditingExigences(offre.exigences.length > 0 ? [...offre.exigences] : [""]);
  };

  // CRUD Offres
  const ajouterOffre = async () => {
    if (!nouvelleOffre.titre || !nouvelleOffre.description || !nouvelleOffre.dateExpiration || !nouvelleOffre.localisation) {
      setErrorOffres("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    try {
      const exigencesArray = exigencesFields.filter(req => req.trim() !== "");
      const { data: newOffreData }: any = await api.post("/api/offres", token, {
        ...nouvelleOffre,
        date_expiration: nouvelleOffre.dateExpiration,
        exigences: exigencesArray,
      });
      const newOffre: OffreEmploi = {
        id: newOffreData.offre.id, titre: newOffreData.offre.titre,
        description: newOffreData.offre.description, salaire: newOffreData.offre.salaire,
        dateExpiration: newOffreData.offre.date_expiration, statut: "active",
        type: newOffreData.offre.type, localisation: newOffreData.offre.localisation,
        exigences: newOffreData.offre.exigences,
      };
      setOffres(prev => [...prev, newOffre]);
      setNouvelleOffre({ titre: "", description: "", salaire: "", dateExpiration: "", type: "CDI", localisation: "" });
      setExigencesFields([""]);
      setErrorOffres("");
    } catch (err: any) {
      setErrorOffres(err?.message || "Erreur connexion backend.");
    }
  };

  const modifierOffre = async (offre: OffreEmploi) => {
    if (!offre.titre || !offre.description || !offre.dateExpiration || !offre.localisation) {
      setErrorOffres("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    try {
      const exigencesArray = editingExigences.filter(req => req.trim() !== "");
      await api.put(`/api/offres/${offre.id}`, token, {
        titre: offre.titre, description: offre.description,
        salaire: offre.salaire || null, date_expiration: offre.dateExpiration,
        type: offre.type, localisation: offre.localisation,
        exigences: exigencesArray, statut: offre.statut,
      });
      setOffres(prev => prev.map(o => (o.id === offre.id ? { ...offre, exigences: exigencesArray } : o)));
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
      await api.delete(`/api/offres/${id}`, token);
      setOffres(prev => prev.filter(o => o.id !== id));
    } catch (err: any) {
      setErrorOffres(err?.message || "Erreur connexion backend.");
    }
  };

  // Actions sur les candidatures
  const supprimerCandidature = async (candidature: Candidature) => {
    if (!window.confirm(`Confirmer la suppression de la candidature de ${candidature.nom} ?`)) return;
    try {
      await api.delete(`/api/candidatures/${candidature.type}/${candidature.id}`, token);
      setCandidatures(prev => prev.filter(c => !(c.id === candidature.id && c.type === candidature.type)));
      if (selectedCandidature?.id === candidature.id && selectedCandidature?.type === candidature.type) {
        setSelectedCandidature(null);
      }
    } catch (err: any) {
      setErrorCandidatures(`Échec: ${err?.message || "Erreur inconnue"}`);
    }
  };

  const changerStatut = async (candidature: Candidature, statut: Candidature["statut"]) => {
    try {
      setCandidatures(prev =>
        prev.map(c => c.id === candidature.id && c.type === candidature.type ? { ...c, statut } : c)
      );
      const typeAPI = candidature.type === "stage_spontane" ? "stage" : candidature.type;
      await api.put(`/api/candidatures/statut/${typeAPI}/${candidature.id}`, token, { statut });
    } catch (err: any) {
      setErrorCandidatures(`Échec: ${err?.message || "Erreur inconnue"}`);
      // Reload safe
      try {
        const { data } = await api.get<Candidature[]>("/api/candidatures", token);
        setCandidatures((data || []).map(c => ({ ...c, offreId: c.offreId || c.offre_id })));
      } catch { /* ignore */ }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Utilitaires archives
  const candidaturesArchivees = candidatures.filter(c => c.statut === "acceptee" || c.statut === "refusee");
  const candidaturesFiltreesArchive = archiveFilter === "tous"
    ? candidaturesArchivees
    : candidaturesArchivees.filter(c => archiveFilter === "acceptees" ? c.statut === "acceptee" : c.statut === "refusee");

  const candidaturesRecherchees = candidaturesFiltreesArchive.filter(c =>
    c.nom.toLowerCase().includes(searchArchive.toLowerCase()) ||
    c.email.toLowerCase().includes(searchArchive.toLowerCase()) ||
    (c.poste && c.poste.toLowerCase().includes(searchArchive.toLowerCase()))
  );

  // Helpers UI
  const DisplayDiplome = ({ diplome }: { diplome?: string }) =>
    !diplome ? <span className="text-gray-400 italic">Non renseigné</span>
      : <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">{diplome}</span>;

  const DisplayCompetenceScore = ({ score }: { score?: number }) =>
    !score ? <span className="text-gray-400 italic">N/A</span> : (
      <div className="flex items-center space-x-2">
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(score, 100)}%` }}></div>
        </div>
        <span className="text-sm font-medium">{score}%</span>
      </div>
    );

  const DisplayExperience = ({ experience }: { experience?: string }) =>
    !experience || experience === "0"
      ? <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">0</span>
      : <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">{experience}</span>;

  const StatsOverview = () => {
    const stats = {
      total: candidatures.length,
      enAttente: candidatures.filter(c => c.statut === "en_attente").length,
      acceptees: candidatures.filter(c => c.statut === "acceptee").length,
      refusees: candidatures.filter(c => c.statut === "refusee").length,
      offresActives: offres.filter(o => o.statut === "active").length,
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* ... même structure qu'exemple précédent ... */}
      </div>
    );
  };

  // Statistiques par offre
  const getCandidatureStats = (offreId: number) => {
    const candidaturesOffre = candidatures.filter(c => (c.offre_id ?? c.offreId) === offreId);
    return {
      total: candidaturesOffre.length,
      enAttente: candidaturesOffre.filter(c => c.statut === "en_attente").length,
      acceptees: candidaturesOffre.filter(c => c.statut === "acceptee").length,
      refusees: candidaturesOffre.filter(c => c.statut === "refusee").length
    };
  };

  // Liste des offres (exemple simplifié, à étendre selon vos besoins)
  const OffresList = () => (
    <div>
      {offres.map(offre => (
        <div key={offre.id} className="bg-white rounded-xl shadow p-4 mb-4 flex justify-between items-center">
          <div>
            <h4 className="font-bold text-lg">{offre.titre}</h4>
            <p className="text-sm text-gray-500">{offre.description}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {offre.exigences.map((e, i) => (
                <span key={i} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">{e}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleEditClick(offre)} className="btn btn-xs btn-outline-primary"><Edit size={16} /></button>
            <button onClick={() => supprimerOffre(offre.id)} className="btn btn-xs btn-outline-danger"><Trash2 size={16} /></button>
          </div>
        </div>
      ))}
    </div>
  );

  // Rendu principal du dashboard
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard Gestionnaire</h1>
        <button onClick={handleLogout} className="flex items-center gap-2 text-rose-600 px-4 py-2 rounded hover:bg-rose-50">
          <LogOut /> Déconnexion
        </button>
      </div>
      <div className="flex gap-4 mb-8">
        <button className={`tab ${activeTab === "offres" ? "tab-active" : ""}`} onClick={() => setActiveTab("offres")}>
          <Briefcase size={18} /> Offres d'Emploi
        </button>
        <button className={`tab ${activeTab === "candidatures" ? "tab-active" : ""}`} onClick={() => setActiveTab("candidatures")}>
          <UserCheck size={18} /> Candidatures Spontanées - Stage/PFE
        </button>
        <button className={`tab ${activeTab === "candidatures-postes" ? "tab-active" : ""}`} onClick={() => setActiveTab("candidatures-postes")}>
          <FileText size={18} /> Candidatures par Postes
        </button>
        <button className={`tab ${activeTab === "archives" ? "tab-active" : ""}`} onClick={() => setActiveTab("archives")}>
          <Archive size={18} /> Archives
        </button>
      </div>

      <StatsOverview />

      {activeTab === "offres" && (
        <OffresList />
      )}
      {/* À compléter : Formulaires, listes de candidatures, archives, modales, etc. */}
      {errorOffres && <div className="text-red-500">{errorOffres}</div>}
      {errorCandidatures && <div className="text-red-500">{errorCandidatures}</div>}
    </div>
  );
};

export default Dashboard;
