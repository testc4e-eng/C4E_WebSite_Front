import { ChevronDown, X, Play, Pause } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Services from './Services';
import Stats from './Stats';
import Contact from './Contact';
import BreakingNewsBar from './BreakingNewsBar';

/* ============================================================================
   Flash News Bar (positionnée bas-droite, non intrusive)
============================================================================ */
const FlashNewsBar = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

const flashNews = [
  {
    title: "FORMATION WASP",
    subtitle: "Modélisation Hydrologique Avancée",
    status: "12 – 16 janvier 2026",
    badgeColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
    link: "/training/wasp",
    icon: "🌊",
    progress: 75,
    clickable: true   // ✅ SEULE cliquable
  },
  {
    title: "FORMATION SWAT",
    subtitle: "Analyse des Pratiques Culturales",
    status: "PROCHAINEMENT",
    badgeColor: "text-blue-600 bg-blue-50 border-blue-200",
    link: "/training/swat",
    icon: "📊",
    progress: 30,
    clickable: false
  },
  {
    title: "FORMATION HEC-RAS",
    subtitle: "Modélisation Hydraulique Expert",
    status: "PROCHAINEMENT",
    badgeColor: "text-indigo-600 bg-indigo-50 border-indigo-200",
    link: "/training/hec-ras",
    icon: "⚡",
    progress: 15,
    clickable: false
  }
];

  useEffect(() => {
    if (isPaused) return;
    const i = setInterval(() => {
      setCurrentIndex((v) => (v + 1) % flashNews.length);
    }, 4000);
    return () => clearInterval(i);
  }, [isPaused, flashNews.length]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed right-6 bottom-24 z-40 bg-blue-600 text-white p-3 rounded-full shadow-xl hover:scale-110 transition"
      >
        <Play className="w-5 h-5" />
      </button>
    );
  }

  const n = flashNews[currentIndex];

  return (
    <div className="fixed right-6 bottom-24 w-80 bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border z-40 overflow-hidden">
      <div className="bg-gray-900 text-white p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold tracking-wide">ACTUALITÉS FORMATIONS</h3>
          <div className="flex gap-1">
            <button onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button onClick={() => setIsVisible(false)}>
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="w-full bg-gray-700 h-1 rounded-full">
          <div
            className="bg-cyan-400 h-1 rounded-full transition-all"
            style={{ width: `${n.progress}%` }}
          />
        </div>
      </div>

      <div
        onClick={() => navigate(n.link)}
        className="p-6 cursor-pointer hover:bg-gray-50 transition"
      >
        <div className="flex justify-between items-center mb-4">
          <span className="text-4xl">{n.icon}</span>
          <span className={`${n.badgeColor} text-xs px-3 py-1 rounded-full border`}>
            {n.status}
          </span>
        </div>
        <h4 className="font-bold text-lg">{n.title}</h4>
        <p className="text-sm text-gray-600">{n.subtitle}</p>
      </div>
    </div>
  );
};

/* ============================================================================
   HERO
============================================================================ */
const Hero = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location]);

  const scrollToNextSection = () => {
    document.querySelector('#stats')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* HERO SECTION */}
   <section
  id="home"
  className="hero-bg min-h-screen relative flex items-center justify-center pt-20 md:pt-24"
>
        {/* Overlay sombre */}
        <div className="absolute inset-0 bg-black/40 z-0" />

        {/* Floating UI */}
    
        <BreakingNewsBar />

        {/* CONTENT */}
        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">

            {/* LOGO */}
<div className="flex justify-center mb-12">
  <div
    className="
      w-36 h-36 md:w-40 md:h-40
      rounded-full
      bg-gradient-to-tr from-cyan-500 to-blue-600
      flex items-center justify-center
      shadow-2xl
      border-4 border-white
    "
  >
    {/* CERCLE INTERNE – CARRÉ */}
    <div className="w-[82%] h-[82%] bg-white rounded-full overflow-hidden flex items-center justify-center">
      <img
        src="/logoC4E.png"
        alt="C4E Africa"
        className="w-full h-full object-contain"
      />
    </div>
  </div>
</div>

            {/* TITLE */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Solutions Scientifiques
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                pour la Durabilité
              </span>
            </h1>

            {/* SLOGAN */}
            <p className="text-2xl md:text-3xl text-white/90 mb-10 font-light">
              Façonnons un Avenir Durable pour l'Afrique
            </p>

            {/* DESCRIPTION */}
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-6">
              C4E AFRICA est un bureau d’études spécialisé dans l’Eau, l’Énergie,
              l’Environnement et l’Éducation.
            </p>
            <p className="text-lg text-white/80 max-w-3xl mx-auto mb-10">
              Nous combinons modélisation hydrologique avancée et expertise scientifique
              pour proposer des solutions innovantes et durables.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <button
                onClick={() => navigate('/about')}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-xl hover:scale-105 transition"
              >
                En savoir plus
              </button>

              {/* SCROLL INDICATOR */}
              <button
                onClick={scrollToNextSection}
                className="flex flex-col items-center text-white/70 hover:text-white transition"
              >
                <span className="text-sm mb-2">Scroll</span>
                <ChevronDown className="h-8 w-8 animate-bounce" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* NEXT SECTIONS */}
      <Stats />
      <Services />
      <Contact />
    </>
  );
};

export default Hero;