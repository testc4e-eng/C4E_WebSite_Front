// 📂 Chemin : src/components/Projects.tsx
// 🎯 Rôle : Ce composant affiche la section "Projets" avec un système de filtres par catégorie,
// une grille responsive des projets, et un bouton "Plus" pour afficher davantage de projets.
// Les projets sont listés dans un tableau statique (mock data).

// =========================
// Importation des dépendances
// =========================
import { useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react'; // Icônes

// =========================
// Composant principal Projects
// =========================
const Projects = () => {
  // 📌 État pour gérer le filtre actif ("Tous", "Eau", "Énergie", etc.)
  const [activeFilter, setActiveFilter] = useState('Tous');

  // 📌 État pour gérer l’affichage de tous les projets ou seulement un aperçu (6 premiers)
  const [showAll, setShowAll] = useState(false);

  // 📌 Liste des filtres disponibles
  const filters = ['Tous', 'Eau', 'Énergie', 'Environnement', 'Éducation'];

  // 📌 Liste des projets (mock data, pourrait être remplacée par une API plus tard)
const projects = [

  // 💧 Domaine : Eau
  {
    title: "Élaboration de l’atlas des zones inondables – Province de Zagora",
    category: "Eau",
    country: "Maroc",
    image: "/Projets/projet2.png",
    description: "Réalisation d’un inventaire et d’une modélisation des zones inondables de la province de Zagora, avec analyse hydrologique et hydraulique, afin de produire un atlas opérationnel pour la prévention des risques et la gestion durable du territoire.",
    annee: "2022–2024"
  },

  // ⚡ Domaine : Énergie
  {
    title: "Cartographie des panneaux solaires par image satellitaire",
    category: "Énergie",
    country: "Maroc",
    image: "/Projets/prjEnergie1.jpg",
    description: "Utilisation d’images satellitaires open source pour repérer les installations photovoltaïques et analyser leur évolution, en évaluant l’impact de l’énergie solaire sur les ressources en eau.",
    annee: "2024"
  },

  // 🎓 Domaine : Éducation
  {
    title: "Étude d’évaluation des impacts des changements climatiques sur les ressources en eau du bassin du Sebou",
    category: "Éducation",
    country: "Maroc",
    image: "/Projets/prjEducation1.jpg",
    description: "Analyse de la vulnérabilité hydrologique du bassin du Sebou face aux scénarios climatiques futurs et formation des cadres à l’évaluation et la gestion des impacts climatiques.",
    annee: "2023"
  }

];




 // 📌 Filtrage des projets par catégorie
  const filteredProjects = activeFilter === 'Tous' 
    ? projects 
    : projects.filter(project => project.category === activeFilter);

  // 📌 Gestion de l’affichage (6 premiers ou tous les projets)
  const displayedProjects = showAll ? filteredProjects : filteredProjects.slice(0, 6);

  // 📌 Fonction pour basculer l’état "voir plus"
  const toggleShowAll = () => {
    setShowAll(!showAll);
  };

  // =========================
  // Rendu du composant
  // =========================

return (
  // Ajout de pt-24 pour créer un espace entre le Header et le contenu
 <div className="page-with-header">
      <main>
        <section id="projects" className="pt-20 md:pt-24 pb-20 bg-background">
          <div className="container mx-auto px-6">
            {/* Titre + Description */}
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Nos <span className="text-gradient-accent">Projets</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12">
                Découvrez nos réalisations concrètes qui transforment les communautés à travers le Maroc
              </p>

              {/* Filters */}
              <div className="flex flex-wrap justify-center gap-4 mb-12">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setActiveFilter(filter);
                      setShowAll(false);
                    }}
                    className={`px-6 py-3 rounded-full font-medium transition-all ${
                      activeFilter === filter
                        ? 'bg-gradient-accent text-white shadow-medium'
                        : 'bg-secondary text-foreground hover:bg-accent/10 hover:text-accent'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedProjects.map((project, index) => (
                <div key={index} className="card-elevated overflow-hidden group animate-fade-up" style={{ animationDelay: `${index * 0.2}s` }}>
                  <div className="relative overflow-hidden">
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4">
                      <span className="bg-accent text-white px-3 py-1 rounded-full text-sm font-medium">
                        {project.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      {project.country}
                    </div>

                    <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-accent transition-colors">
                      {project.title}
                    </h3>

                    <p className="text-muted-foreground mb-4 leading-relaxed">
                      {project.description}
                    </p>

                    <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                      <div className="text-sm font-medium text-accent mb-1">Année:</div>
                      <div className="text-sm text-foreground">{project.annee}</div>
                    </div>
                    {/*
                    <button className="flex items-center text-accent font-medium hover:text-accent-dark transition-colors group">
                      Voir le projet
                      <ExternalLink className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    */}
                  </div>
                </div>
              ))}
            </div>

             {/* 🟡 Bouton "Voir plus" (affiché uniquement si + de 6 projets) */}
            {!showAll && filteredProjects.length > 6 && (
              <div className="text-center mt-12 animate-fade-in">
                <button
                  onClick={toggleShowAll}
                  className="px-8 py-3 bg-gradient-to-r from-accent to-primary text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  Plus
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
);
};
// =========================
// Export du composant
// =========================
export default Projects;