// ============================================================
// Fichier : /src/pages/Emploi.tsx - VERSION CORRIGÉE
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { Briefcase, MapPin, Calendar, Search, Plus, Users, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface OffreDB {
  id: number;
  titre: string;
  description: string;
  salaire: string | null;
  type: string;
  localisation: string;
  exigences: string[];
  date_expiration: string;
  statut: string;
}

type OngletType = 'emploi' | 'stage';

const Emploi = () => {
  const navigate = useNavigate();
  const [offres, setOffres] = useState<OffreDB[]>([]);
  const [filteredOffres, setFilteredOffres] = useState<OffreDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ongletActif, setOngletActif] = useState<OngletType>('emploi');
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // REMPLACEZ par votre vraie URL Render
  const API_BASE_URL = 'https://votre-backend-render.onrender.com';

  const fetchOffres = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔄 Chargement des offres depuis:', `${API_BASE_URL}/api/offres`);

      // Utilisez fetch avec mode 'cors' et gestion des erreurs CORS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${API_BASE_URL}/api/offres`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data: OffreDB[] = await response.json();
      console.log('✅ Offres reçues:', data.length);
      setOffres(data);
      setFilteredOffres(data);

    } catch (err: any) {
      console.error('❌ Erreur fetch offres:', err);
      
      // Si c'est une erreur CORS ou réseau, utilisez les données de démonstration
      const errorMessage = err.name === 'AbortError' 
        ? 'Timeout: Le serveur met trop de temps à répondre'
        : err.message.includes('CORS') || err.message.includes('Failed to fetch')
        ? 'Erreur de connexion au serveur (CORS)'
        : `Erreur: ${err.message}`;

      setError(errorMessage);

      // Données de démonstration réalistes
      const demoOffres: OffreDB[] = [
        {
          id: 1,
          titre: "Développeur Full Stack Senior",
          description: "Rejoignez notre équipe technique en tant que développeur full stack. Vous serez responsable du développement et de la maintenance de nos applications web innovantes. Environnement agile avec des technologies modernes.",
          salaire: "45 000 - 55 000 €",
          type: "CDI",
          localisation: "Paris",
          exigences: ["React/Next.js", "Node.js/Express", "TypeScript", "PostgreSQL", "Docker", "AWS"],
          date_expiration: "2024-12-31",
          statut: "active"
        },
        {
          id: 2,
          titre: "Stage Ingénieur Data Science",
          description: "Stage de 6 mois en data science et machine learning. Vous travaillerez sur l'analyse de données complexes et le développement de modèles prédictifs pour optimiser nos processus métiers.",
          salaire: "1 200 €/mois",
          type: "Stage",
          localisation: "Lyon",
          exigences: ["Python", "Machine Learning", "Pandas/NumPy", "SQL", "Visualisation de données"],
          date_expiration: "2024-10-31",
          statut: "active"
        },
        {
          id: 3,
          titre: "Product Manager",
          description: "Nous recherchons un Product Manager pour piloter le développement de nos produits digitaux. Vous définirez la roadmap produit et coordonnerez les équipes techniques et métiers.",
          salaire: "55 000 - 65 000 €",
          type: "CDI",
          localisation: "Remote",
          exigences: ["Gestion de produit", "Agile/Scrum", "Analytics", "UX/UI", "Anglais courant"],
          date_expiration: "2024-11-30",
          statut: "active"
        },
        {
          id: 4,
          titre: "Alternance Développeur Mobile",
          description: "Alternance d'un an en développement d'applications mobiles. Vous participerez à la création de nos applications iOS et Android en utilisant les technologies modernes.",
          salaire: "Selon convention",
          type: "Alternance",
          localisation: "Toulouse",
          exigences: ["React Native/Flutter", "JavaScript/TypeScript", "API REST", "Git"],
          date_expiration: "2024-09-15",
          statut: "active"
        },
        {
          id: 5,
          titre: "DevOps Engineer",
          description: "Rejoignez notre équipe DevOps pour améliorer notre infrastructure cloud et automatiser nos processus de déploiement. Environnement AWS avec Kubernetes.",
          salaire: "50 000 - 60 000 €",
          type: "CDI",
          localisation: "Bordeaux",
          exigences: ["AWS/Azure", "Kubernetes/Docker", "CI/CD", "Terraform", "Linux"],
          date_expiration: "2024-12-15",
          statut: "active"
        },
        {
          id: 6,
          titre: "PFE Ingénieur Cloud",
          description: "Projet de fin d'études de 6 mois sur l'optimisation de notre infrastructure cloud. Migration vers des architectures serverless et optimisation des coûts.",
          salaire: "1 500 €/mois",
          type: "Stage PFE",
          localisation: "Nantes",
          exigences: ["Cloud AWS", "Architecture microservices", "Serverless", "Monitoring"],
          date_expiration: "2024-08-31",
          statut: "active"
        }
      ];

      setOffres(demoOffres);
      setFilteredOffres(demoOffres);
      
      if (err.message.includes('CORS') || err.message.includes('Failed to fetch')) {
        setError('Connexion au serveur impossible. Affichage des offres de démonstration.');
      }

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffres();
  }, [fetchOffres]);

  // Filtrer les offres selon l'onglet actif
  const offresFiltrees = offres.filter(offre => {
    const typeLower = offre.type.toLowerCase();
    
    if (ongletActif === 'emploi') {
      return typeLower.includes('cdi') || 
             typeLower.includes('cdd') ||
             typeLower.includes('emploi') ||
             typeLower.includes('temps plein');
    } else {
      return typeLower.includes('stage') || 
             typeLower.includes('pfe') ||
             typeLower.includes('alternance') ||
             typeLower.includes('apprentissage');
    }
  });

  // Appliquer la recherche
  useEffect(() => {
    let filtered = offresFiltrees;

    if (searchTerm) {
      filtered = offresFiltrees.filter(offre =>
        offre.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offre.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offre.localisation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offre.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOffres(filtered);
  }, [searchTerm, offresFiltrees]);

  // Limiter l'affichage si nécessaire
  const offresAffichees = showAll ? filteredOffres : filteredOffres.slice(0, 2);

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleHomeClick = () => navigate('/');
  const handleLogoClick = () => navigate('/');

  // ... (le reste du code avec les animations et le JSX reste identique)
  // Assurez-vous d'utiliser le même code JSX que précédemment

  return (
    <section className="pt-32 pb-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      {/* Votre code JSX ici - identique à la version précédente */}
    </section>
  );
};

export default Emploi;