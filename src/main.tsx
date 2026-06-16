// Import des bibliothèques et fichiers essentiels : React pour JSX, ReactDOM pour le rendu,
// BrowserRouter pour le routage, App comme composant principal, et les styles globaux.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Création de la racine React pour le rendu
// 'root' est l'élément HTML où l'application sera injectée

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // StrictMode active les vérifications supplémentaires en développement
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
