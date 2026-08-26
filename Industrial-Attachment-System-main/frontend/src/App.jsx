import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Vacancies from './pages/Vacancies';
import Applications from './pages/Applications';
import ManageJobs from './pages/ManageJobs';
import ManageUsers from './pages/ManageUsers';
import useAuthStore from './store/authStore';

const PrivateRoute = ({ children }) => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    if (!isAuthenticated) return <Navigate to="/login" />;
    return children;
};

const ApplicantRoute = ({ children }) => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const userRole = useAuthStore(state => state.user?.role);
    if (!isAuthenticated) return <Navigate to="/login" />;
    return ['ADMIN', 'HR'].includes(userRole) ? <Navigate to="/dashboard" /> : children;
};

const ManagementRoute = ({ children }) => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const userRole = useAuthStore(state => state.user?.role);
    if (!isAuthenticated) return <Navigate to="/login" />;
    return ['ADMIN', 'HR'].includes(userRole) ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/profile" element={<ApplicantRoute><Dashboard><Profile /></Dashboard></ApplicantRoute>} />
          <Route path="/vacancies" element={<PrivateRoute><Dashboard><Vacancies /></Dashboard></PrivateRoute>} />
          <Route path="/applications" element={<ApplicantRoute><Dashboard><Applications /></Dashboard></ApplicantRoute>} />
          <Route path="/manage-jobs" element={<ManagementRoute><Dashboard><ManageJobs /></Dashboard></ManagementRoute>} />
          <Route path="/manage-users" element={<ManagementRoute><Dashboard><ManageUsers /></Dashboard></ManagementRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
