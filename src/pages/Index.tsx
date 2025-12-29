import { Navigate } from 'react-router-dom';

// This file exists as a fallback - the actual index route is handled by App.tsx
// Redirect to splash screen to avoid any conflicts
const Index = () => {
  return <Navigate to="/" replace />;
};

export default Index;