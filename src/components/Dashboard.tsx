// ============================================================
// Fichier : /components/Dashboard.tsx
// Description : Composant principal du Dashboard de gestion RH/Offres.
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Plus, Edit, Trash2, Eye, Users, Briefcase, Book, Mail,
  Filter, ArrowLeft, UserCheck, FileText, Archive, Search,
  CheckCircle, XCircle, Clock
} from 'lucide-react';

// ────────────────────────────────────────────────────────────
// 1) Base API et Helpers URL / Fetch
// ────────────────────────────────────────────────────────────
const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL ||
  'https://c4e-website-back.onrender.com'; // fallback prod

// Construit une URL sûre sans doubles slash et gère les chemins relatifs
const buildUrl = (path: string) => {
  const p = path.startsWith('/') ? path : `/${path}`;
  return new URL(p, API_BASE_URL).toString(); // normalisation sûre
};

// Un petit wrapper fetch standardisé (avec gestion token, JSON et erreurs)
async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {},
  token?: string | null
): Promise<{ ok: boolean; status: number; json: T | null; res: Response }> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
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
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      const u = new URL(filePath);
      // Remap si host = localhost / 127.0.0.1
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        return buildUrl(u.pathname + u.search + u.hash);
      }
      return u.toString();
    }
    // Sinon, on construit par rapport à l’API
    return buildUrl(filePath);
  } catch {
    // En cas d’URL bizarre, on tente un fallback propre
    return buildUrl(filePath.startsWith('/') ? filePath : `/${filePath}`);
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
  statut: 'active' | 'inactive';
  type: 'CDI' | 'CDD 12 mois' | 'Stage' | 'PFE';
  localisation: string;
  exigences: string[];
}

interface ApiOffre {
  id: number;
  titre: string;
  description: string;
  salaire: string | null;
  date_expiration: string;
  statut: 'active' | 'inactive';
  type: 'CDI' | 'CDD 12 mois' | 'Stage' | 'PFE';
  localisation: string;
  exigences: string[];
}

interface Candidature {
  id: number;
  type: 'emploi' | 'stage' | 'pfe' | 'spontanee' | 'stage_spontane';
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
  statut: 'en_attente' | 'acceptee' | 'refusee';
  competenceScore?: number;
  poste?: string;
  diplome?: string;
  competences?: { [key: string]: number };
  domaine?: string;
  duree?: string;
  experience?: string;
  source?: 'offre' | 'spontanee';
  universite?: string;
  type_etablissement?: string;
}

const diplomeOrder: Record<string, number> = {
  'technicien': 1,
  'licence': 2,
  'master': 3,
  'master_ingenieur': 3,
  "cycle d'ingénieur": 3,
  'ingenieur': 3,
  'doctorat': 4,
  'bac': 0,
  'bts': 1,
  'dut': 1,
};

// ────────────────────────────────────────────────────────────
// 3) Utils métier
// ────────────────────────────────────────────────────────────
function getSortedCandidatures(
  candidatures: Candidature[],
  sortBy: 'date' | 'diplome' | 'competence' | 'experience',
  sortOrder: 'asc' | 'desc'
) {
  return [...candidatures].sort((a, b) => {
    let valA: string | number;
    let valB: string | number;
    switch (sortBy) {
      case 'date':
        valA = new Date(a.dateSoumission).getTime();
        valB = new Date(b.dateSoumission).getTime();
        break;
      case 'diplome':
        valA = diplomeOrder[a.diplome?.toLowerCase() || ''] || 0;
        valB = diplomeOrder[b.diplome?.toLowerCase() || ''] || 0;
        break;
      case 'competence':
        valA = a.competenceScore || 0;
        valB = b.competenceScore || 0;
        break;
      case 'experience':
        valA = a.experience || '';
        valB = b.experience || '';
        break;
      default:
        valA = new Date(a.dateSoumission).getTime();
        valB = new Date(b.dateSoumission).getTime();
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

// ────────────────────────────────────────────────────────────
// 4) Composant
// ────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [activeTab, setActiveTab] =
    useState<'offres' | 'candidatures' | 'candidatures-postes' | 'archives'>('offres');
  const [offres, setOffres] = useState<OffreEmploi[]>([]);
  const [loadingOffres, setLoadingOffres] = useState(true);
  const [errorOffres, setErrorOffres] = useState('');
  const [nouvelleOffre, setNouvelleOffre] = useState({
    titre: '',
    description: '',
    salaire: '',
    dateExpiration: '',
    type: 'CDI' as OffreEmploi['type'],
    localisation: '',
  });
  const [editingOffre, setEditingOffre] = useState<OffreEmploi | null>(null);

  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [loadingCandidatures, setLoadingCandidatures] = useState(true);
  const [errorCandidatures, setErrorCandidatures] = useState('');
  const [filterType, setFilterType] = useState<'tous' | 'stage_spontane' | 'spontanee'>('tous');
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'diplome' | 'competence' | 'experience'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [viewMode, setViewMode] = useState<'postes' | 'candidatures'>('postes');
  const [selectedOffre, setSelectedOffre] = useState<OffreEmploi | null>(null);
  const [ongletCandidatures, setOngletCandidatures] = useState<'emploi' | 'stage'>('emploi');

  const [exigencesFields, setExigencesFields] = useState<string[]>(['']);
  const [editingExigences, setEditingExigences] = useState<string[]>(['']);

  const [archiveFilter, setArchiveFilter] = useState<'tous' | 'acceptees' | 'refusees'>('tous');
  const [searchArchive, setSearchArchive] = useState('');

  useEffect(() => {
    if (!token) navigate('/login');
  }, [token, navigate]);

  // Chargement Offres
  useEffect(() => {
    const fetchOffres = async () => {
      try {
        setLoadingOffres(true);
        setErrorOffres('');
        const { ok, json, status } = await apiFetch<ApiOffre[]>('/api/offres', { method: 'GET' }, token);
        if (!ok || !json) throw new Error(`Erreur chargement offres (HTTP ${status})`);
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
        setErrorOffres(err?.message || 'Erreur connexion backend.');
      } finally {
        setLoadingOffres(false);
      }
    };
    if (activeTab === 'offres' || activeTab === 'candidatures-postes') fetchOffres();
  }, [activeTab, token]);

  // Chargement Candidatures (selon onglet)
  useEffect(() => {
    const fetchCandidatures = async () => {
      try {
        setLoadingCandidatures(true);
        setErrorCandidatures('');

        if (activeTab === 'candidatures') {
          // Candidatures spontanées uniquement
          const { ok, json, status } = await apiFetch<Candidature[]>(
            '/api/candidatures/spontanees/toutes',
            { method: 'GET' },
            token
          );
          if (!ok || !json) throw new Error(`Erreur chargement (HTTP ${status})`);
          setCandidatures(json);
        } else if (activeTab === 'candidatures-postes') {
          // Charger tout puis filtrer vers emploi/stage/pfe
          const { ok, json, status } = await apiFetch<Candidature[]>(
            '/api/candidatures',
            { method: 'GET' },
            token
          );
          if (!ok || !json) throw new Error(`Erreur chargement (HTTP ${status})`);
          const candidaturesSurOffres = json.filter(
            (c) => c.type === 'emploi' || c.type === 'stage' || c.type === 'pfe'
          );
          setCandidatures(candidaturesSurOffres);
        } else if (activeTab === 'archives') {
          const { ok, json, status } = await apiFetch<Candidature[]>(
            '/api/candidatures',
            { method: 'GET' },
            token
          );
          if (!ok || !json) throw new Error(`Erreur chargement (HTTP ${status})`);
          setCandidatures(json);
        }
      } catch (err: any) {
        setErrorCandidatures(err?.message || 'Erreur connexion backend.');
      } finally {
        setLoadingCandidatures(false);
      }
    };

    if (['candidatures', 'candidatures-postes', 'archives'].includes(activeTab)) {
      fetchCandidatures();
    }
  }, [activeTab, token]);

  // Gestion exigences (création/édition)
  const ajouterChampExigence = () => setExigencesFields((x) => [...x, '']);
  const supprimerChampExigence = (index: number) =>
    setExigencesFields((x) => (x.length > 1 ? x.filter((_, i) => i !== index) : x));
  const mettreAJourChampExigence = (index: number, valeur: string) =>
    setExigencesFields((x) => x.map((v, i) => (i === index ? valeur : v)));

  const ajouterChampExigenceEdit = () => setEditingExigences((x) => [...x, '']);
  const supprimerChampExigenceEdit = (index: number) =>
    setEditingExigences((x) => (x.length > 1 ? x.filter((_, i) => i !== index) : x));
  const mettreAJourChampExigenceEdit = (index: number, valeur: string) =>
    setEditingExigences((x) => x.map((v, i) => (i === index ? valeur : v)));

  const handleEditClick = (offre: OffreEmploi) => {
    setEditingOffre(offre);
    setEditingExigences(offre.exigences.length > 0 ? [...offre.exigences] : ['']);
  };

  // CRUD Offres
  const ajouterOffre = async () => {
    if (!nouvelleOffre.titre || !nouvelleOffre.description || !nouvelleOffre.dateExpiration || !nouvelleOffre.localisation) {
      setErrorOffres('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    try {
      const exigencesArray = exigencesFields.filter((req) => req.trim() !== '');
      const payload = {
        ...nouvelleOffre,
        date_expiration: nouvelleOffre.dateExpiration,
        exigences: exigencesArray,
      };
      const { ok, json, status } = await apiFetch<{ offre: any }>(
        '/api/offres',
        { method: 'POST', body: JSON.stringify(payload) },
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
        statut: newOffreData.statut ?? 'active',
        type: newOffreData.type,
        localisation: newOffreData.localisation,
        exigences: newOffreData.exigences || [],
      };
      setOffres((prev) => [...prev, newOffre]);
      setNouvelleOffre({ titre: '', description: '', salaire: '', dateExpiration: '', type: 'CDI', localisation: '' });
      setExigencesFields(['']);
      setErrorOffres('');
    } catch (err: any) {
      setErrorOffres(err?.message || 'Erreur connexion backend.');
    }
  };

  const modifierOffre = async (offre: OffreEmploi) => {
    if (!offre.titre || !offre.description || !offre.dateExpiration || !offre.localisation) {
      setErrorOffres('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    try {
      const exigencesArray = editingExigences.filter((req) => req.trim() !== '');
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
        { method: 'PUT', body: JSON.stringify(payload) },
        token
      );
      if (!ok) throw new Error(`Erreur modification offre (HTTP ${status})`);
      setOffres((prev) => prev.map((o) => (o.id === offre.id ? { ...offre, exigences: exigencesArray } : o)));
      setEditingOffre(null);
      setEditingExigences(['']);
      setErrorOffres('');
    } catch (err: any) {
      setErrorOffres(err?.message || 'Erreur connexion backend.');
    }
  };

  const supprimerOffre = async (id: number) => {
    if (!window.confirm('Confirmer la suppression ?')) return;
    try {
      const { ok, status } = await apiFetch(`/api/offres/${id}`, { method: 'DELETE' }, token);
      if (!ok) throw new Error(`Erreur suppression offre (HTTP ${status})`);
      setOffres((prev) => prev.filter((o) => o.id !== id));
    } catch (err: any) {
      setErrorOffres(err?.message || 'Erreur connexion backend.');
    }
  };

  // Suppression candidature (tous types)
  const supprimerCandidature = async (candidature: Candidature) => {
    if (!window.confirm(`Confirmer la suppression de la candidature de ${candidature.nom} ?`)) return;
    try {
      const { id, type } = candidature;
      const { ok, status } = await apiFetch(
        `/api/candidatures/${type}/${id}`,
        { method: 'DELETE' },
        token
      );
      if (!ok) throw new Error(`Erreur suppression (HTTP ${status})`);
      setCandidatures((prev) => prev.filter((c) => !(c.id === id && c.type === type)));
      if (selectedCandidature?.id === id && selectedCandidature?.type === type) setSelectedCandidature(null);
    } catch (err: any) {
      setErrorCandidatures(`Échec: ${err?.message || 'Erreur inconnue'}`);
    }
  };

  // Changer statut
  const changerStatut = async (candidature: Candidature, statut: Candidature['statut']) => {
    try {
      const { id, type } = candidature;
      // Optimistic UI
      setCandidatures((prev) => prev.map((c) => (c.id === id && c.type === type ? { ...c, statut } : c)));

      let typeAPI: Candidature['type'] | 'stage' = type;
      if (type === 'stage_spontane') typeAPI = 'stage'; // mapping côté API

      const { ok, status } = await apiFetch(
        `/api/candidatures/statut/${typeAPI}/${id}`,
        { method: 'PUT', body: JSON.stringify({ statut }) },
        token
      );

      if (!ok) throw new Error(`Erreur mise à jour (HTTP ${status})`);
    } catch (err: any) {
      setErrorCandidatures(`Échec: ${err?.message || 'Erreur inconnue'}`);
      // rollback pragmatique : recharger rapidement la liste
      (async () => {
        try {
          const { ok, json } = await apiFetch<Candidature[]>('/api/candidatures', { method: 'GET' }, token);
          if (ok && json) {
            const normalized = json.map((c) => ({ ...c, offreId: c.offreId || c.offre_id }));
            setCandidatures(normalized);
          }
        } catch {}
      })();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // ────────────────────────────────────────────────────────────
  // 5) Sélecteurs / Stats / UI helpers
  // ────────────────────────────────────────────────────────────
  const candidaturesArchivees = candidatures.filter((c) => c.statut === 'acceptee' || c.statut === 'refusee');

  const candidaturesFiltreesArchive =
    archiveFilter === 'tous'
      ? candidaturesArchivees
      : candidaturesArchivees.filter((c) => (archiveFilter === 'acceptees' ? c.statut === 'acceptee' : c.statut === 'refusee'));

  const candidaturesRecherchees = candidaturesFiltreesArchive.filter((c) =>
    (c.nom || '').toLowerCase().includes(searchArchive.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchArchive.toLowerCase()) ||
    (c.poste || '').toLowerCase().includes(searchArchive.toLowerCase())
  );

  const statsArchives = {
    total: candidaturesArchivees.length,
    acceptees: candidaturesArchivees.filter((c) => c.statut === 'acceptee').length,
    refusees: candidaturesArchivees.filter((c) => c.statut === 'refusee').length,
  };

  const DisplayDiplome = ({ diplome }: { diplome?: string }) =>
    !diplome ? <span className="text-gray-400 italic">Non renseigné</span>
             : <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">{diplome}</span>;

  const DisplayCompetenceScore = ({ score }: { score?: number }) =>
    !score ? <span className="text-gray-400 italic">N/A</span> : (
      <div className="flex items-center space-x-2">
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(score, 100)}%` }} />
        </div>
        <span className="text-sm font-medium">{score}%</span>
      </div>
    );

  const DisplayExperience = ({ experience }: { experience?: string }) =>
    !experience || experience === '0'
      ? <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">0</span>
      : <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">{experience}</span>;

  const getCandidatureStats = (offreId: number) => {
    const candidaturesOffre = candidatures.filter((c) => c.offre_id === offreId);
    return {
      total: candidaturesOffre.length,
      enAttente: candidaturesOffre.filter((c) => c.statut === 'en_attente').length,
      acceptees: candidaturesOffre.filter((c) => c.statut === 'acceptee').length,
      refusees: candidaturesOffre.filter((c) => c.statut === 'refusee').length,
    };
  };

  // ────────────────────────────────────────────────────────────
  // 6) Rendu (UI inchangé sauf appels corrigés & getFileUrl→normalizeFileUrl)
  // ────────────────────────────────────────────────────────────

  if (!token) return <div className="flex items-center justify-center min-h-screen">Redirection...</div>;

  // … TOUT LE RESTE DE TON JSX D’ORIGINE …
  // (Aucune logique métier supprimée. Seule différence : les liens de fichiers utilisent normalizeFileUrl)
  // Deux remplacements simples dans le JSX :
  //   href={normalizeFileUrl(selectedCandidature.cvUrl)}
  //   href={normalizeFileUrl(selectedCandidature.lettreMotivationUrl)}

  // Pour rester concis ici, on ne réimprime pas l’intégralité du JSX (inchangé)
  // Copie/colle ton JSX d’origine tel quel, en remplaçant uniquement getFileUrl(...) par normalizeFileUrl(...)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* … tout ton JSX existant … */}
      {/* Remplace toutes les occurrences de getFileUrl(...) par normalizeFileUrl(...) */}
    </div>
  );
};

export default Dashboard;
