// ================================================
// 📂 Chemin : /Frontend/src/components/Footer.tsx
// 📌 Description : Composant "Footer"
// ================================================

import { MapPin, Phone, Mail, Linkedin, Facebook } from 'lucide-react';
import c4eLogo from '../assets/c4e-logo.png';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // ✅ Nouveau tableau de navigation
  const navigation = [
    { name: 'Accueil', href: '/#home' },
    { name: 'À Propos', href: '/About' },
    { name: 'Services', href: '/#services' },
    { name: 'Projets', href: '/Projects' },
    { name: 'Equipes', href: '/#Team' },
    { name: 'Contact', href: '/#contact' },
  ];

  const services = [
    { name: 'Gestion de l\'eau', href: '#services' },
    { name: 'Énergies renouvelables', href: '#services' },
    { name: 'Études environnementales', href: '#services' },
    { name: 'Formation technique', href: '#services' }
  ];

  return (
    <footer className="bg-primary text-white">
      <div className="container mx-auto px-6">
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Société */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <img src={c4eLogo} alt="C4E Africa Logo" className="h-12 w-auto" />
              <div>
                <h3 className="text-xl font-bold">C4E AFRICA</h3>
                <p className="text-sm text-white/80">Solutions Durables</p>
              </div>
            </div>
            <p className="text-white/80 leading-relaxed mb-6">
              Façonnons un avenir durable pour l'Afrique grâce à des solutions 
              scientifiques innovantes dans l'eau, l'énergie, l'environnement et l'éducation.
            </p>

            {/* Réseaux sociaux */}
            <div className="flex space-x-4">
              <a href="https://www.linkedin.com/company/c4e-africa" target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://www.facebook.com/C4EAFRICA" target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Navigation</h4>
            <ul className="space-y-3">
              {navigation.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-white/80 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Nos Services</h4>
            <ul className="space-y-3">
              {services.map((service, index) => (
                <li key={index}>
                  <a
                    href={service.href}
                    className="text-white/80 hover:text-accent transition-colors"
                  >
                    {service.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Contact</h4>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <p className="text-white/80 text-sm">
                  75 Boulevard d’Anfa <br /> Casablanca, Maroc
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-accent flex-shrink-0" />
                <p className="text-white/80">+212 522229877</p>
              </div>
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white/80">contact@c4eafrica.com</p>
                  <p className="text-white/80">info@c4eafrica.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bas de page */}
        <div className="py-6 border-t border-white/10 text-center">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-white/60 text-sm">
              © {currentYear} C4E AFRICA. Tous droits réservés.
            </p>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-white/60 hover:text-accent transition-colors">Politique de confidentialité</a>
              <a href="#" className="text-white/60 hover:text-accent transition-colors">Mentions légales</a>
              <a href="#" className="text-white/60 hover:text-accent transition-colors">CGU</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
