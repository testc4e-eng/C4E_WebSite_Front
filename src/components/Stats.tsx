// 📂 Chemin : ./components/Stats.tsx
// 📌 Ajout d'un carrousel défilant d'images partenaires à la fin de la section

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const Stats = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) setIsVisible(true);
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [isVisible]);

  const partners = [
    "/partenaires/img1.jpg",
    "/partenaires/img2.jpg",
    "/partenaires/img3.jpg",
    "/partenaires/img4.jpg",
    "/partenaires/img5.jpg",
    "/partenaires/img6.jpg",
    "/partenaires/img7.jpg",
    "/partenaires/img8.jpg",
    "/partenaires/img9.jpg",
    "/partenaires/img10.jpg",
    "/partenaires/img11.jpg",
    "/partenaires/img12.jpg",
    "/partenaires/img13.jpg",
    "/partenaires/img14.jpg",
    "/partenaires/img15.jpg",
    "/partenaires/img16.jpg",
    "/partenaires/img17.jpg",
  ];

  return (
    <section id="stats" ref={sectionRef} className="py-20 bg-secondary/30">
      <div className="container mx-auto px-6">

        {/* --- Titre principal --- */}
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Résultats de l'Expérience Cumulée de Notre Équipe
          </h2>
          <p className="text-lg text-foreground/80 max-w-3xl mx-auto mb-12">
            L'expertise collective de nos collaborateurs se traduit par des solutions
            innovantes, un savoir-faire reconnu et un engagement durable au service de
            l'Afrique.
          </p>
        </div>

        {/* --- Statistiques clés --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-32">
          <div className={`text-center ${isVisible ? "animate-fade-in" : "opacity-0"}`}>
            <span className="text-5xl font-bold text-gradient-primary">+100</span>
            <p className="text-lg font-semibold mt-2">Projets réalisés</p>
          </div>
          <div className={`text-center ${isVisible ? "animate-fade-in" : "opacity-0"}`}>
            <span className="text-5xl font-bold text-gradient-primary">+25</span>
            <p className="text-lg font-semibold mt-2">Pays d'intervention</p>
          </div>
          <div className={`text-center ${isVisible ? "animate-fade-in" : "opacity-0"}`}>
            <span className="text-5xl font-bold text-gradient-primary">+50</span>
            <p className="text-lg font-semibold mt-2">Partenaires</p>
          </div>
          <div className={`text-center ${isVisible ? "animate-fade-in" : "opacity-0"}`}>
            <span className="text-5xl font-bold text-gradient-primary">+75</span>
            <p className="text-lg font-semibold mt-2">Années d'expérience</p>
          </div>
        </div>

        {/* --- Bloc À Propos --- */}
        <div className="relative bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl p-16 lg:p-24 flex flex-col lg:flex-row items-center gap-12 mb-20">
          <div className="flex-1 flex flex-col justify-center text-center lg:text-left">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              À Propos de <span className="text-gradient-primary">C4E AFRICA</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
              C4E AFRICA est un bureau d'études spécialisé dans les domaines de l'Eau,
              de l'Énergie, de l'Environnement et de l'Éducation.
            </p>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              C4E AFRICA apporte une expertise scientifique, une ingénierie innovante et
              des solutions durables pour un développement responsable à travers
              l'Afrique.
            </p>
            <button
              onClick={() => navigate("/about")}
              className="self-center lg:self-start px-8 py-3 bg-gradient-to-r from-accent to-primary text-white font-semibold rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              En savoir plus
            </button>
          </div>

          <div className="flex-1 relative flex justify-center lg:justify-end">
            <div className="absolute -top-8 left-1/2 lg:left-auto lg:-top-10 lg:right-0 bg-accent/20 rounded-full w-32 h-32 z-0"></div>
            <img
              src="/logo1.png"
              alt="C4E Africa Logo"
              className="relative w-56 md:w-64 h-auto rounded-2xl shadow-xl hover:scale-105 transition-transform z-10"
            />
          </div>
        </div>

        {/* --- Section Partenaires avec Titre Harmonisé --- */}
        <div className="mb-20">
          {/* Titre "Nos Partenaires" dans le même style */}
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-center text-foreground mb-4">
              Nos <span className="text-gradient-accent">Partenaires</span>
            </h3>
            <div className="w-24 h-1 bg-gradient-accent mx-auto rounded-full"></div>
          </div>

          {/* Espace ajouté entre le titre et le carrousel */}
          <div className="mt-8">
            {/* Carrousel défilant des partenaires */}
            <div className="overflow-hidden relative">
              <div className="flex gap-10 animate-scroll-slow w-max hover:[animation-play-state:paused]">
                {partners.concat(partners).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Partenaire ${i}`}
                    className="h-20 md:h-24 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Animation CSS du carrousel --- */}
      <style>{`
        @keyframes scroll-slow {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll-slow {
          animation: scroll-slow 40s linear infinite;
        }
      `}</style>
    </section>
  );
};

export default Stats;
