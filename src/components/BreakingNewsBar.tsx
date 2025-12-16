// 📂 Chemin : ./components/BreakingNewsBar.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BreakingNewsBar = () => {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const navigate = useNavigate();

  const breakingNews = [
    {
      id: "wasp",
      text: "🚀 Nouvelle formation WASP disponible-Modélisation hydrologique avancée ",
      date: "12 – 16 janvier 2026",
      link: "/training/wasp",
      clickable: true
    },
    {
      id: "swat",
      text: "📊 Formation SWAT - Analyse des pratiques culturales",
      date: "à venir",
      link: "/training/swat",
      clickable: false
    },
    {
      id: "hec-ras",
      text: "⚡ Formation HEC-RAS - Modélisation hydraulique expert",
      date: "à venir",
      link: "/training/hec-ras",
      clickable: false
    },
    {
      id: "hec-hms",
      text: "💧 Formation HEC-HMS - Simulation hydrologique complète",
      date: "à venir",
      link: "/training/hms",
      clickable: false
    },
    {
      id: "certification",
      text: "🎓 Sessions de certification disponibles - Contactez-nous pour plus d'informations",
      date: "à venir",
      clickable: false
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % breakingNews.length);
    }, 1500); // Change toutes les 1.5 secondes

    return () => clearInterval(interval);
  }, [breakingNews.length]);

  const handleNewsClick = (news: any) => {
    if (news.clickable && news.link) {
      navigate(news.link);
    }
  };

  const currentNews = breakingNews[currentNewsIndex];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Barre principale avec fond transparent 70% */}
      <div className="bg-white/70 backdrop-blur-md border-t border-gray-200/50 shadow-lg">
        <div className="container mx-auto">
          <div className="flex items-center py-3 px-6">
            {/* Titre avec fond bleu */}
            <div className="flex items-center gap-3 mr-6 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 rounded-lg border border-blue-500/80">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-white font-bold text-sm whitespace-nowrap">
                Actualités Formations
              </span>
            </div>

            {/* Séparateur */}
            <div className="h-6 w-px bg-gray-400/50 mx-2"></div>

            {/* Date et news défilante */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <span className="text-cyan-700 text-sm font-semibold whitespace-nowrap bg-cyan-50/80 px-3 py-1 rounded-md border border-cyan-200/50">
                {currentNews.date}
              </span>
              
              <div className="flex-1 overflow-hidden">
                <div 
                  className={`text-gray-800 text-base font-medium whitespace-nowrap transition-all duration-300 ${
                    currentNews.clickable 
                      ? 'cursor-pointer hover:text-blue-700 hover:underline' 
                      : 'cursor-default hover:text-gray-900'
                  }`}
                  onClick={() => handleNewsClick(currentNews)}
                >
                  {currentNews.text}
                </div>
              </div>
            </div>

            {/* Indicateur de progression */}
            <div className="flex items-center gap-1.5 ml-6">
              {breakingNews.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentNewsIndex 
                      ? 'bg-blue-600 shadow-[0_0_6px_#2563eb]' 
                      : 'bg-gray-400/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Effet de séparation en bas */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-400/30 to-transparent"></div>
    </div>
  );
};

export default BreakingNewsBar;