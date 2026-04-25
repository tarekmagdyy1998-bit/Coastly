import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar, Footer, BottomNav } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { RequestsPage } from './pages/RequestsPage';
import { NegotiationsPage } from './pages/NegotiationsPage';
import { OfficePortalPage } from './pages/OfficePortalPage';
import { OfficeBookingsPage } from './pages/OfficeBookingsPage';
import { OfficeProfilePage } from './pages/OfficeProfilePage';
import { AIMatchingPage } from './pages/AIMatchingPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LegalPage } from './pages/LegalPage';
import { ChaletDetailsPage } from './pages/ChaletDetailsPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { Toaster } from 'sonner';
import { AuthModal } from './components/AuthModal';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-salt selection:bg-coral/20 selection:text-coral">
        <Navbar />
        <AuthModal />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/chalet/:id" element={<ChaletDetailsPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/negotiations" element={<NegotiationsPage />} />
            <Route path="/office" element={<OfficePortalPage />} />
            <Route path="/office/bookings" element={<OfficeBookingsPage />} />
            <Route path="/office/:officeId" element={<OfficeProfilePage />} />
            <Route path="/ai-matching" element={<AIMatchingPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/u/:userId" element={<PublicProfilePage />} />
            <Route path="/legal" element={<LegalPage />} />
          </Routes>
        </main>
        <Footer />
        <BottomNav />
        <Toaster position="bottom-center" richColors />
      </div>
    </Router>
  );
}
