import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }      from "./context/AuthContext";
import PrivateRoute          from "./components/PrivateRoute";
import AppLayout             from "./components/AppLayout";
import PWAInstallPrompt      from "./components/PWAInstallPrompt";

import Login           from "./pages/Login";
import Dashboard       from "./pages/Dashboard";
import VisitorList     from "./pages/visitors/VisitorList";
import VisitorForm     from "./pages/visitors/VisitorForm";
import VehicleList     from "./pages/vehicles/VehicleList";
import VehicleForm     from "./pages/vehicles/VehicleForm";
import Gates           from "./pages/setup/Gates";
import Securities      from "./pages/setup/Securities";
import Designations    from "./pages/setup/Designations";
import Locations       from "./pages/setup/Locations";
import SecurityPatrol  from "./pages/patrol/SecurityPatrol";
import Users           from "./pages/usermgmt/Users";
import UserForm        from "./pages/usermgmt/UserForm";
import UserPermissions from "./pages/usermgmt/UserPermissions";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* PWA install prompt — shows on all pages */}
        <PWAInstallPrompt />

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index                              element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"                  element={<Dashboard />} />
            <Route path="visitors"                   element={<VisitorList />} />
            <Route path="visitors/new"               element={<VisitorForm />} />
            <Route path="visitors/edit/:id"          element={<VisitorForm />} />
            <Route path="vehicles"                   element={<VehicleList />} />
            <Route path="vehicles/new"               element={<VehicleForm />} />
            <Route path="vehicles/edit/:id"          element={<VehicleForm />} />
            <Route path="setup/gates"                element={<Gates />} />
            <Route path="setup/securities"           element={<Securities />} />
            <Route path="setup/designations"         element={<Designations />} />
            <Route path="setup/locations"            element={<Locations />} />
            <Route path="patrol"                     element={<SecurityPatrol />} />
            <Route path="users"                      element={<Users />} />
            <Route path="users/new"                  element={<UserForm />} />
            <Route path="users/edit/:id"             element={<UserForm />} />
            <Route path="users/permissions/:id"      element={<UserPermissions />} />
            <Route path="*"                          element={<Navigate to="/dashboard" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
