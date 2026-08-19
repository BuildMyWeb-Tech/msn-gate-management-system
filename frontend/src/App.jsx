import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MenuProvider } from "./context/MenuContext";

// Layout
import AppLayout from "./components/AppLayout";

// Pages
import Login     from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Visitors
import VisitorList from "./pages/visitors/VisitorList";
import VisitorForm from "./pages/visitors/VisitorForm";

// Vehicles
import VehicleList from "./pages/vehicles/VehicleList";
import VehicleForm from "./pages/vehicles/VehicleForm";

// Setup
import Gates        from "./pages/setup/Gates";
import Securities   from "./pages/setup/Securities";
import Designations from "./pages/setup/Designations";
import Locations    from "./pages/setup/Locations";
import CompVehicles from "./pages/setup/CompVehicles";

// Users
import Users           from "./pages/usermgmt/Users";
import UserForm        from "./pages/usermgmt/UserForm";
import UserPermissions from "./pages/usermgmt/UserPermissions";

// Placeholder for pages not yet built
function ComingSoon({ title }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", minHeight:300, gap:12 }}>
      <div style={{ fontSize:48 }}>🚧</div>
      <h2 style={{ fontWeight:700, fontSize:20 }}>{title}</h2>
      <p style={{ color:"var(--text3)", fontSize:14 }}>This page is coming soon</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)" }}>
        <div style={{ textAlign:"center" }}>
          <div className="spinner" style={{ margin:"0 auto 16px" }}/>
          <div style={{ fontSize:13, color:"var(--text3)" }}>Loading...</div>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" state={{ from:location }} replace/>;
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
      {/* Public */}
      <Route path="/login" element={<PublicRoute><Login/></PublicRoute>}/>

      {/* Protected */}
      <Route path="/" element={
        <ProtectedRoute>
          <MenuProvider>
            <AppLayout/>
          </MenuProvider>
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace/>}/>
        <Route path="dashboard"               element={<Dashboard/>}/>

        {/* Visitors */}
        <Route path="visitors"                element={<VisitorList/>}/>
        <Route path="visitors/new"            element={<VisitorForm/>}/>
        <Route path="visitors/edit/:id"       element={<VisitorForm/>}/>

        {/* Vehicles */}
        <Route path="vehicles"                element={<VehicleList/>}/>
        <Route path="vehicles/new"            element={<VehicleForm/>}/>
        <Route path="vehicles/edit/:id"       element={<VehicleForm/>}/>

        {/* Setup */}
        <Route path="setup/gates"             element={<Gates/>}/>
        <Route path="setup/securities"        element={<Securities/>}/>
        <Route path="setup/designations"      element={<Designations/>}/>
        <Route path="setup/locations"         element={<Locations/>}/>           {/* old route — keep for compat */}
        <Route path="setup/patrol-points"     element={<Locations/>}/>           {/* Patrol Points (renamed) */}
        <Route path="setup/cop-vehicles"      element={<CompVehicles/>}/>        {/* Comp. Vehicles — NEW */}
        <Route path="setup/patrol-plan"       element={<ComingSoon title="Patrol Plan"/>}/>{/* Coming soon */}
        <Route path="setup/patrol-schedule"   element={<ComingSoon title="Patrol Schedule"/>}/>{/* Coming soon */}

        {/* Users */}
        <Route path="users"                   element={<Users/>}/>
        <Route path="users/new"               element={<UserForm/>}/>
        <Route path="users/edit/:id"          element={<UserForm/>}/>
        <Route path="users/:id/permissions"   element={<UserPermissions/>}/>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
      </Route>

      {/* Root redirect */}
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