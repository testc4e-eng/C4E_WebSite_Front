// ============================================================
// Fichier : /src/pages/Emploi.tsx
// Description : Page publique pour afficher les offres d'emploi et de stage/PFE.
// Rôle :
// - Récupère toutes les offres depuis le backend (`/api/offres`).
// - Permet de filtrer les offres par type : "CDI/CDD" (emploi) ou "Stages/PFE".
// - Affiche un aperçu limité à 2 offres, avec bouton "Voir plus" pour afficher toutes.
// - Affiche les informations principales des offres : titre, description, localisation, type, salaire, exigences.
// - Bouton "Postuler" redirige vers le formulaire correspondant (`/formulaire-emploi`) avec le type et l'offre.
// - Bouton "Candidature Spontanée" redirige vers le formulaire spontané (`/formulaire-candidature`) selon l'onglet actif.
// - Gestion des états React : loading, error, onglet actif, affichage complet ou limité.
// - Utilisation de Lucide pour les icônes et TailwindCSS pour le style.
// ============================================================
import { useState, useEffect } from 'react';
import { Briefcase, MapPin } from 'lucide-react';
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
}

type OngletType = 'emploi' | 'stage';

const Emploi = () => {
  const navigate = useNavigate();
  const [offres, setOffres] = useState<OffreDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ongletActif, setOngletActif] = useState<OngletType>('emploi');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchOffres = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('http://localhost:5001/api/offres');
        if (!response.ok) throw new Error('Erreur lors du chargement des offres.');
        const data: OffreDB[] = await response.json();
        setOffres(data);
      } catch (err) {
        console.error('Erreur fetch offres:', err);
        setError('Erreur de connexion au serveur.');
      } finally {
        setLoading(false);
      }
    };
    fetchOffres();
  }, []);

  // Filtrer les offres selon l'onglet actif
  const offresFiltrees = offres.filter(offre => {
    if (ongletActif === 'emploi') {
      return offre.type.toLowerCase().includes('cdi') || 
             offre.type.toLowerCase().includes('cdd') ||
             offre.type.toLowerCase().includes('emploi');
    } else {
      return offre.type.toLowerCase().includes('stage') || 
             offre.type.toLowerCase().includes('pfe') ||
             offre.type.toLowerCase().includes('alternance');
    }
  });

  // Limiter l'affichage si nécessaire
  const offresAffichees = showAll ? offresFiltrees : offresFiltrees.slice(0, 2);

  if (loading) return <p className="text-center py-20">Chargement des offres...</p>;
  if (error) return <p className="text-center py-20 text-red-600">{error}</p>;

  return (
    <section className="pt-32 pb-20 bg-background min-h-screen">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Nos <span className="text-gradient-accent">Offres</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Découvrez nos opportunités et postulez pour le poste qui vous correspond.
          </p>
        </div>

        {/* Onglets */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-full p-2 shadow-lg border border-gray-200">
            <button
              onClick={() => {
                setOngletActif('emploi');
                setShowAll(false);
              }}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                ongletActif === 'emploi'
                  ? 'bg-gradient-to-r from-accent to-primary text-white shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              CDI / CDD
            </button>
            <button
              onClick={() => {
                setOngletActif('stage');
                setShowAll(false);
              }}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                ongletActif === 'stage'
                  ? 'bg-gradient-to-r from-accent to-primary text-white shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Stages / PFE
            </button>
          </div>
        </div>

        {/* Message si aucune offre */}
        {offresFiltrees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Aucune offre {ongletActif === 'emploi' ? 'd\'emploi' : 'de stage'} disponible pour le moment.
            </p>
          </div>
        )}

        {/* Liste des offres */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {offresAffichees.map((offer) => (
            <div
              key={offer.id}
              className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {offer.localisation}
                </div>
                <span className="bg-accent text-white px-3 py-1 rounded-full text-sm font-medium">
                  {offer.type}
                </span>
              </div>

              <h2 className="text-2xl font-semibold mb-3">{offer.titre}</h2>
              <p className="text-muted-foreground mb-4">{offer.description}</p>

              {offer.exigences.length > 0 && (
                <ul className="text-sm text-muted-foreground mb-4 list-disc list-inside">
                  {offer.exigences.map((exigence, idx) => (
                    <li key={idx}>{exigence}</li>
                  ))}
                </ul>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <button
                  onClick={() =>
                    navigate('/formulaire-emploi', {
                      state: { 
                        type: ongletActif, 
                        offreId: offer.id, 
                        poste: offer.titre 
                      },
                    })
                  }
                  className="px-6 py-3 bg-gradient-to-r from-accent to-primary text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  Postuler
                </button>

                {offer.salaire && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-4 w-4" /> {offer.salaire}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Boutons Voir plus et Candidature spontanée */}
        {offresFiltrees.length > 0 && (
          <div className="text-center flex flex-col sm:flex-row items-center justify-center gap-4">
<button
  onClick={() =>
    navigate('/formulaire-candidature', { 
      state: { 
        type: ongletActif === 'emploi' ? 'spontanee' : 'stage', // ici le type doit correspondre à ce que le formulaire attend
        poste: '', // tu peux remplir ici si tu veux pré-remplir le poste
      } 
    })
  }
  className="px-8 py-3 bg-gradient-to-r from-accent to-primary text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
>
  Candidature Spontanée {ongletActif === 'emploi' ? 'Emploi' : 'Stage'}
</button>

            {offresFiltrees.length > 2 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="px-8 py-3 border border-accent text-accent font-semibold rounded-full hover:bg-accent hover:text-white transition-all duration-300"
              >
                {showAll ? 'Voir moins' : `Voir plus (${offresFiltrees.length - 2})`}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Emploi;