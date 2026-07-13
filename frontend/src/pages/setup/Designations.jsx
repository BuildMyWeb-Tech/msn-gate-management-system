import React from "react";
import GeneralSetup from "../../components/GeneralSetup";
import { Building2 } from "lucide-react";

const FIELDS = [
  { key: "code", label: "Code",             required: true, placeholder: "DES-001" },
  { key: "name", label: "Designation Name", required: true, placeholder: "e.g. Security Guard" },
];

export default function Designations() {
  return <GeneralSetup typeKey="designations" title="Designations" Icon={Building2} fields={FIELDS} />;
}
