/**
 * /components/formulaire-stage.tsx
 * --------------------------
 * Composant React pour envoyer une candidature de stage ou PFE.
 * Gère les informations personnelles, CV, lettre de motivation, domaine, durée, poste, établissement,
 * diplôme, expérience et compétences évaluées.
 * Soumet les données à l'API correspondante et affiche un message de succès ou d'erreur.
 */import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, File, MessageSquare, Star, BookOpen, Briefcase } from 'lucide-react';
import axios from 'axios';

const FormulaireStage = () => {
  const navigate = useNavigate();
  const cvFileRef = useRef<HTMLInputElement>(null);
  const lettreFileRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    cv: null as File | null,
    lettre_motivation: null as File | null,
    domaine: '',
    duree: '',
    poste: '',
    type_etablissement: '',
    diplome: '',
    experience: '',
    competences: {
      communication: 0,
      travailEquipe: 0,
      leadership: 0,
      problemSolving: 0,
      creativite: 0,
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({ 
        ...prev, 
        [name]: files[0]
      }));
    }
  };

  const handleCompetenceChange = (name: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      competences: { ...prev.competences, [name]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    // Validation des fichiers
    if (!formData.cv) {
      setSubmitMessage('❌ Veuillez télécharger votre CV');
      setIsSubmitting(false);
      return;
    }

    if (!formData.lettre_motivation) {
      setSubmitMessage('❌ Veuillez télécharger votre lettre de motivation');
      setIsSubmitting(false);
      return;
    }

    try {
      const form = new FormData();
      
      // Ajouter les données textuelles
      form.append('nom', formData.nom);
      form.append('prenom', formData.prenom);
      form.append('email', formData.email);
      form.append('telephone', formData.telephone);
      form.append('domaine', formData.domaine);
      form.append('duree', formData.duree);
      form.append('poste', formData.poste);
      form.append('type_etablissement', formData.type_etablissement);
      form.append('diplome', formData.diplome);
      form.append('experience', formData.experience);
      form.append('competences', JSON.stringify(formData.competences));

      // Ajouter les fichiers
      form.append('cv', formData.cv);
      form.append('lettre_motivation', formData.lettre_motivation);

      const response = await axios.post('http://localhost:5001/api/candidature-stage', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSubmitMessage('✅ Candidature envoyée avec succès !');
      
      // Réinitialiser le formulaire
      setFormData({
        nom: '', 
        prenom: '', 
        email: '', 
        telephone: '', 
        cv: null,
        lettre_motivation: null,
        domaine: '', 
        duree: '',
        poste: '', 
        type_etablissement: '', 
        diplome: '', 
        experience: '',
        competences: { 
          communication: 0, 
          travailEquipe: 0, 
          leadership: 0, 
          problemSolving: 0, 
          creativite: 0 
        }
      });

      // Réinitialiser les champs fichier avec les refs
      if (cvFileRef.current) cvFileRef.current.value = '';
      if (lettreFileRef.current) lettreFileRef.current.value = '';

    } catch (error) {
      console.error('Erreur détaillée:', error);
      setSubmitMessage('❌ Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="pt-32 pb-20 bg-background min-h-screen">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Candidature <span className="text-gradient-accent">Stage / PFE</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Postulez pour un stage ou un Projet de Fin d'Etudes au sein de notre équipe innovante.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl p-8 shadow-lg">
            {submitMessage && (
              <div className={`p-4 rounded-lg ${submitMessage.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                />
              </div>
            </div>

            {/* Université, type établissement et diplôme */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-2">Type d'établissement</label>
                <select 
                  name="type_etablissement" 
                  value={formData.type_etablissement} 
                  onChange={handleChange} 
                  required 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Sélectionnez</option>
                  <option value="publique">Publique</option>
                  <option value="privee">Privée</option>
                  <option value="semi-privee">Semi-Privée</option>
                </select>
              </div>
            </div>

            {/* Diplôme */}
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

            {/* Expérience */}
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

            {/* Poste visé */}
            <div>
              <label className="text-sm font-medium mb-2">Poste visé</label>
              <input 
                type="text" 
                name="poste" 
                value={formData.poste} 
                onChange={handleChange} 
                placeholder="Ex: Développeur Web" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
              />
            </div>

            {/* Domaine du stage */}
            <div>
              <label className="text-sm font-medium mb-2">Domaine</label>
              <input
                type="text"
                name="domaine"
                value={formData.domaine}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Ex: Développement Web, Marketing Digital..."
              />
            </div>

            {/* Durée du stage */}
            <div>
              <label className="text-sm font-medium mb-2">Durée du stage</label>
              <select 
                name="duree" 
                value={formData.duree} 
                onChange={handleChange} 
                required 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Sélectionnez</option>
                <option value="2 mois">2 mois</option>
                <option value="3 mois">3 mois</option>
                <option value="6 mois">6 mois</option>
                <option value="1 an">1 an</option>
              </select>
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
    accept=".pdf"  // 🔥 Changé : uniquement PDF
    onChange={handleFileChange} 
    required 
    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600" 
  />
  <p className="text-xs text-gray-500 mt-1">Format accepté: PDF uniquement</p> {/* 🔥 Changé */}
</div>

{/* Lettre de motivation - Maintenant un fichier */}
<div>
  <label className="text-sm font-medium flex items-center mb-2">
    <MessageSquare className="h-4 w-4 mr-2" /> Lettre de motivation *
  </label>
  <input 
    ref={lettreFileRef}
    type="file" 
    name="lettre_motivation" 
    accept=".pdf"  // 🔥 Changé : uniquement PDF
    onChange={handleFileChange} 
    required 
    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-white hover:file:bg-green-600" 
  />
  <p className="text-xs text-gray-500 mt-1">Format accepté: PDF uniquement</p> {/* 🔥 Changé */}
</div>

            {/* Compétences */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Star className="h-5 w-5 text-yellow-500 mr-2" /> Évaluez vos compétences
              </h2>
              <div className="space-y-4">
                {Object.entries(formData.competences).map(([nom, valeur]) => (
                  <div key={nom} className="flex items-center justify-between">
                    <span className="capitalize text-gray-700">{nom.replace(/([A-Z])/g, ' $1')}</span>
                    <div className="flex space-x-1">
                      {[1,2,3,4,5].map(score => (
                        <button 
                          key={score} 
                          type="button" 
                          onClick={() => handleCompetenceChange(nom, score)} 
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
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma candidature'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default FormulaireStage;