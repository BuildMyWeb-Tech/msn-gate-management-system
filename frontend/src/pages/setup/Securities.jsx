import React from "react";
import GeneralSetup from "../../components/GeneralSetup";
import { BadgeCheck } from "lucide-react";

const FIELDS = [
  { key: "code",   label: "Security Code", required: true,  placeholder: "SEC-001" },
  { key: "name",   label: "Security Name", required: true,  placeholder: "Full name" },
  { key: "gender", label: "Gender",        required: false, type: "select", options: ["Male","Female","Other"], responseKey: "gender", mobileHide: true },
  { key: "mobile", label: "Mobile",        required: false, placeholder: "Mobile number", responseKey: "mobile", mobileHide: true },
  { key: "photo",  label: "Photo" },
];

export default function Securities() {
  return <GeneralSetup typeKey="securities" title="Securities" Icon={BadgeCheck} fields={FIELDS} />;
}
