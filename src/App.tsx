// 📂 Chemin : src/App.tsx
// Mise à jour pour exclure Header et Footer sur la page Dashboard (et Login pour cohérence).

import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import About from './components/About';
import Projects from './components/Projects';
import NotFound from './pages/NotFound';
import Hero from './components/Hero';
import Stats from './components/Stats';
import Contact from './components/Contact';
import FormulaireStage from './components/formulaire-stage';
import FormulaireCandidature from './components/formulaire-candidature';
import Emploi from './components/Emploi';
import FormulaireEmploi from './components/formulaire-emploi';
import Login from './components/login';
import Dashboard from './components/Dashboard'; // Nouveau import
import AdminDashboard from './components/AdminDashboard';
function App() {
  const location = useLocation();
  const isProtectedPage = location.pathname === '/dashboard' || location.pathname === '/login' ||
  location.pathname === '/admin-dashboard';
  return (
    <div className="App">
      {/* --- Header global (exclu sur pages protégées) --- */}
      {!isProtectedPage && <Header />}
      
      {/* --- Définition des routes --- */}
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/about" element={<About />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/emploi" element={<Emploi />} />
        <Route path="/formulaire-stage" element={<FormulaireStage />} />
        <Route path="/formulaire-candidature" element={<FormulaireCandidature />} />
        <Route path="/formulaire-emploi" element={<FormulaireEmploi />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} /> {/* Route Dashboard sans Header/Footer */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* --- Footer global (exclu sur pages protégées) --- */}
      {!isProtectedPage && <Footer />}
    </div>
  );
}

export default App;