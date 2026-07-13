import React from "react";
import GeneralSetup from "../../components/GeneralSetup";
import { Layers } from "lucide-react";

const FIELDS = [
  { key: "code",        label: "Gate Code",    required: true,  placeholder: "GATE-01" },
  { key: "name",        label: "Gate Name",    required: true,  placeholder: "Main Gate" },
  { key: "description", label: "Description",  required: false, placeholder: "Optional description", responseKey: "extra" },
];

export default function Gates() {
  return <GeneralSetup typeKey="gates" title="Gates" Icon={Layers} fields={FIELDS} />;
}
