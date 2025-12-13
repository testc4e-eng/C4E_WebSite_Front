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

  // 🌿 Domaine : Environnement
  {
    title: "Étude d’évaluation de l’envasement de la retenue du barrage Ahmed El Hansali",
    category: "Environnement",
    country: "Maroc",
    image: "/Projets/projet16.png",
    description: "Évaluation de l’envasement du barrage Ahmed El Hansali à travers des analyses bathymétriques et une modélisation sédimentaire, visant à proposer des mesures de gestion et de lutte antiérosive pour préserver la capacité utile de la retenue.",
    annee: "2023"
  },
  {
    title: "Étude d’évaluation des apports solides sur la section aménagée d’oued Martil entre le pont de Tamuda et le pont de Torreta à Tétouan",
    category: "Environnement",
    country: "Maroc",
    image: "/Projets/projet15.png",
    description: "Analyse des apports solides et de la dynamique sédimentaire dans la section aménagée de l’oued Martil afin de proposer des solutions techniques de gestion, réduire les risques d’inondation et améliorer l’intégration paysagère du site.",
    annee: "2023"
  },
  {
    title: "Étude de détermination du transport solide au niveau du barrage Sidi Mohamed Ben Abdellah (SMBA)",
    category: "Environnement",
    country: "Maroc",
    image: "/Projets/projet17.png",
    description: "Analyse et quantification du transport solide vers la retenue du barrage SMBA afin d’identifier les zones sources de sédiments et définir des mesures de lutte contre l’envasement pour prolonger la durée de vie du barrage.",
    annee: "2022"
  },

  // 💧 Domaine : Eau
  {
    title: "Étude de faisabilité de sites potentiels de petits barrages dans la zone d’action de l’Agence du Bassin Hydraulique du Sebou",
    category: "Eau",
    country: "Maroc",
    image: "/Projets/projet5.png",
    description: "Identification et évaluation des sites favorables à la réalisation de petits barrages dans le bassin du Sebou, incluant étude hydrologique, géotechnique, conception sommaire et évaluation environnementale pour soutenir la gestion durable des ressources en eau.",
    annee: "2024–2025"
  },
  {
    title: "Élaboration d’une plateforme d’alerte précoce aux crues et d’amélioration de la gestion du domaine public hydraulique par télédétection dans le bassin du Haut Ziz",
    category: "Eau",
    country: "Maroc",
    image: "/Projets/projet19.png",
    description: "Développement d’une plateforme numérique intégrant télédétection, données hydrométéorologiques et modèles hydrologiques pour anticiper les crues, suivre le domaine public hydraulique et renforcer la gestion durable des ressources en eau dans le bassin du Haut Ziz.",
    annee: "2021"
  },
  {
    title: "Élaboration de l’atlas des zones inondables – Lot 02 (Province de Zagora)",
    category: "Eau",
    country: "Maroc",
    image: "/Projets/projet2.png",
    description: "Réalisation d’un inventaire et d’une modélisation des zones inondables de la province de Zagora, avec analyse hydrologique et hydraulique, afin de produire un atlas opérationnel pour la prévention des risques et la gestion durable du territoire.",
    annee: "2022–2024"
  },

  // ⚡ Domaine : Énergie
  {
    title: "Évaluation technique et étude du marché du projet SUNAIR FOUNTAIN",
    category: "Énergie",
    country: "Maroc",
    image: "/Projets/prjEnergie2.png",
    description: "Évaluation technique et étude du marché d’un système innovant de production d’eau potable à partir de l’humidité atmosphérique, alimenté par énergie solaire. Analyse de la performance, du rendement, de la qualité de l’eau et de la viabilité économique du dispositif.",
    annee: "2024"
  },
  {
    title: "Cartographie des panneaux solaires par image satellitaire",
    category: "Énergie",
    country: "Maroc",
    image: "/Projets/prjEnergie1.jpg",
    description: "Utilisation d’images satellitaires open source pour repérer les installations photovoltaïques et analyser leur évolution. Le projet évalue l’impact de l’énergie solaire sur les nappes souterraines et soutient la gestion durable des ressources en eau.",
    annee: "2024"
  },

  // 🎓 Domaine : Éducation
  {
    title: "Étude d’évaluation des impacts des changements climatiques sur les ressources en eau du bassin du Sebou",
    category: "Éducation",
    country: "Maroc",
    image: "/Projets/prjEducation1.jpg",
    description: "Analyse de la vulnérabilité hydrologique du bassin du Sebou face aux scénarios climatiques futurs et formation des cadres de l’Agence du Bassin Hydraulique du Sebou sur l’évaluation et la gestion des impacts climatiques.",
    annee: "2023"
  },
  {
    title: "Développement des curriculums d’un cycle d’ingénieur filière Eau pour l’IAV Agadir",
    category: "Éducation",
    country: "Maroc",
    image: "/Projets/prjEducation2.jpg",
    description: "Conception et structuration d’une nouvelle filière d’ingénierie en gestion et développement des ressources en eau à l’IAV Agadir, incluant les programmes, objectifs pédagogiques et approches de formation pratique et de recherche.",
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