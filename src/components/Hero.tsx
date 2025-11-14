// 📂 Chemin : src/components/Hero.tsx
// 🎯 Rôle : Ce fichier définit la section "Hero" de la page d'accueil (bannière principale).
// Elle inclut un logo animé, un slogan, une courte présentation, des boutons CTA (Call-To-Action),
// un indicateur de scroll et les sections suivantes : Stats, Services et Contact.

// =========================
// Importation des dépendances
// =========================
import { ChevronDown } from 'lucide-react'; // Icône flèche vers le bas
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Navigation entre pages et gestion URL
import Services from './Services';
import Stats from './Stats';
import Contact from './Contact';

// =========================
// Composant principal Hero
// =========================
const Hero = () => {
  const navigate = useNavigate(); // Permet la navigation vers une autre page
  const location = useLocation(); // Permet de récupérer le hash (#id) dans l’URL

  // 📌 Scroll automatique vers la section si l’URL contient un hash (#id)
  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location]);

  // 📌 Fonction déclenchée par l'indicateur de scroll (flèche en bas)
  // Permet de descendre directement jusqu’à la section "Stats"
  const scrollToNextSection = () => {
    const element = document.querySelector('#stats');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // =========================
  // Rendu du composant
  // =========================
  return (
    <>
      {/* Section Hero */}
<section id="home" className="hero-bg min-h-screen flex items-center justify-center relative">

  {/* 🌐 Éléments flottants en arrière-plan pour l’effet visuel */}
  <div className="absolute top-20 left-10 w-20 h-20 bg-accent/10 rounded-full floating"></div>
  <div className="absolute top-40 right-20 w-16 h-16 bg-primary-light/10 rounded-full floating-delayed"></div>
  <div className="absolute bottom-40 left-20 w-24 h-24 bg-accent/5 rounded-full floating"></div>

  <div className="container mx-auto px-6 text-center relative z-10">
    <div className="max-w-4xl mx-auto">

      {/* 🟡 Logo animé */}
<div className="flex justify-center mb-8 mt-5">
<div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden shadow-lg border-3 border-white bg-gradient-to-tr from-accent to-primary flex items-center justify-center p-3">
  <img
    src="/logo1.png"
    alt="C4E Africa Logo"
    className="w-full h-full object-contain p-1"
  />
</div>
</div>

      {/* 🟡 Titre principal */}
      <div className="animate-fade-in mb-6" style={{ animationDelay: '0.2s' }}>
        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
          Solutions Scientifiques
          <span className="block text-gradient-accent">pour la Durabilité</span>
        </h1>
      </div>

      {/* 🟡 Slogan */}
      <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <p className="text-2xl md:text-3xl text-white/90 mb-6 font-medium">
          Façonnons un Avenir Durable pour l'Afrique
        </p>
      </div>

      {/* 🟡 Description courte + bouton "En savoir plus" */}
<div className="animate-fade-in mb-12 text-center" style={{ animationDelay: '0.6s' }}>
  <p className="text-xl md:text-2xl font-semibold text-white max-w-3xl mx-auto leading-relaxed mb-4">
    C4E AFRICA est un bureau d’études spécialisé dans les domaines de l’Eau, de l’Énergie, de l’Environnement et de l’Éducation.
  </p>
  <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed mb-6">
    Notre leadership s’appuie sur la modélisation hydrologique avancée et l’expertise scientifique pour proposer des solutions innovantes et durables adaptées aux défis du développement en Afrique.
  </p>
  <button
    onClick={() => navigate('/about')}
    className="mt-4 px-8 py-3 bg-gradient-to-r from-accent to-primary text-white font-semibold rounded-lg shadow-lg hover:scale-105 transition-transform duration-300"
  >
    En savoir plus
  </button>
</div>

      {/* 🟡 Boutons Call-To-Action */}
      <div
        className="animate-fade-in flex flex-col sm:flex-row gap-6 justify-center items-center"
        style={{ animationDelay: '0.8s' }}
      >
        <button
          onClick={() => document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' })}
          className="btn-hero group"
        >
          Découvrez nos solutions
          <ChevronDown className="ml-2 h-5 w-5 group-hover:translate-y-1 transition-transform" />
        </button>
      </div>
    </div>
  </div>

  {/* 🟡 Indicateur de scroll (flèche en bas de la section) */}
  <button
    onClick={scrollToNextSection}
    className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60 hover:text-white transition-colors animate-bounce"
    aria-label="Défiler vers le bas"
  >
    <ChevronDown className="h-8 w-8" />
  </button>
</section>


      {/* Sections suivantes de la page */}
      <Stats />
      <Services />
      <Contact />
    </>
  );
};

// =========================
// Export du composant
// =========================
export default Hero;
