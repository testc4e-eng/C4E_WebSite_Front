/**
 * WEBSITE-C4E-AFRICA-1\apps\Frontend\src\components\formulaire-emploi.tsx
 * --------------------------
 * Composant React pour envoyer une candidature à un poste spécifique.
 * Récupère les offres d'emploi, gère les infos personnelles, CV, lettre de motivation,
 * compétences selon les exigences du poste et soumet les données à l'API.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Phone, File, MessageSquare, Star, Briefcase } from 'lucide-react';
import axios from 'axios';

type CompetencesType = {
  [key: string]: number; // Dynamique pour les exigences du poste
};

type Offre = {
  id: number;
  titre: string;
  exigences: string[]; // Ajout des exigences spécifiques
};

const FormulaireEmploi = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    cv: null as File | null,
    lettre_motivation:  null as File | null,
    offreId: '',
    typeEtablissement: '',
    diplome: '',
    experience: '',
    competences: {} as CompetencesType, // Devient dynamique
  });

  const [offres, setOffres] = useState<Offre[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [selectedOffre, setSelectedOffre] = useState<Offre | null>(null);

  useEffect(() => {
    const fetchOffres = async () => {
      try {
        const response = await axios.get<Offre[]>('http://localhost:3001/api/offres');
        setOffres(response.data);

        if (location.state?.offreId) {
          const offreId = location.state.offreId.toString();
          setFormData(prev => ({ ...prev, offreId }));
          const offre = response.data.find(o => o.id.toString() === offreId);
          if (offre) {
            setSelectedOffre(offre);
            // Initialiser les compétences avec les exigences du poste
            const initialCompetences: CompetencesType = {};
            offre.exigences.forEach(exigence => {
              initialCompetences[exigence] = 0;
            });
            setFormData(prev => ({ ...prev, competences: initialCompetences }));
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des offres:', error);
      }
    };
    fetchOffres();
  }, [location.state]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'offreId') {
      const offre = offres.find(o => o.id.toString() === value);
      setSelectedOffre(offre || null);
      
      // Réinitialiser les compétences avec les nouvelles exigences
      const newCompetences: CompetencesType = {};
      if (offre) {
        offre.exigences.forEach(exigence => {
          newCompetences[exigence] = 0;
        });
      }
      
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        competences: newCompetences
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, cv: e.target.files![0] }));
    }
  };

  const handleCompetenceChange = (exigence: string, score: number) => {
    setFormData(prev => ({
      ...prev,
      competences: { ...prev.competences, [exigence]: score },
    }));
  };

  const getStarRating = (score: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= score
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">({score}/5)</span>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const form = new FormData();
      form.append('nom', formData.nom);
      form.append('prenom', formData.prenom);
      form.append('email', formData.email);
      form.append('telephone', formData.telephone);
      if (formData.cv) {
        form.append('cv', formData.cv);
      }
      if (formData.lettre_motivation) form.append('lettre_motivation', formData.lettre_motivation);
      form.append('type_etablissement', formData.typeEtablissement);
      form.append('diplome', formData.diplome);
      form.append('experience', formData.experience);
      form.append('offre_id', formData.offreId);
      form.append('poste', selectedOffre?.titre || '');
      form.append('competences', JSON.stringify(formData.competences));

      await axios.post('http://localhost:3001/api/candidature-emploi', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSubmitMessage('Candidature envoyée avec succès !');
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        cv: null,
        lettre_motivation: null,
        offreId: '',
        typeEtablissement: '',
        diplome: '',
        experience: '',
        competences: {},
      });
      setSelectedOffre(null);
    } catch (error) {
      console.error(error);
      setSubmitMessage('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 bg-background min-h-screen">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Candidature <span className="text-gradient-accent">Emploi</span>
            </h1>
            {selectedOffre && (
              <div className="bg-white rounded-lg p-6 shadow-md mb-6">
                <h2 className="text-2xl font-semibold text-accent mb-2">
                  {selectedOffre.titre}
                </h2>

              </div>
            )}
            <p className="text-xl text-muted-foreground">
              Postulez pour le poste sélectionné au sein de notre équipe.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl p-8 shadow-lg">
            {submitMessage && (
              <div
                className={`p-4 rounded-lg ${
                  submitMessage.includes('succès')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {submitMessage}
              </div>
            )}

            {/* Nom & Prénom */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2" /> Prénom
                </label>
                <input
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2" /> Nom
                </label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            </div>

            {/* Email & Téléphone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center">
                  <Mail className="h-4 w-4 mr-2" /> Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center">
                  <Phone className="h-4 w-4 mr-2" /> Téléphone
                </label>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            </div>

{/* Alternative avec une icône simple */}
<div>
  <label className="text-sm font-medium text-foreground mb-2 flex items-center">
    <span className="text-green-600 mr-2">✓</span>
    Poste sélectionné
  </label>
  
  <div className="w-full px-4 py-3 border border-green-300 bg-green-50 rounded-lg text-gray-700">
    <span className="font-medium">{selectedOffre?.titre}</span>
  </div>
  
  <input
    type="hidden"
    name="offreId"
    value={formData.offreId}
  />
  
  <p className="text-sm text-green-600 mt-2 flex items-center">
    <span className="text-green-600 mr-2">🔒</span>
    Cette offre a été présélectionnée
  </p>
</div>

{/* CV */}
<div>
  <label className="text-sm font-medium text-foreground mb-2 flex items-center">
    <File className="h-4 w-4 mr-2" /> CV (PDF uniquement)
  </label>
  <input
    type="file"
    accept=".pdf"
    onChange={handleFileChange}
    required
    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-primary"
  />
</div>

            {/* Type d'établissement, Diplôme, Expérience */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2">Type d'établissement</label>
              <select
                name="typeEtablissement"
                value={formData.typeEtablissement}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="">Sélectionnez</option>
                <option value="publique">Publique</option>
                <option value="privee">Privée</option>
                <option value="semi-privee">Semi-Privée</option>
              </select>
            </div>
<div>
  <label className="text-sm font-medium mb-2">Diplôme</label>
  <select 
    name="diplome" 
    value={formData.diplome} 
    onChange={handleChange} 
    required 
    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
  >
    <option value="">Sélectionnez votre diplôme</option>
    <option value="technicien">Technicien</option>
    <option value="licence">Licence</option>
    <option value="master_ingenieur">Master / Cycle d'ingénieur</option>
    <option value="doctorat">Doctorat</option>
  </select>
</div>
            <div>
              <label className="text-sm font-medium flex items-center mb-2">
                <Briefcase className="h-4 w-4 mr-2" /> 
                Années d'expérience
              </label>
              <select
                name="experience"
                value={formData.experience || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Sélectionnez votre expérience</option>
                <option value="0">0 an (Débutant)</option>
                <option value="1">1 an</option>
                <option value="2">2 ans</option>
                <option value="3">3 ans</option>
                <option value="4">4 ans</option>
                <option value="5">5 ans</option>
                <option value="6-10">6-10 ans</option>
                <option value="10+">Plus de 10 ans</option>
              </select>
            </div>

            {/* Lettre de motivation PDF */}
<div>
  <label className="text-sm font-medium text-foreground mb-2 flex items-center">
    <MessageSquare className="h-4 w-4 mr-2" /> Lettre de motivation (PDF uniquement)
  </label>
  <input
    type="file"
    accept=".pdf"
    onChange={(e) => {
      if (e.target.files && e.target.files[0]) {
        setFormData(prev => ({ ...prev, lettre_motivation: e.target.files![0] }));
      }
    }}
    required
    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-primary"
  />
</div>
            {/* Évaluation des exigences du poste */}
            {selectedOffre && selectedOffre.exigences && selectedOffre.exigences.length > 0 && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold mb-6 flex items-center text-gray-800">
                  <Star className="h-6 w-6 text-yellow-500 mr-3" /> 
                  Évaluez votre niveau pour les exigences du poste
                </h2>
                <div className="space-y-6">
                  {selectedOffre.exigences.map((exigence, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                      <label className="block text-lg font-medium text-gray-800 mb-3">
                        {exigence}
                      </label>
                      <div className="flex items-center space-x-4">
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              type="button"
                              onClick={() => handleCompetenceChange(exigence, score)}
                              className="transition-transform transform hover:scale-110 focus:outline-none"
                            >
                              <Star
                                className={`h-8 w-8 ${
                                  score <= (formData.competences[exigence] || 0)
                                    ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm'
                                    : 'text-gray-300 hover:text-yellow-200'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          {formData.competences[exigence] ? (
                            <span className="text-green-600">
                              Niveau {formData.competences[exigence]}/5
                            </span>
                          ) : (
                            <span className="text-gray-400">Non évalué</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  <p>⭐ = Débutant, ⭐⭐ = Notions de base, ⭐⭐⭐ = Intermédiaire, ⭐⭐⭐⭐ = Avancé, ⭐⭐⭐⭐⭐ = Expert</p>
                </div>
              </div>
            )}

            {/* Bouton Soumettre */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedOffre}
              className="w-full py-4 px-6 bg-gradient-to-r from-accent to-primary text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? 'Envoi en cours...' : 'Postuler maintenant'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default FormulaireEmploi;