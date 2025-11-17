// 📂 Chemin : Frontend\src\components\Header.tsx
import { useState, useEffect } from 'react';
import { Menu, X, LogIn, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location]);

  const navigation = [
    { name: 'Accueil', href: '/#home' },
    { name: 'À Propos', href: '/About' },
    { name: 'Services', href: '/#services' },
    { name: 'Projets', href: '/Projects' },
    { name: 'Equipe', href: '/#team' },
    { name: 'Emploi', href: '/#emploi' },
    { name: 'Contact', href: '/#contact' },
  ];

  const handleNavigation = (item: { href: string }) => {
    if (item.href.startsWith('/#')) {
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
      navigate(item.href);
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogin = () => {
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-2xl border-b border-blue-100'
          : 'bg-white/90 backdrop-blur-lg shadow-lg border-b border-blue-50'
      }`}
    >
      <nav className="container mx-auto px-6">
        <div className="flex items-center justify-between py-4">
          
          {/* Logo + Nom avec style élégant */}
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <img
                src="/logo.png"
                alt="C4E Africa Logo"
                className="h-16 w-16 transition-all duration-700 ease-out group-hover:scale-110 group-hover:rotate-3"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-green-400/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            
            <div className="text-left">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                C4E AFRICA
              </h1>
              <p className="text-sm text-gray-600 font-medium tracking-wide">
                Eau • Environnement • Énergie • Éducation
              </p>
            </div>
          </div>

          {/* Menu desktop - Style moderne */}
          <div className="hidden lg:flex items-center space-x-8">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item)}
                className="relative text-gray-700 hover:text-blue-600 transition-all duration-300 font-semibold group"
              >
                {item.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleNavigation({ href: '/#contact' })}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 font-semibold shadow-lg"
              >
                Nous Contacter
              </button>
              
              <button
                onClick={handleLogin}
                className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-lg group"
                title="Se Connecter"
              >
                <LogIn className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Menu mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl hover:shadow-lg transition-all duration-300"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Menu mobile déroulant */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-lg">
            <div className="py-6 space-y-4">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item)}
                  className="block w-full text-left px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 font-semibold"
                >
                  {item.name}
                </button>
              ))}
              
              <div className="pt-4 space-y-3 border-t border-gray-200/50">
                <button
                  onClick={() => handleNavigation({ href: '/#contact' })}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-semibold"
                >
                  Nous Contacter
                </button>
                
                <button
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-semibold"
                >
                  <LogIn className="h-5 w-5" />
                  <span>Se Connecter</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;