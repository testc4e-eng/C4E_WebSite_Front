// ============================================================
// Fichier : /components/About.jsx
// Description : Composant React "About" affichant la page À Propos,
// avec présentation de C4E AFRICA, sa mission, ses valeurs et ses partenaires.
// ============================================================
import { Target, Users, Award, Lightbulb } from 'lucide-react';
import { motion } from "framer-motion";

const About = () => {
  const values = [
    { icon: Lightbulb, title: 'Innovation', description: 'Nous développons des solutions créatives et technologiques pour relever les défis du développement durable.' },
    { icon: Users, title: 'Collaboration', description: 'Nous travaillons en partenariat avec les communautés locales et les organisations internationales.' },
    { icon: Award, title: 'Excellence', description: 'Nous maintenons les plus hauts standards de qualité dans tous nos projets et services.' },
    { icon: Target, title: 'Durabilité', description: "Nos solutions sont conçues pour avoir un impact positif à long terme sur l'environnement et les communautés." },
  ];
  
  const partners = [
    { name: "Direction de la recherche et la planification de l'eau", image: "/partenaires/img1.jpg" },
    { name: "ABHGZR", image: "/partenaires/img2.jpg" },
    { name: "STAVOM", image: "/partenaires/img3.jpg" },
    { name: "ABHDON", image: "/partenaires/img4.jpg" },
    { name: "ABHSM", image: "/partenaires/img5.jpg" },
    { name: "ABHL", image: "/partenaires/img6.jpg" },
    { name: "ABHS", image: "/partenaires/img7.jpg" },
    { name: "CDG INVEST", image: "/partenaires/img8.jpg" },
    { name: "ABHOER", image: "/partenaires/img9.jpg" },
    { name: "Conseil provincial de Sidi Ifni", image: "/partenaires/img10.jpg" },
    { name: "ABHT", image: "/partenaires/img11.jpg" },
    { name: "CM", image: "/partenaires/img12.jpg" },
    { name: "CBM", image: "/partenaires/img13.jpg" },
    { name: "Hydrauleader", image: "/partenaires/img14.jpg" },
    { name: "ABHM", image: "/partenaires/img15.jpg" },
    { name: "WWF", image: "/partenaires/img16.jpg" },
    { name: "Cid", image: "/partenaires/img17.jpg" }
  ];

  // Diviser les partenaires en deux groupes
  const firstHalf = partners.slice(0, Math.ceil(partners.length / 2));
  const secondHalf = partners.slice(Math.ceil(partners.length / 2));

  return (
    <div className="page-with-header">
      <main>
        {/* ============================================================
             Section principale : À propos
        ============================================================ */}
        <section id="about" className="py-20 bg-secondary/20">
          <div className="container mx-auto px-6">
            {/* Introduction */}
            <div className="max-w-4xl mx-auto text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                À Propos de <span className="text-gradient-primary">C4E AFRICA</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                C4E AFRICA est un bureau d'études spécialisé dans les domaines de l'Eau, de l'Énergie, de l'Environnement et de l'Éducation.
              </p>
              <div className="w-24 h-1 bg-gradient-accent mx-auto rounded-full"></div>
            </div>


            {/* Présentation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20 px-4 lg:px-0">
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                viewport={{ once: true }}
              >
                <p className="text-lg lg:text-xl text-gray-700 leading-relaxed">
                  Nous combinons recherche de pointe et solutions pratiques pour créer un impact social positif à travers l'Afrique.
                </p>

                <h4 className="text-2xl lg:text-3xl font-semibold text-green-600 mt-4">Notre Mission</h4>
                <p className="text-lg lg:text-xl text-gray-700 leading-relaxed">
                  Développer et mettre en œuvre des solutions scientifiques innovantes qui répondent aux défis critiques de l'eau, de l'énergie, de l'environnement et de l'éducation en Afrique.
                </p>

                <p className="text-lg lg:text-xl text-gray-700 leading-relaxed">
                  Nous nous engageons à créer un avenir plus durable et équitable en combinant excellence technique, innovation et engagement communautaire.
                </p>

                <ul className="list-disc list-inside text-gray-700 mt-4 space-y-2">
                  <li><strong>Valeurs :</strong> Innovation, Collaboration, Excellence, Durabilité</li>
                  <li><strong>Année de création :</strong> 2017</li>
                  <li><strong>Impact :</strong> Solutions concrètes dans plusieurs pays africains</li>
                </ul>
              </motion.div>

              <motion.div
                className="flex justify-center items-center"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                viewport={{ once: true }}
              >
                <img
                  src="/logo1.png"
                  alt="Notre Société"
                  className="rounded-3xl shadow-xl border-4 border-green-200 w-[350px] max-w-full h-auto hover:scale-105 transition-transform duration-500"
                />
              </motion.div>
            </div>

            {/* Valeurs */}
            <div className="mb-20">
              <h3 className="text-3xl font-bold text-center text-foreground mb-12">
                Nos <span className="text-gradient-accent">Valeurs</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {values.map((value, index) => {
                  const IconComponent = value.icon;
                  return (
                    <div key={index} className="text-center group">
                      <div className="w-20 h-20 bg-gradient-to-br from-accent to-accent-dark rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                        <IconComponent className="h-10 w-10 text-white" />
                      </div>
                      <h4 className="text-xl font-semibold text-foreground mb-4">{value.title}</h4>
                      <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION PARTENAIRES AVEC CARROUSEL INFINI */}
            <div className="mb-20">
              {/* Titre "Nos Partenaires" dans le même style */}
              <motion.div
                className="text-center mb-16"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h3 className="text-3xl font-bold text-center text-foreground mb-12">
                  Nos <span className="text-gradient-accent">Partenaires</span>
                </h3>
                <div className="w-24 h-1 bg-gradient-accent mx-auto rounded-full"></div>
              </motion.div>

              {/* Premier Carrousel Infini (défile vers la gauche) */}
              <div className="relative overflow-hidden py-12 mb-8">
                {/* Effet de dégradé sur les bords */}
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-secondary/20 to-transparent z-10"></div>
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-secondary/20 to-transparent z-10"></div>
                
                <motion.div
                  className="flex space-x-10"
                  animate={{
                    x: [0, -1280]
                  }}
                  transition={{
                    x: {
                      repeat: Infinity,
                      repeatType: "loop",
                      duration: 40,
                      ease: "linear",
                    }
                  }}
                >
                  {/* Premier groupe de partenaires avec leurs couleurs originales */}
                  {[...firstHalf, ...firstHalf].map((partner, idx) => (
                    <motion.div
                      key={idx}
                      className="flex-shrink-0 w-64 h-40 bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-200/70 hover:shadow-2xl transition-all duration-300 cursor-pointer flex items-center justify-center group"
                      whileHover={{ 
                        scale: 1.08,
                        y: -8,
                        transition: { duration: 0.3 }
                      }}
                    >
                      <img
                        src={partner.image}
                        alt={partner.name}
                        className="w-full h-full object-contain transition-all duration-500 max-w-[180px] max-h-[100px] group-hover:scale-125"
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Deuxième Carrousel Infini (défile vers la droite - sens inverse) */}
              <div className="relative overflow-hidden py-12">
                {/* Effet de dégradé sur les bords */}
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-secondary/20 to-transparent z-10"></div>
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-secondary/20 to-transparent z-10"></div>
                
                <motion.div
                  className="flex space-x-10"
                  animate={{
                    x: [-1280, 0]
                  }}
                  transition={{
                    x: {
                      repeat: Infinity,
                      repeatType: "loop",
                      duration: 40,
                      ease: "linear",
                    }
                  }}
                >
                  {/* Deuxième groupe de partenaires avec leurs couleurs originales */}
                  {[...secondHalf, ...secondHalf].map((partner, idx) => (
                    <motion.div
                      key={idx}
                      className="flex-shrink-0 w-64 h-40 bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-200/70 hover:shadow-2xl transition-all duration-300 cursor-pointer flex items-center justify-center group"
                      whileHover={{ 
                        scale: 1.08,
                        y: -8,
                        transition: { duration: 0.3 }
                      }}
                    >
                      <img
                        src={partner.image}
                        alt={partner.name}
                        className="w-full h-full object-contain transition-all duration-500 max-w-[180px] max-h-[100px] group-hover:scale-125"
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Ligne de séparation décorative */}
              <div className="flex items-center justify-center mt-20 mb-12">
                <div className="w-40 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"></div>
                <div className="mx-6 w-4 h-4 bg-primary rounded-full"></div>
                <div className="w-40 h-1 bg-gradient-to-r from-transparent via-accent to-transparent rounded-full"></div>
              </div>

              {/* Texte discret en bas */}
              <motion.p 
                className="text-center text-gray-600 text-base font-light"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                viewport={{ once: true }}
              >
                Un réseau de partenaires engagés pour le développement durable de l'Afrique
              </motion.p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default About;
