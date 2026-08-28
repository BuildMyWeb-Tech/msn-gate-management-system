import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MenuProvider } from "./context/MenuContext";
import AppLayout    from "./components/AppLayout";
import Login        from "./pages/Login";
import Dashboard    from "./pages/Dashboard";
import VisitorList  from "./pages/visitors/VisitorList";
import VisitorForm  from "./pages/visitors/VisitorForm";
import VehicleList  from "./pages/vehicles/VehicleList";
import VehicleForm  from "./pages/vehicles/VehicleForm";
import Gates        from "./pages/setup/Gates";
import Securities   from "./pages/setup/Securities";
import Designations from "./pages/setup/Designations";
import PatrolPoints from "./pages/setup/PatrolPoints";
import CompVehicles from "./pages/setup/CompVehicles";
import PatrolPlan   from "./pages/setup/PatrolPlan";

function ComingSoon({ title }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:12}}>
      <div style={{fontSize:48}}>🚧</div>
      <h2 style={{fontWeight:700,fontSize:20}}>{title}</h2>
      <p style={{color:"var(--text3)",fontSize:14}}>This page is coming soon</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}>
        <div style={{textAlign:"center"}}><div className="spinner" style={{margin:"0 auto 16px"}}/><div style={{fontSize:13,color:"var(--text3)"}}>Loading...</div></div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" state={{from:location}} replace/>;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace/>;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login/></PublicRoute>}/>
      <Route path="/" element={
        <ProtectedRoute>
          <MenuProvider><AppLayout/></MenuProvider>
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace/>}/>
        <Route path="dashboard"             element={<Dashboard/>}/>
        <Route path="visitors"              element={<VisitorList/>}/>
        <Route path="visitors/new"          element={<VisitorForm/>}/>
        <Route path="visitors/edit/:id"     element={<VisitorForm/>}/>
        <Route path="vehicles"              element={<VehicleList/>}/>
        <Route path="vehicles/new"          element={<VehicleForm/>}/>
        <Route path="vehicles/edit/:id"     element={<VehicleForm/>}/>
        <Route path="setup/gates"           element={<Gates/>}/>
        <Route path="setup/securities"      element={<Securities/>}/>
        <Route path="setup/designations"    element={<Designations/>}/>
        <Route path="setup/locations"       element={<PatrolPoints/>}/>
        <Route path="setup/patrol-points"   element={<PatrolPoints/>}/>
        <Route path="setup/cop-vehicles"    element={<CompVehicles/>}/>
        <Route path="setup/patrol-plan"     element={<PatrolPlan/>}/>
        <Route path="setup/patrol-schedule" element={<ComingSoon title="Patrol Schedule"/>}/>
        <Route path="patrol"                element={<ComingSoon title="Security Patrol"/>}/>
        <Route path="users"                 element={<ComingSoon title="User Management"/>}/>
        <Route path="*"                     element={<Navigate to="/dashboard" replace/>}/>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace/>}/>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes/>
      </AuthProvider>
    </BrowserRouter>
  );
}