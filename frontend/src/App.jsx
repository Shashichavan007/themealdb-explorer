import { Routes, Route, Navigate, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MealDetailPage from './pages/MealDetailPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand">TheMealDB Explorer</Link>
          <nav className="topnav">
            <a href="#search">Search</a>
            <a href="#browse">Browse</a>
            <a href="#discover">Discover</a>
            <Link to="/admin">Admin</Link>
          </nav>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/meal/:id" element={<MealDetailPage />} />
            <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
