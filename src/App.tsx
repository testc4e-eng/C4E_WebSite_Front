// 📂 src/App.tsx — REFACTORISÉ avec DashboardLayout + ProtectedRoute

import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
import RHOffresDashboard from './components/AdminDashboard';
import TrainingPage from "./pages/TrainingPage";
import TimesheetSaisie from './pages/TaskAnalytics/TimesheetSaisie';
import TimesheetValidation from './pages/TaskAnalytics/TimesheetValidation';
import SuiviProjets from './pages/TaskAnalytics/SuiviProjets';
import AnalyticsDG from './pages/TaskAnalytics/AnalyticsDG';
import AlertesDG from './pages/TaskAnalytics/AlertesDG';
import GestionProjets from './pages/TaskAnalytics/GestionProjets';
import GestionMissionsDG from './pages/TaskAnalytics/GestionMissionsDG';
import DashboardProjets from './pages/TaskAnalytics/DashboardProjets';
import DashboardEquipe from './pages/TaskAnalytics/DashboardEquipe';
import DashboardTaches from './pages/TaskAnalytics/DashboardTaches';
import SuiviFinancierProjet from './pages/TaskAnalytics/SuiviFinancierProjet';
import SuiviFinancierProjetManager from './pages/TaskAnalytics/SuiviFinancierProjetManager';
import UsersAuditPage from './pages/UsersAuditPage';
import Forbidden from './pages/Forbidden';
import GestionEquipes from './pages/GestionEquipes';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminUsersPage from './pages/Admin/AdminUsersPage';
import RolesPermissionsPage from './pages/Admin/RolesPermissionsPage';
import PlatformSettingsPage from './pages/Admin/PlatformSettingsPage';
import SecurityBackupPage from './pages/Admin/SecurityBackupPage';

// ✅ NOUVEAUX IMPORTS Phase 5A/5D
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DashboardPersonnel from './pages/DashboardPersonnel';
import ProfilePage from './pages/ProfilePage';
import { LayoutProvider } from './hooks/useLayout';

function App() {
  const location = useLocation();

  // Pages protégées : pas de Header/Footer public
  const isProtectedPage =
    location.pathname === "/dashboard" ||
    location.pathname === "/admin-dashboard" ||
    location.pathname.startsWith("/admin/") ||
    location.pathname.startsWith("/dashboard/") ||
    location.pathname.startsWith("/timesheet/") ||
    location.pathname.startsWith("/tasks/") ||
    location.pathname.startsWith("/users/") ||
    location.pathname === "/profile" ||
    location.pathname === "/403";

  return (
    <LayoutProvider>
      <div className="App">

      {/* Header public — invisible sur pages protégées */}
      {!isProtectedPage && <Header />}

      <Routes>
        {/* ======================== */}
        {/* ROUTES PUBLIQUES         */}
        {/* ======================== */}
        <Route path="/" element={<Hero />} />
        <Route path="/about" element={<About />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/emploi" element={<Emploi />} />
        <Route path="/formulaire-stage" element={<FormulaireStage />} />
        <Route path="/formulaire-candidature" element={<FormulaireCandidature />} />
        <Route path="/formulaire-emploi" element={<FormulaireEmploi />} />
        <Route path="/training/:formationId" element={<TrainingPage />} />
        <Route path="/login" element={<Login />} />

        {/* ======================== */}
        {/* ROUTES PROTÉGÉES         */}
        {/* Wrappées dans Layout     */}
        {/* ======================== */}

        {/* Hub personnel — tous les rôles */}
        <Route path="/dashboard/personnel" element={
          <ProtectedRoute>
            <DashboardLayout>
              <DashboardPersonnel />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Profil — tous les rôles */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProfilePage />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Saisie temps — roles avec permission de saisie uniquement */}
        <Route path="/timesheet/saisie" element={<Navigate to="/timesheet/moi" replace />} />

        <Route path="/timesheet/moi" element={
          <ProtectedRoute permission="time_entries:read_own">
            <DashboardLayout>
              <TimesheetSaisie mode="mine" />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/timesheet/equipe" element={
          <ProtectedRoute allowedRoles={['CHEF_PROJET', 'DG', 'ADMIN']} permission="tasks:read_team">
            <DashboardLayout>
              <TimesheetSaisie mode="team" />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Compat URL legacy */}
        <Route path="/timesheet" element={<Navigate to="/dashboard/personnel" replace />} />

        <Route path="/tasks/my" element={
          <ProtectedRoute allowedRoles={['CHEF_PROJET']} permission="tasks:create">
            <Navigate to="/dashboard/task-analytics/taches" replace />
          </ProtectedRoute>
        } />

        <Route path="/tasks/validation" element={
          <ProtectedRoute allowedRoles={['DG', 'ADMIN']} permission="time_entries:read_all">
            <Navigate to="/dashboard/task-analytics/dg" replace />
          </ProtectedRoute>
        } />

        {/* Validation temps — managers uniquement */}
        <Route path="/timesheet/validation" element={
          <ProtectedRoute allowedRoles={['CHEF_PROJET']} permission="time_entries:validate">
            <DashboardLayout>
              <TimesheetValidation />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Analytics DG — DG et Admin seulement */}
        <Route path="/dashboard/task-analytics/dg" element={
          <ProtectedRoute permission="analytics:read_global">
            <DashboardLayout>
              <AnalyticsDG />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/task-analytics/gestion-missions" element={
          <ProtectedRoute allowedRoles={['DG', 'ADMIN']} permission="analytics:read_global">
            <DashboardLayout>
              <GestionMissionsDG />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/task-analytics/suivi-projets" element={
          <ProtectedRoute allowedRoles={['DG', 'ADMIN']}>
            <DashboardLayout>
              <SuiviProjets />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/task-analytics/suivi-financier" element={
          <ProtectedRoute allowedRoles={['DG', 'ADMIN']} permission="analytics:read_global">
            <DashboardLayout>
              <SuiviFinancierProjet />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/task-analytics/suivi-financier-manager" element={
          <ProtectedRoute allowedRoles={['CHEF_PROJET']}>
            <DashboardLayout>
              <SuiviFinancierProjetManager />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/task-analytics/alertes-dg" element={
          <ProtectedRoute allowedRoles={['DG', 'ADMIN']} permission="analytics:read_global">
            <DashboardLayout>
              <AlertesDG />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/task-analytics/alertes-dg/settings" element={
          <ProtectedRoute allowedRoles={['DG', 'ADMIN']} permission="analytics:read_global">
            <DashboardLayout>
              <AlertesDG />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/task-analytics/gestion-projets" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <DashboardLayout>
              <GestionProjets />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Analytics Projets — chefs de projet, DG, Admin */}
        <Route path="/dashboard/task-analytics/projets" element={
          <ProtectedRoute permission="projects:read_own">
            <DashboardLayout>
              <DashboardProjets />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Analytics Équipe — chefs de projet, DG, Admin */}
        <Route path="/dashboard/task-analytics/equipe" element={
          <ProtectedRoute permission="tasks:read_team">
            <DashboardLayout>
              <DashboardEquipe />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Analytics Tâches — chefs de projet, DG, Admin */}
        <Route path="/dashboard/task-analytics/taches" element={
          <ProtectedRoute permission="tasks:create">
            <DashboardLayout>
              <DashboardTaches />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Gestion des Equipes — DG / Admin / Chef de projet */}
        <Route path="/dashboard/equipes" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'DG', 'CHEF_PROJET']}>
            <DashboardLayout>
              <GestionEquipes />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Audit utilisateurs — DG et Admin */}
        <Route path="/dashboard/rh-offres" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'DG', 'CHEF_PROJET']} permission="rh:read_all">
            <DashboardLayout>
              <RHOffresDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/rh-offres" element={
          <ProtectedRoute allowedRoles={['ADMIN']} permission="rh:read_all">
            <DashboardLayout>
              <RHOffresDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <DashboardLayout>
              <AdminDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/projects" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'DG']} permission="projects:create">
            <DashboardLayout>
              <GestionProjets />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'DG']} permission="users:create">
            <DashboardLayout>
              <AdminUsersPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/roles" element={
          <ProtectedRoute allowedRoles={['ADMIN']} permission="users:read_all">
            <DashboardLayout>
              <RolesPermissionsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/settings" element={
          <ProtectedRoute allowedRoles={['ADMIN']} permission="users:read_all">
            <DashboardLayout>
              <PlatformSettingsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/security" element={
          <ProtectedRoute allowedRoles={['ADMIN']} permission="users:read_all">
            <DashboardLayout>
              <SecurityBackupPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/audit" element={
          <ProtectedRoute allowedRoles={['ADMIN']} permission="users:read_all">
            <DashboardLayout>
              <UsersAuditPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/users/audit" element={
          <ProtectedRoute allowedRoles={['ADMIN']} permission="users:read_all">
            <DashboardLayout>
              <UsersAuditPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* ======================== */}
        {/* DASHBOARDS RH EXISTANTS  */}
        {/* Conservés TELS QUELS     */}
        {/* ======================== */}
        <Route path="/dashboard" element={<Navigate to="/dashboard/personnel" replace />} />
        <Route path="/admin-dashboard" element={<Navigate to="/dashboard/rh-offres" replace />} />
        <Route path="/403" element={<Forbidden />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Footer public — invisible sur pages protégées */}
      {!isProtectedPage && <Footer />}

      </div>
    </LayoutProvider>
  );
}

export default App;
