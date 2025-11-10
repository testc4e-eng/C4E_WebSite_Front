// 📂 Chemin : ./pages/Index.tsx
// 📌 Ce fichier définit la page d'accueil “Index”
// Il assemble toutes les sections principales du site : Hero, Statistiques, À propos, Services, Projets, Équipe, Contact
// et inclut le Footer. Il ajoute également l'animation "fade-in" pour chaque section lorsqu'elle devient visible à l'écran.

import { useEffect } from 'react';

import Hero from '../components/Hero';
import Stats from '../components/Stats';
import Services from '../components/Services';
import About from '../components/About';
import Projects from '../components/Projects';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import Team from '../components/Team';

const Index = () => {
  useEffect(() => {
    // Animate elements on scroll
    const observerOptions = {
      threshold: 0.1, // Déclenchement lorsque 10% de l'élément est visible
      rootMargin: '0px 0px -50px 0px' // Décalage pour lancer l'animation légèrement avant
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in');
        }
      });
    }, observerOptions);

    // Observe all sections
    const sections = document.querySelectorAll('section');
    sections.forEach((section) => {
      observer.observe(section);
    });

    // Cleanup observer on component unmount
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main>
        <Hero />
        <Stats />
        <About />
        <Services />
        <Projects />
        <Team />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
