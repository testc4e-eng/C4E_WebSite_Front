// 📂 src/App.tsx

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
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const location = useLocation();

  // 👉 Pages sans Header et Footer
  const isProtectedPage =
    location.pathname === "/dashboard" ||
    location.pathname === "/admin-dashboard";

  return (
    <div className="App">

      {/* Header invisble sur pages protégées */}
      {!isProtectedPage && <Header />}

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
        
        {/* Login normal (garde Header/Footer) */}
        <Route path="/login" element={<Login />} />

        {/* Dashboards sans Header/Footer */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Footer invisible sur pages protégées */}
      {!isProtectedPage && <Footer />}
    </div>
  );
}

export default App;
