// 📂 Chemin : ./pages/NotFound.tsx
// 📌 Ce fichier définit la page "404 Not Found"
// Il est affiché lorsque l'utilisateur tente d'accéder à une route inexistante.
// La page affiche un message 404, un texte explicatif, et un lien pour revenir à l'accueil.
// De plus, elle loggue l'URL non trouvée dans la console pour le suivi.

import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
