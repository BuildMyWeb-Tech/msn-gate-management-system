import React from "react";
import GeneralMaster from "../../components/GeneralMaster";
import { Layers } from "lucide-react";

// gtypemuid = 2 for Gates (confirmed by manager)
// Columns: Gate Code, Gate Name, Short Name (same pattern as Designation in Image 2)
const FIELDS = [
  { key: "code",      label: "Gate Code",  required: true,  placeholder: "GATE-01",   spCol: "gcode" },
  { key: "name",      label: "Gate Name",  required: true,  placeholder: "Main Gate", spCol: "gname" },
  { key: "shortName", label: "Short Name", required: false, placeholder: "MG",        spCol: "gsname" },
];

export default function Gates() {
  return (
    <GeneralMaster
      typeKey="gates"
      title="Gates"
      gTypeMUid={2}
      Icon={Layers}
      fields={FIELDS}
      mobileColumns={["code", "name"]}
      desktopColumns={["code", "name", "shortName"]}
    />
  );
}