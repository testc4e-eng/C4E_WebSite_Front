/**
 * /components/formulaire-Candidature.tsx
 * --------------------------
 * Composant React pour envoyer une candidature (emploi, stage, ou spontanée).
 * Gère les infos personnelles, CV, lettre de motivation, compétences et calcul de score.
 * Soumet les données à l'API correspondante et affiche un message de succès ou d'erreur.
 */
import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Phone, File, MessageSquare, Star, Briefcase } from 'lucide-react';

interface CompetencesType {
  communication: number;
  travailEquipe: number;
  leadership: number;
  problemSolving: number;
  créativité: number;
}

interface FormDataType {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  cv: File | null;
  lettre_motivation: File | null;
  poste: string;
  competences: CompetencesType;
  type_etablissement: string;
  diplome: string;
  experience: string;
}

const FormulaireCandidature = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { type = 'spontanee', poste: posteFromState = '' } =
    (location.state as { type?: string; poste?: string }) || {};

  const cvFileRef = useRef<HTMLInputElement>(null);
  const lettreFileRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormDataType>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    cv: null,
    lettre_motivation: null,
    poste: type === 'emploi' ? posteFromState : '',
    competences: {
      communication: 0,
      travailEquipe: 0,
      leadership: 0,
      problemSolving: 0,
      créativité: 0,
    },
    type_etablissement: '',
    diplome: '',
    experience: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    }
  };

  const handleCompetenceChange = (name: keyof CompetencesType, value: number) => {
    setFormData(prev => ({
      ...prev,
      competences: { ...prev.competences, [name]: value },
    }));
  };

const calculerScore = (competences: CompetencesType) => {
  const valeurs = Object.values(competences);
  const moyenne = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
  return Math.round((moyenne / 5) * 100);
};

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    if (!formData.cv) {
      setSubmitMessage('❌ Veuillez télécharger votre CV (PDF)');
      setIsSubmitting(false);
      return;
    }
    if (!formData.lettre_motivation) {
      setSubmitMessage('❌ Veuillez télécharger votre lettre de motivation (PDF)');
      setIsSubmitting(false);
      return;
    }

    try {
      const formToSend = new FormData();
      formToSend.append('nom', formData.nom);
      formToSend.append('prenom', formData.prenom);
      formToSend.append('email', formData.email);
      formToSend.append('telephone', formData.telephone);
      formToSend.append('poste', formData.poste);
      formToSend.append('competences', JSON.stringify(formData.competences));
      formToSend.append('type_etablissement', formData.type_etablissement);
      formToSend.append('diplome', formData.diplome);
      formToSend.append('experience', formData.experience);
      formToSend.append('cv', formData.cv);
      formToSend.append('lettre_motivation', formData.lettre_motivation);

      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://c4e-website-back.onrender.com";
      const score = calculerScore(formData.competences);
      console.log('Score calculé:', score);

      let url = "";
      if (type === "emploi") {
        url = `${API_BASE_URL}/api/candidature-emploi`;
      } else if (type === "stage") {
        url = `${API_BASE_URL}/api/candidature-stage`;
      } else {
        url = `${API_BASE_URL}/api/candidature-spontanee`;
      }

      const response = await fetch(url, {
        method: 'POST',
        body: formToSend,
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitMessage(`✅ Candidature envoyée avec succès. Score: ${score}%`);
        setFormData({
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
          cv: null,
          lettre_motivation: null,
          poste: type === 'emploi' ? posteFromState : '',
          competences: { communication: 0, travailEquipe: 0, leadership: 0, problemSolving: 0, créativité: 0 },
          type_etablissement: '',
          diplome: '',
          experience: '',
        });
        if (cvFileRef.current) cvFileRef.current.value = '';
        if (lettreFileRef.current) lettreFileRef.current.value = '';
      } else {
        setSubmitMessage(result?.message || '❌ Erreur lors de l\'envoi.');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setSubmitMessage('❌ Erreur réseau lors de l\'envoi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 bg-background min-h-screen">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16 pt-10 pb-8 border-b border-gray-200">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
              <span className="text-gradient-accent">
                {type === 'emploi' ? 'Candidature' : 'Candidature Spontanée'}
              </span>{' '}
              {type === 'emploi' ? 'pour le poste' : ''}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {type === 'emploi'
                ? `Vous postulez pour le poste de ${posteFromState}.`
                : 'Envoyez-nous votre candidature même si aucune offre ne correspond à votre profil.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl p-8 shadow-lg">
            {submitMessage && (
              <div
                className={`p-4 rounded-lg ${
                  submitMessage.includes('✅')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {submitMessage}
              </div>
            )}

            {/* Infos personnelles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium flex items-center mb-2">
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
                <label className="text-sm font-medium flex items-center mb-2">
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

            {/* Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium flex items-center mb-2">
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
                <label className="text-sm font-medium flex items-center mb-2">
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

            {/* Formation et expérience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-2">Type d'établissement</label>
                <select
                  name="type_etablissement"
                  value={formData.type_etablissement}
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="">Sélectionnez votre diplôme</option>
                  <option value="technicien">Technicien</option>
                  <option value="licence">Licence</option>
                  <option value="master_ingenieur">Master / Cycle d'ingénieur</option>
                  <option value="doctorat">Doctorat</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium flex items-center mb-2">
                <Briefcase className="h-4 w-4 mr-2" /> Années d'expérience
              </label>
              <select
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
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

            {/* Poste */}
            <div>
              <label className="block text-sm font-medium mb-2">Poste visé</label>
              <input
                type="text"
                name="poste"
                value={formData.poste}
                onChange={handleChange}
                placeholder="Ex: Développeur Web"
                readOnly={type === 'emploi'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>

            {/* CV */}
            <div>
              <label className="text-sm font-medium flex items-center mb-2">
                <File className="h-4 w-4 mr-2" /> CV *
              </label>
              <input
                ref={cvFileRef}
                type="file"
                name="cv"
                accept=".pdf"
                onChange={handleFileChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
              />
              <p className="text-xs text-muted-foreground mt-1">Format PDF uniquement.</p>
            </div>

            {/* Lettre de motivation */}
            <div>
              <label className="text-sm font-medium flex items-center mb-2">
                <MessageSquare className="h-4 w-4 mr-2" /> Lettre de motivation *
              </label>
              <input
                ref={lettreFileRef}
                type="file"
                name="lettre_motivation"
                accept=".pdf"
                onChange={handleFileChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
              />
              <p className="text-xs text-muted-foreground mt-1">Format PDF uniquement.</p>
            </div>

{/* Compétences */}
<div className="mt-6">
  <h2 className="text-lg font-semibold mb-4 flex items-center">
    <Star className="h-5 w-5 text-yellow-500 mr-2" /> Évaluez vos compétences
  </h2>

  <div className="space-y-4">
    {Object.entries(formData.competences).map(([nom, valeur]) => (
      <div
        key={nom}
        className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <span className="capitalize text-gray-700">{nom.replace(/([A-Z])/g, ' $1')}</span>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map(score => (
            <button
              key={score}
              type="button"
              onClick={() => handleCompetenceChange(nom as keyof CompetencesType, score)}
              className={`w-6 h-6 rounded-full border transition-all duration-200 ${
                valeur >= score
                  ? 'bg-yellow-400 border-yellow-500 hover:bg-yellow-500'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            ></button>
          ))}
        </div>
      </div>
    ))}
  </div>
  </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-6 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover transition-colors"
            >
              {isSubmitting ? 'Envoi...' : 'Envoyer la candidature'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default FormulaireCandidature;
