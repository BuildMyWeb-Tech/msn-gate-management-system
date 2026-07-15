import React from "react";
import GeneralMaster from "../../components/GeneralMaster";
import { Building2 } from "lucide-react";

// gtypemuid = 1 for Designations (confirmed by manager)
// Columns: Code, Designation Name, Short Name (matches Image 2)
const FIELDS = [
  { key: "code",      label: "Code",             required: true,  placeholder: "DS01",              spCol: "gcode" },
  { key: "name",      label: "Designation Name", required: true,  placeholder: "Security Guard",    spCol: "gname" },
  { key: "shortName", label: "Short Name",       required: false, placeholder: "SG",                spCol: "gsname" },
];

export default function Designations() {
  return (
    <GeneralMaster
      typeKey="designations"
      title="Designations"
      gTypeMUid={1}
      Icon={Building2}
      fields={FIELDS}
      mobileColumns={["code", "name"]}
      desktopColumns={["code", "name", "shortName"]}
    />
  );
}