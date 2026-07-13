import React from "react";
import GeneralSetup from "../../components/GeneralSetup";
import { MapPin } from "lucide-react";

const FIELDS = [
  { key: "code",        label: "Location Code", required: true,  placeholder: "LOC-001" },
  { key: "name",        label: "Location Name", required: true,  placeholder: "e.g. Server Room" },
  { key: "description", label: "Description",   required: false, placeholder: "Optional description", responseKey: "extra", mobileHide: true },
];

export default function Locations() {
  return <GeneralSetup typeKey="locations" title="Locations" Icon={MapPin} fields={FIELDS} />;
}
