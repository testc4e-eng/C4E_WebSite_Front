// 📂 Chemin : Frontend\src\components\Header.tsx
// 🎯 Rôle : Ce fichier définit le composant `Header` qui gère l'affichage du menu de navigation
// en version bureau et mobile, avec un effet sticky au scroll et un support du scroll vers sections.

// =========================
// Importation des dépendances
// =========================
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react'; // Icônes pour le menu burger
import { useNavigate, useLocation } from 'react-router-dom'; // Gestion navigation et URL

// =========================
// Composant principal Header
// =========================
const Header = () => {
  // 🔄 États locaux
  const [isScrolled, setIsScrolled] = useState(false); // True si la page est scrollée
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Gestion du menu mobile
  const navigate = useNavigate();
  const location = useLocation();

  // 📌 Détection du scroll pour appliquer un style différent (header fixe + blur)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll(); // Mise à jour immédiate au chargement
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 📌 Défilement automatique vers la section correspondant au hash (#id) dans l’URL
  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Si pas de hash, retour en haut de la page
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location]);

  // =========================
  // Liens de navigation
  // =========================
  const navigation = [
    { name: 'Accueil', href: '/#home' },
    { name: 'À Propos', href: '/About' },
    { name: 'Services', href: '/#services' },
    { name: 'Projets', href: '/Projects' },
    { name: 'Equipes', href: '/#team' },
    { name: 'Emploi', href: '/#emploi' },
    { name: 'Contact', href: '/#contact' },
  ];

  // 📌 Fonction de gestion de la navigation (scroll ou changement de page)
  const handleNavigation = (item: { href: string }) => {
    if (item.href.startsWith('/#')) {
      // Si c'est un lien avec ancre (#section)
      const hash = item.href.split('#')[1];
      if (location.pathname !== '/') {
        navigate('/#' + hash);
      } else {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
      setIsMobileMenuOpen(false);
    } else {
      // Navigation vers une page classique
      navigate(item.href);
      setIsMobileMenuOpen(false);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  };

  // 📌 Fonction pour la navigation vers la page de connexion
  const handleLogin = () => {
    navigate('/login');
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  // =========================
  // Rendu du composant
  // =========================
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-md shadow-md border-b border-gray-200'
          : 'bg-transparent shadow-none border-none'
      }`}
    >
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex justify-center items-center">
            <img
              src="/logo.png"
              alt="C4E Africa Logo"
              className="h-20 w-20 transition-transform duration-700 ease-in-out hover:rotate-6 hover:scale-110"
            />
          </div>

          {/* Nom + slogan */}
          <div className="text-center mt-2">
            <h1 className="text-xl font-bold text-gradient-primary">C4E AFRICA</h1>
            <p className="text-xs text-muted-foreground">
              Eau, Environnement, Énergie & Éducation
            </p>
          </div>

          {/* Menu version bureau */}
          <div className="hidden lg:flex items-center space-x-8">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item)}
                className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
              >
                {item.name}
              </button>
            ))}
            <button
              onClick={() => handleNavigation({ href: '/#contact' })}
              className="btn-accent"
            >
              Nous Contacter
            </button>
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-yellow-500 text-white hover:bg-yellow-600 rounded-lg transition-all duration-300 font-medium hover:shadow-md hover:scale-105"
            >
              Se Connecter
            </button>
          </div>

          {/* Bouton menu mobile (burger) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Menu mobile */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-border/50">
            <div className="flex flex-col space-y-4 pt-4">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item)}
                  className="text-left text-foreground hover:text-primary transition-colors duration-200 font-medium py-2"
                >
                  {item.name}
                </button>
              ))}
              <button
                onClick={() => handleNavigation({ href: '/#contact' })}
                className="btn-accent w-full mt-4"
              >
                Nous Contacter
              </button>
              <button
                onClick={handleLogin}
                className="w-full px-4 py-3 bg-yellow-500 text-white hover:bg-yellow-600 rounded-lg transition-all duration-300 font-medium mt-2"
              >
                Se Connecter
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

// =========================
// Export du composant
// =========================
export default Header;