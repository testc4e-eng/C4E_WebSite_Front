// 📂 Chemin : src/components/Hero.tsx
// 🎯 Rôle : Ce fichier définit la section "Hero" de la page d'accueil (bannière principale).

// =========================
// Importation des dépendances
// =========================
import { ChevronDown } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Services from './Services';
import Stats from './Stats';
import Contact from './Contact';
import Header from './Header'; // IMPORTATION DU HEADER

// =========================
// Composant principal Hero
// =========================
const Hero = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 📌 Scroll automatique vers la section si l'URL contient un hash (#id)
  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location]);

  // 📌 Fonction déclenchée par l'indicateur de scroll
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
      {/* 🟡 HEADER VISIBLE IMMÉDIATEMENT */}
      <Header />
      
      {/* Section Hero */}
      <section id="home" className="hero-bg min-h-screen flex items-center justify-center relative pt-24"> {/* Augmenté pt-16 à pt-24 */}

        {/* 🌐 Éléments flottants en arrière-plan */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-accent/10 rounded-full floating"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-primary-light/10 rounded-full floating-delayed"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 bg-accent/5 rounded-full floating"></div>

        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="max-w-4xl mx-auto">

            {/* 🟡 Logo animé - PLUS D'ESPACE AVEC pt-16 */}
            <div className="flex justify-center mb-12 pt-16"> {/* Augmenté pt-8 à pt-16 */}
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden shadow-xl border-4 border-white bg-gradient-to-tr from-accent to-primary flex items-center justify-center">
                <img
                  src="/logoC4E.png"
                  alt="C4E Africa Logo"
                  className="w-3/4 h-3/4 object-cover rounded-full"
                />
              </div>
            </div>

            {/* 🟡 Titre principal */}
            <div className="mb-6">
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
                Solutions Scientifiques
                <span className="block text-gradient-accent">pour la Durabilité</span>
              </h1>
            </div>

            {/* 🟡 Slogan */}
            <div>
              <p className="text-2xl md:text-3xl text-white/90 mb-6 font-medium">
                Façonnons un Avenir Durable pour l'Afrique
              </p>
            </div>

            {/* 🟡 Description courte + bouton "En savoir plus" */}
            <div className="mb-12 text-center">
              <p className="text-xl md:text-2xl font-semibold text-white max-w-3xl mx-auto leading-relaxed mb-4">
                C4E AFRICA est un bureau d'études spécialisé dans les domaines de l'Eau, de l'Énergie, de l'Environnement et de l'Éducation.
              </p>
              <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed mb-6">
                Notre leadership s'appuie sur la modélisation hydrologique avancée et l'expertise scientifique pour proposer des solutions innovantes et durables adaptées aux défis du développement en Afrique.
              </p>
              <button
                onClick={() => navigate('/about')}
                className="mt-4 px-8 py-3 bg-gradient-to-r from-accent to-primary text-white font-semibold rounded-lg shadow-lg hover:scale-105 transition-transform duration-300"
              >
                En savoir plus
              </button>
            </div>

            {/* 🟡 Boutons Call-To-Action */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
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

        {/* 🟡 Indicateur de scroll */}
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

export default Hero;