// ============================================================
// Fichier : /src/pages/Emploi.tsx - CORRIGÉ POUR LE SCROLL
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { Briefcase, MapPin, Calendar, Search, Plus, Users, Home, Share2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [offres, setOffres] = useState<OffreDB[]>([]);
  const [filteredOffres, setFilteredOffres] = useState<OffreDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ongletActif, setOngletActif] = useState<OngletType>('emploi');
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSharePopup, setShowSharePopup] = useState<number | null>(null);

  // Récupération des paramètres d'URL
  const offreIdFromUrl = searchParams.get('offre');
  const posteFromUrl = searchParams.get('poste');

  // REMPLACEZ par votre vraie URL Render
  const API_BASE_URL = 'https://c4e-website-back.onrender.com';
  const FRONTEND_URL = 'https://c4e-africa.com'; // Votre URL frontend

  // 🔥 CORRECTION : Scroll vers le haut au chargement et changement d'offre
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [offreIdFromUrl]); // Se déclenche quand l'offre change

  const fetchOffres = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔄 Chargement des offres depuis:', `${API_BASE_URL}/api/offres`);

      const response = await fetch(`${API_BASE_URL}/api/offres`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data: OffreDB[] = await response.json();
      console.log('✅ Offres reçues:', data.length);
      
      // Filtrer seulement les offres actives
      const offresActives = data.filter(offre => offre.statut === 'active');
      setOffres(offresActives);
      setFilteredOffres(offresActives);

    } catch (err: any) {
      console.error('❌ Erreur fetch offres:', err);
      
      const errorMessage = err.message.includes('CORS') || err.message.includes('Failed to fetch')
        ? 'Connexion au serveur impossible'
        : `Erreur: ${err.message}`;

      setError(errorMessage);

      // Données de démonstration
      const demoOffres: OffreDB[] = [
        {
          id: 1,
          titre: "Développeur Full Stack Senior",
          description: "Rejoignez notre équipe technique en tant que développeur full stack. Vous serez responsable du développement et de la maintenance de nos applications web innovantes.",
          salaire: "45 000 - 55 000 €",
          type: "CDI",
          localisation: "Paris",
          exigences: ["React/Next.js", "Node.js/Express", "TypeScript", "PostgreSQL", "Docker"],
          date_expiration: "2024-12-31",
          statut: "active"
        },
        {
          id: 2,
          titre: "Stage Ingénieur Data Science",
          description: "Stage de 6 mois en data science et machine learning. Vous travaillerez sur l'analyse de données complexes et le développement de modèles prédictifs.",
          salaire: "1 200 €/mois",
          type: "Stage",
          localisation: "Lyon",
          exigences: ["Python", "Machine Learning", "Pandas/NumPy", "SQL", "Visualisation de données"],
          date_expiration: "2024-10-31",
          statut: "active"
        }
      ];

      setOffres(demoOffres);
      setFilteredOffres(demoOffres);
      
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffres();
  }, [fetchOffres]);

  // Trouver l'offre spécifique depuis l'URL
  const offreSpecifique = offreIdFromUrl 
    ? offres.find(offre => offre.id === parseInt(offreIdFromUrl))
    : null;

  // Fonction pour générer le lien de partage
  const generateShareLink = (offreId: number, titre: string) => {
    const baseUrl = `${FRONTEND_URL}/emploi`;
    const params = new URLSearchParams({
      offre: offreId.toString(),
      poste: encodeURIComponent(titre)
    });
    return `${baseUrl}?${params.toString()}`;
  };

  // 🔥 CORRECTION : Fonction pour voir les détails d'une offre avec scroll vers le haut
  const voirDetailsOffre = (offreId: number, titre: string) => {
    setSearchParams({
      offre: offreId.toString(),
      poste: encodeURIComponent(titre)
    });
    // Scroll vers le haut pour une meilleure UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fonction pour copier le lien dans le presse-papier
  const copyToClipboard = async (offreId: number, titre: string) => {
    const shareLink = generateShareLink(offreId, titre);
    try {
      await navigator.clipboard.writeText(shareLink);
      console.log('✅ Lien copié:', shareLink);
      
      // Afficher un message de succès temporaire
      setShowSharePopup(offreId);
      setTimeout(() => setShowSharePopup(null), 2000);
      
    } catch (err) {
      console.error('❌ Erreur copie presse-papier:', err);
      // Fallback pour les navigateurs plus anciens
      const textArea = document.createElement('textarea');
      textArea.value = shareLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setShowSharePopup(offreId);
      setTimeout(() => setShowSharePopup(null), 2000);
    }
  };

  // Fonction pour partager via Web Share API (mobile)
  const shareViaNative = async (offreId: number, titre: string, description: string) => {
    const shareLink = generateShareLink(offreId, titre);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Offre C4E Africa - ${titre}`,
          text: description.substring(0, 100) + '...',
          url: shareLink,
        });
      } catch (err) {
        console.log('❌ Partage annulé');
      }
    } else {
      // Fallback : ouvrir le popup de partage personnalisé
      setShowSharePopup(offreId);
    }
  };

  // 🔥 CORRECTION : Fonction pour retourner à la liste avec scroll vers le haut
  const retourListe = () => {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtrer les offres selon l'onglet actif
  const offresFiltrees = offres.filter(offre => {
    const typeLower = offre.type.toLowerCase();
    
    if (ongletActif === 'emploi') {
      return typeLower.includes('cdi') || 
             typeLower.includes('cdd') ||
             typeLower.includes('emploi');
    } else {
      return typeLower.includes('stage') || 
             typeLower.includes('pfe') ||
             typeLower.includes('alternance');
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

  // Si une offre spécifique est demandée via l'URL
  if (offreSpecifique) {
    return (
      <section className="pt-32 pb-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Bouton retour */}
          <motion.button
            onClick={retourListe}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8 transition-colors"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ArrowLeft className="h-5 w-5" />
            Retour à toutes les offres
          </motion.button>

          {/* Offre spécifique */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-100"
          >
            {/* En-tête */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  {offreSpecifique.localisation}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {offreSpecifique.titre}
                </h1>
              </div>
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                {offreSpecifique.type}
              </span>
            </div>

            {/* Description complète */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Description du poste</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {offreSpecifique.description}
              </p>
            </div>

            {/* Exigences détaillées */}
            {offreSpecifique.exigences && offreSpecifique.exigences.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Compétences requises</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {offreSpecifique.exigences.map((exigence, idx) => (
                    <li key={idx} className="flex items-center text-gray-700">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      {exigence}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Informations complémentaires */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {offreSpecifique.salaire && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                    Salaire
                  </h3>
                  <p className="text-gray-700">{offreSpecifique.salaire}</p>
                </div>
              )}
              
              <div className="bg-orange-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  Date limite
                </h3>
                <p className="text-gray-700">Expire le {formatDate(offreSpecifique.date_expiration)}</p>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
              <motion.button
                onClick={() => shareViaNative(offreSpecifique.id, offreSpecifique.titre, offreSpecifique.description)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-blue-500 text-blue-500 font-semibold rounded-full hover:bg-blue-500 hover:text-white transition-all duration-300"
              >
                <Share2 className="h-5 w-5" />
                Partager cette offre
              </motion.button>

              <motion.button
                onClick={() =>
                  navigate('/formulaire-emploi', {
                    state: { 
                      type: offreSpecifique.type.toLowerCase().includes('stage') ? 'stage' : 'emploi', 
                      offreId: offreSpecifique.id, 
                      poste: offreSpecifique.titre 
                    },
                  })
                }
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Postuler à cette offre
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  // Affichage normal de la liste des offres
  return (
    <section className="pt-32 pb-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      <div className="container mx-auto px-6">
        {/* En-tête */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Nos <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Offres</span>
          </h1>
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
                  window.scrollTo({ top: 0, behavior: 'smooth' }); // 🔥 Scroll vers le haut
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
                  window.scrollTo({ top: 0, behavior: 'smooth' }); // 🔥 Scroll vers le haut
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
                    className="group bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 relative"
                  >
                    {/* Popup de partage */}
                    {showSharePopup === offer.id && (
                      <motion.div 
                        className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-10"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        Lien copié !
                      </motion.div>
                    )}

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

                    {/* Titre cliquable */}
                    <motion.button
                      onClick={() => voirDetailsOffre(offer.id, offer.titre)}
                      className="w-full text-left"
                    >
                      <h2 className="text-2xl font-semibold mb-3 text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer hover:underline">
                        {offer.titre}
                      </h2>
                    </motion.button>

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

                    {/* Pied de carte avec salaire, date et boutons */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 pt-4 border-t border-gray-200 gap-4">
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

                      <div className="flex items-center gap-3">
                        {/* Bouton Partager */}
                        <motion.button
                          onClick={() => shareViaNative(offer.id, offer.titre, offer.description)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-all duration-300 text-sm"
                          title="Partager cette offre"
                        >
                          <Share2 className="h-4 w-4" />
                          <span>Partager</span>
                        </motion.button>

                        {/* Bouton Postuler */}
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
                  onClick={() => {
                    setShowAll(!showAll);
                    window.scrollTo({ top: 0, behavior: 'smooth' }); // 🔥 Scroll vers le haut
                  }}
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