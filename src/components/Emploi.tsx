// ============================================================
// Fichier : /src/pages/Emploi.tsx
// Description : Page publique pour afficher les offres d'emploi et de stage/PFE.
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

  // Configuration de l'API - même pattern que AdminDashboard
  const API_BASE_URL = 'https://votre-backend-render.onrender.com';

  const fetchOffres = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔄 Chargement des offres...');

      const response = await fetch(`${API_BASE_URL}/api/offres`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data: OffreDB[] = await response.json();
      console.log('✅ Offres reçues:', data.length);
      setOffres(data);
      setFilteredOffres(data);

    } catch (err: any) {
      console.error('❌ Erreur fetch offres:', err);
      const errorMessage = err instanceof Error 
        ? `Erreur de connexion: ${err.message}` 
        : 'Erreur de connexion au serveur.';
      setError(errorMessage);

      // Données de démonstration en cas d'erreur
      const demoOffres: OffreDB[] = [
        {
          id: 1,
          titre: "Développeur Full Stack",
          description: "Rejoignez notre équipe en tant que développeur full stack passionné par les nouvelles technologies. Vous participerez au développement de nos applications web modernes.",
          salaire: "45K-55K €",
          type: "CDI",
          localisation: "Paris",
          exigences: ["React", "Node.js", "TypeScript", "PostgreSQL", "Git"],
          date_expiration: "2024-12-31",
          statut: "active"
        },
        {
          id: 2,
          titre: "Stage Développeur Frontend",
          description: "Stage de 6 mois en développement frontend avec React. Parfait pour approfondir vos compétences en développement web moderne.",
          salaire: "1200 €/mois",
          type: "Stage",
          localisation: "Lyon",
          exigences: ["JavaScript", "React", "HTML/CSS", "Responsive Design"],
          date_expiration: "2024-10-31",
          statut: "active"
        },
        {
          id: 3,
          titre: "Data Scientist",
          description: "Nous recherchons un Data Scientist pour analyser et modéliser des données complexes. Expérience en machine learning requise.",
          salaire: "50K-60K €",
          type: "CDI",
          localisation: "Remote",
          exigences: ["Python", "Machine Learning", "SQL", "Pandas", "NumPy"],
          date_expiration: "2024-11-30",
          statut: "active"
        },
        {
          id: 4,
          titre: "Alternance Développeur Web",
          description: "Alternance d'un an pour un étudiant en développement web. Formation en entreprise avec suivi personnalisé.",
          salaire: "Selon grille",
          type: "Alternance",
          localisation: "Toulouse",
          exigences: ["HTML/CSS", "JavaScript", "PHP", "MySQL"],
          date_expiration: "2024-09-15",
          statut: "active"
        }
      ];

      setOffres(demoOffres);
      setFilteredOffres(demoOffres);
      setError(`${errorMessage} - Affichage des données de démonstration`);

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
        offre.localisation.toLowerCase().includes(searchTerm.toLowerCase())
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

  const containerVariants = { 
    hidden: { opacity: 0 }, 
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1 } 
    } 
  };
  
  const itemVariants = { 
    hidden: { y: 20, opacity: 0 }, 
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { duration: 0.5 } 
    } 
  };

  if (loading) {
    return (
      <section className="pt-32 pb-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
        <div className="container mx-auto px-6">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Chargement des offres...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-32 pb-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      {/* Header */}
      <motion.header 
        className="bg-white/90 backdrop-blur-xl shadow-2xl border-b border-white/20 fixed top-0 w-full z-50" 
        initial={{ y: -100 }} 
        animate={{ y: 0 }} 
        transition={{ duration: 0.6, type: "spring" }}
      >
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <motion.button 
              onClick={handleLogoClick} 
              whileHover={{ scale: 1.05, rotate: 5 }} 
              whileTap={{ scale: 0.95 }} 
              className="flex items-center space-x-3 group"
            >
              <img 
                src="/logo.png" 
                alt="Logo C4E Africa" 
                className="h-12 w-12 rounded-2xl shadow-lg border-2 border-white/50 group-hover:shadow-xl transition-all duration-300" 
              />
              <div className="text-left">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  C4E Africa
                </h1>
                <p className="text-gray-600 text-sm">Carrières & Opportunités</p>
              </div>
            </motion.button>
          </div>
          <div className="flex items-center space-x-4">
            <motion.button 
              onClick={handleHomeClick} 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium shadow-md group" 
            >
              <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:block">Accueil</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-6">
        {/* En-tête */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Nos <span className="text-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Offres</span>
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Découvrez nos opportunités de carrière et postulez pour le poste qui correspond à vos ambitions.
          </p>
        </motion.div>

        {/* Onglets */}
        <motion.div 
          className="flex justify-center mb-12" 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-white/50 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-white/20">
            <div className="flex space-x-1">
              <button 
                onClick={() => {
                  setOngletActif('emploi');
                  setShowAll(false);
                }}
                className={`flex items-center space-x-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  ongletActif === 'emploi' 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg transform scale-105' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/70'
                }`}
              >
                <Briefcase className="h-5 w-5" />
                <span>CDI / CDD</span>
              </button>
              <button 
                onClick={() => {
                  setOngletActif('stage');
                  setShowAll(false);
                }}
                className={`flex items-center space-x-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  ongletActif === 'stage' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/70'
                }`}
              >
                <Users className="h-5 w-5" />
                <span>Stages / PFE</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Barre de recherche */}
        <motion.div 
          className="max-w-2xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher par poste, localisation ou description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm"
            />
          </div>
        </motion.div>

        {/* Message d'erreur */}
        {error && (
          <motion.div 
            className="max-w-2xl mx-auto mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-yellow-800 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Message si aucune offre */}
        {filteredOffres.length === 0 && !loading && (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="bg-white rounded-2xl p-8 max-w-md mx-auto shadow-lg">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Aucune offre disponible
              </h3>
              <p className="text-gray-600">
                Aucune offre {ongletActif === 'emploi' ? "d'emploi" : 'de stage'} ne correspond à votre recherche.
                Revenez plus tard ou postulez via une candidature spontanée.
              </p>
            </div>
          </motion.div>
        )}

        {/* Liste des offres */}
        {filteredOffres.length > 0 && (
          <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="visible"
            className="mb-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <AnimatePresence>
                {offresAffichees.map((offer, index) => (
                  <motion.div
                    key={offer.id}
                    variants={itemVariants}
                    layout
                    className="group bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20"
                  >
                    {/* En-tête avec localisation et type */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-1" />
                        {offer.localisation}
                      </div>
                      <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {offer.type}
                      </span>
                    </div>

                    {/* Titre et description */}
                    <h2 className="text-2xl font-semibold mb-3 text-gray-900 group-hover:text-blue-600 transition-colors">
                      {offer.titre}
                    </h2>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {offer.description}
                    </p>

                    {/* Exigences */}
                    {offer.exigences && offer.exigences.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Compétences requises:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {offer.exigences.map((exigence, idx) => (
                            <li key={idx} className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                              {exigence}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Pied de carte avec salaire et date */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {offer.salaire && (
                          <span className="flex items-center gap-1 font-medium text-gray-900">
                            <Briefcase className="h-4 w-4" /> 
                            {offer.salaire}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Expire le {formatDate(offer.date_expiration)}
                        </span>
                      </div>

                      <motion.button
                        onClick={() =>
                          navigate('/formulaire-emploi', {
                            state: { 
                              type: ongletActif, 
                              offreId: offer.id, 
                              poste: offer.titre 
                            },
                          })
                        }
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        Postuler
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Boutons Voir plus et Candidature spontanée */}
            <motion.div 
              className="text-center flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.button
                onClick={() =>
                  navigate('/formulaire-candidature', { 
                    state: { 
                      type: ongletActif === 'emploi' ? 'spontanee' : 'stage',
                      poste: '',
                    } 
                  })
                }
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Candidature Spontanée {ongletActif === 'emploi' ? 'Emploi' : 'Stage'}
              </motion.button>

              {filteredOffres.length > 2 && (
                <motion.button
                  onClick={() => setShowAll(!showAll)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 border-2 border-blue-500 text-blue-500 font-semibold rounded-full hover:bg-blue-500 hover:text-white transition-all duration-300"
                >
                  {showAll ? 'Voir moins' : `Voir plus (${filteredOffres.length - 2})`}
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default Emploi;