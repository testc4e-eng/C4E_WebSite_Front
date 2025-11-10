/**
 * Composant Services
 * Chemin : WEBSITE-C4E-AFRICA-1\apps\Frontend\src\components\Services.tsx
 *
 * Affiche la page Services avec :
 * - Domaines d'expertise (Eau, Énergie, Environnement, Éducation)
 * - Projets récents (image, titre, description, année)
 * - Équipe (présentation des équipes principales)
 * - Opportunités d'emploi et stages (avec boutons vers formulaires)
 *
 * Utilise : React, TypeScript, Tailwind CSS, Framer Motion, React Router
 * Sections responsives et animées pour une meilleure expérience utilisateur
 */
import { Droplets, Zap, Leaf, GraduationCap, Briefcase, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Services = () => {
  const navigate = useNavigate();

  // --- Liste des services avec icônes, description et fonctionnalités ---
  const services = [
    {
      icon: Droplets,
      title: 'Eau',
      emoji: '💧',
      description: 'Solutions complètes pour la gestion des ressources hydriques',
      features: [
        'Modélisation hydrologique',
        'Qualité de l\'eau',
        'Assainissement AED',
        'Optimisation et Gestion intégrée de l\'eau',
        'Barrage et Inondation'
      ],
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Zap,
      title: 'Énergie',
      emoji: '🔋',
      description: 'Transition énergétique et solutions renouvelables',
      features: [
        'Intelligence Artificielle et Énergies renouvelables',
        'Efficacité énergétique',
        'Climat Finance',
        'Stockage d\'énergie'
      ],
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: Leaf,
      title: 'Environnement',
      emoji: '🌱',
      description: 'Protection et conservation de l\'environnement',
      features: [
        'Études d\'impact environnemental',
        'Changement climatique (modélisation et adaptation)',
        'Conservation de la biodiversité',
        'Gestion des écosystèmes'
      ],
      color: 'from-green-500 to-green-600'
    },
    {
      icon: GraduationCap,
      title: 'Éducation',
      emoji: '🎓',
      description: 'Formation et développement des capacités',
      features: [
        'Formations techniques',
        'Sensibilisation environnementale',
        'Développement des capacités',
        'Développement curriculaire'
      ],
      color: 'from-purple-500 to-purple-600'
    }
  ];

 const projects = [
  {
    title: "Étude d’élaboration d'un système d'aide à la décision (SAD) destiné à la gestion de la qualité des eaux de surface",
    category: "Eau",
    country: "Maroc",
    image: "/Projets/pg1.png",
    description: "Conception et développement d’un système d’aide à la décision (SAD) pour le suivi, l’évaluation et l’amélioration de la qualité des eaux de surface au Maroc, intégrant des indicateurs de performance environnementale et des outils de modélisation.",
    annee: "2025"
  },
  {
    title: "Élaboration de l’atlas des zones inondables (Province de Zagora)",
    category: "Eau",
    country: "Maroc",
    image: "/Projets/projet2.png",
    description: "Réalisation d’un inventaire et d’une modélisation des zones inondables de la province de Zagora, avec analyse hydrologique et hydraulique, afin de produire un atlas opérationnel pour la prévention des risques et la gestion durable du territoire.",
    annee: "2022-2024"
  },
  {
    title: "Élaboration d’une plateforme d’alerte précoce aux crues et d’amélioration de la gestion du domaine public hydraulique par télédétection dans le bassin du Haut Ziz",
    category: "Eau",
    country: "Maroc",
    image: "/Projets/projet19.png",
    description: "Développement d’une plateforme numérique intégrant la télédétection, les données hydrométéorologiques et des modèles hydrologiques pour anticiper les crues, suivre le domaine public hydraulique et renforcer la gestion durable des ressources en eau dans le bassin du Haut Ziz.",
    annee: "2021"
  }
];

  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        {/* --- Domaines d'Expertise --- */}
        <div className="text-center mb-16">
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-foreground mb-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Nos <span className="text-gradient-accent">Domaines d'Expertise</span>
          </motion.h2>
          <motion.p 
            className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Des solutions scientifiques innovantes pour répondre aux défis du développement durable en Afrique
          </motion.p>
          <motion.div 
            className="w-24 h-1 bg-gradient-to-r from-accent to-primary mx-auto mt-8 rounded-full"
            initial={{ width: 0 }}
            whileInView={{ width: 96 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          />
        </div>

        {/* Grille des Services */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <motion.div
                key={index}
                className="group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl border border-gray-100 hover:border-accent/30 transition-all duration-300 overflow-hidden"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                {/* Fond Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-accent/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* En-tête avec Icône et Titre */}
                <div className="flex items-start mb-6 relative z-10">
                  <div className={`flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} mr-6 shadow-md group-hover:scale-105 transition-transform duration-300`}>
                    <span className="text-2xl">{service.emoji}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-2xl font-bold text-foreground group-hover:text-accent transition-colors duration-300">
                        {service.title}
                      </h3>
                      <IconComponent className="h-7 w-7 text-accent/80 group-hover:text-accent transition-colors duration-300" />
                    </div>
                    <div className="w-12 h-1 bg-gradient-to-r from-accent to-primary rounded-full mt-2 group-hover:w-16 transition-all duration-300" />
                  </div>
                </div>

                {/* Description */}
                <p className="text-muted-foreground mb-6 leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
                  {service.description}
                </p>

                {/* Liste des Fonctionnalités */}
                <ul className="space-y-3 mb-6">
                  {service.features.map((feature, featureIndex) => (
                    <motion.li 
                      key={featureIndex}
                      className="flex items-center text-foreground group-hover:text-foreground/90 transition-colors duration-300"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: (index * 0.1) + (featureIndex * 0.05) }}
                      viewport={{ once: true }}
                    >
                      <div className="flex items-center justify-center w-6 h-6 bg-accent/10 rounded-full mr-4 group-hover:bg-accent/20 transition-colors duration-300">
                        <div className="w-2 h-2 bg-accent rounded-full" />
                      </div>
                      <span className="text-base font-medium">{feature}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* --- Séparateur --- */}
        <div className="my-16 border-t border-accent/20"></div>

        {/* --- Projets --- */}
        <div className="my-16">
          <div className="text-center mb-12">
            <motion.h2 
              className="text-4xl md:text-5xl font-bold text-foreground mb-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              Nos <span className="text-gradient-accent">Projets</span>
            </motion.h2>
            <motion.p 
              className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Découvrez nos réalisations concrètes qui transforment les communautés à travers l'Afrique
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {projects.map((project, index) => (
              <motion.div
                key={index}
                className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl border border-gray-100 transition-all duration-300"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4">
                    <span className="bg-accent text-white px-3 py-1 rounded-full text-sm font-medium">
                      {project.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <span className="mr-1">📍</span>
                    {project.country}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-accent transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">{project.description}</p>
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <div className="bg-secondary/50 rounded-lg p-3">
  <div className="text-sm font-medium text-accent mb-1">Période :</div>
  <div className="text-sm text-foreground">{project.annee}</div>
</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bouton centré */}
          <div className="text-center">
            <motion.button
              onClick={() => navigate('/projects')}
              className="px-8 py-3 bg-gradient-to-r from-accent to-primary text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Voir tous nos projets
            </motion.button>
          </div>
        </div>

        {/* --- Séparateur --- */}
        <div className="my-16 border-t border-accent/20"></div>

        {/* --- Équipe --- */}
<div 
  id="team" 
  className="text-center bg-gradient-to-b from-gray-50 to-gray-100 py-12 rounded-2xl mb-16"
>
  <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
    Notre <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">Équipe</span>
  </h2>
  <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-12">
    Des experts passionnés conjuguant savoir-faire scientifique et innovation technologique 
    pour relever les défis de l'eau, de l'environnement et du développement durable.
  </p>
 
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
    {/* Équipe Ressource en Eau */}
    <motion.div 
      className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-4 min-h-[160px] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-md border border-blue-300 flex flex-col justify-center"
      whileHover={{ scale: 1.02 }}
    >
      <h3 className="text-2xl font-bold text-blue-900 mb-2">Équipe Ressource en Eau</h3>
      <p className="text-base text-gray-800 leading-relaxed">
        Spécialisée dans la gestion intégrée des ressources en eau, l’hydrologie, la modélisation et 
        la planification durable des systèmes hydriques.
      </p>
    </motion.div>

    {/* Équipe Génie Civile */}
    <motion.div 
      className="bg-gradient-to-br from-teal-100 to-teal-200 rounded-2xl p-4 min-h-[160px] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-md border border-teal-300 flex flex-col justify-center"
      whileHover={{ scale: 1.02 }}
    >
      <h3 className="text-2xl font-bold text-teal-900 mb-2">Équipe Génie Civile</h3>
      <p className="text-base text-gray-800 leading-relaxed">
        Experte en infrastructures hydrauliques, génie rural, aménagements, et ouvrages 
        de protection contre les inondations.
      </p>
    </motion.div>
  </div>
</div>


        {/* --- Séparateur --- */}
        <div className="my-16 border-t border-accent/20"></div>

        {/* --- Emploi --- */}
        <div 
          id="emploi" 
          className="text-center bg-gradient-to-b from-amber-50 to-orange-100 py-12 rounded-2xl"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Opportunités <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-400">d'Emploi</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-12">
            Rejoignez une équipe dynamique et contribuez à des projets impactants en développement durable.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
            <motion.div 
              className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl p-6 min-h-[200px] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-md border border-amber-300 flex flex-col justify-center items-center"
              whileHover={{ scale: 1.02 }}
            >
              <Briefcase className="h-8 w-8 text-amber-600 mb-3" />
              <h3 className="text-xl font-bold text-amber-900 mb-2">Offres d'emploi et stages pré-embauche</h3>
              <p className="text-sm text-gray-700 leading-relaxed text-center mb-3">
                Découvrez nos opportunités de carrière et de stages pré-embauche.
              </p>
              <button
                onClick={() => navigate('/Emploi')}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-sm"
              >
                Voir les Offres
              </button>
            </motion.div>
            <motion.div 
              className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-6 min-h-[200px] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-md border border-blue-300 flex flex-col justify-center items-center"
              whileHover={{ scale: 1.02 }}
            >
              <Users className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="text-xl font-bold text-blue-900 mb-2">Stage et PFE</h3>
              <p className="text-sm text-gray-700 leading-relaxed text-center mb-4">
                Opportunités de stages et Projets de Fin d'Etudes pour étudiants motivés.
              </p>
              <button
                onClick={() => navigate('/formulaire-stage')}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-sm"
              >
                Voir les Stages
              </button>
            </motion.div>
            <motion.div 
              className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-6 min-h-[200px] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-md border border-green-300 flex flex-col justify-center items-center"
              whileHover={{ scale: 1.02 }}
            >
              <FileText className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="text-xl font-bold text-green-900 mb-2">Candidature spontanée</h3>
              <p className="text-sm text-gray-700 leading-relaxed text-center mb-4">
                Envoyez votre candidature même si aucune offre ne correspond à votre profil.
              </p>
              <button
                onClick={() => navigate('/formulaire-candidature')}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-sm"
              >
                Postuler
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
