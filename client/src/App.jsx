//import third party libraries
import { Routes, Route, Navigate } from 'react-router-dom';
// Admin / Auth
import Dashboard from './Dashboard/jsx/Dashboard.jsx';
import PrintQueueDetailPage from './Dashboard/jsx/PrintQueueDetailPage.jsx';
import VerifyPage from './Dashboard/jsx/VerifyPage.jsx';

function App() {
  const setUser = () => {};
  return (
    <Routes>
      {/* ===== DASHBOARD (auth bypassed for rebuild) ===== */}
      <Route path="/dashboard/*" element={<Dashboard setUser={setUser} />} />
      <Route path="/dashboard/print-queue/:coaId" element={<PrintQueueDetailPage />} />
      <Route path="/dashboard/verify" element={<VerifyPage />} />
      {/* Anything else lands on the dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;