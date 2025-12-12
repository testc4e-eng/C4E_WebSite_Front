// 📂 Chemin : ./components/FlashNewsBar.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FlashNewsBar = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const flashNews = [
    {
      id: "wasp",
      title: "Formation WASP - En cours",
      status: "En cours",
      statusColor: "bg-emerald-500",
      link: "/training/wasp",
      icon: "🌊",
      description: "Modélisation hydrologique avancée"
    },
    {
      id: "swat",
      title: "Formation SWAT - Bientôt",
      status: "Bientôt",
      statusColor: "bg-blue-500",
      link: "/training/swat",
      icon: "📊",
      description: "Analyse des pratiques culturales"
    },
    {
      id: "hec-ras",
      title: "Formation HEC-RAS - Bientôt",
      status: "Bientôt",
      statusColor: "bg-indigo-500",
      link: "/training/hec-ras",
      icon: "⚡",
      description: "Modélisation hydraulique expert"
    },
    {
      id: "hms",
      title: "Formation HSM - Bientôt",
      status: "Bientôt",
      statusColor: "bg-purple-500",
      link: "/training/hms",
      icon: "💧",
      description: "Simulation hydrologique complète"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % flashNews.length);
    }, 3500); // Change toutes les 3.5 secondes

    return () => clearInterval(interval);
  }, [flashNews.length]);

  const handleNewsClick = (link: string) => {
    navigate(link);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (isCollapsed) {
    return (
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-50">
        <button
          onClick={toggleCollapse}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-l-2xl shadow-2xl hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-1/2 transform -translate-y-1/2 w-80 bg-white/95 backdrop-blur-lg rounded-l-2xl shadow-2xl border border-gray-200/50 z-50 overflow-hidden">
      
      {/* En-tête avec bouton de fermeture */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white p-4 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping absolute"></div>
              <div className="w-3 h-3 bg-emerald-500 rounded-full relative"></div>
            </div>
            <div>
              <h3 className="font-bold text-lg">FLASH NEWS</h3>
              <p className="text-blue-100 text-xs">Formations en hydrologie</p>
            </div>
          </div>
          <button
            onClick={toggleCollapse}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Indicateurs de progression */}
        <div className="flex justify-center gap-1 mt-3">
          {flashNews.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white w-6' 
                  : 'bg-white/30 w-2'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Contenu défilant */}
      <div className="h-48 overflow-hidden bg-gradient-to-br from-gray-50 to-white">
        <div 
          className="transition-transform duration-700 ease-in-out"
          style={{ transform: `translateY(-${currentIndex * 100}%)` }}
        >
          {flashNews.map((news, index) => (
            <div
              key={news.id}
              className="h-48 flex flex-col justify-center p-6 cursor-pointer group hover:bg-white/80 transition-all duration-300 border-b border-gray-100/50"
              onClick={() => handleNewsClick(news.link)}
            >
              <div className="flex items-start gap-4">
                {/* Icône */}
                <div className="text-3xl transform group-hover:scale-110 transition-transform duration-300">
                  {news.icon}
                </div>
                
                {/* Contenu */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`${news.statusColor} text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm`}>
                      {news.status}
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-gray-900 text-sm leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                    {news.title}
                  </h4>
                  
                  <p className="text-gray-600 text-xs leading-relaxed mb-3">
                    {news.description}
                  </p>

                  {/* Bouton d'action */}
                  <div className="flex items-center justify-between">
                    <span className="text-blue-600 text-xs font-semibold group-hover:translate-x-1 transition-transform">
                      Explorer la formation
                    </span>
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 group-hover:scale-110 transition-all duration-300">
                      <svg 
                        className="w-4 h-4 text-blue-600" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M9 5l7 7-7 7" 
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barre de progression individuelle */}
              <div className="mt-3">
                <div className="w-full bg-gray-200/50 rounded-full h-1">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full transition-all duration-3500 ease-linear"
                    style={{ 
                      width: currentIndex === index ? '100%' : '0%' 
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pied de page */}
      <div className="bg-gray-50/80 p-3 border-t border-gray-200/50">
        <div className="text-center">
          <p className="text-gray-600 text-xs font-medium">
            {currentIndex + 1} / {flashNews.length}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Cliquez pour découvrir
          </p>
        </div>
      </div>
    </div>
  );
};

export default FlashNewsBar;