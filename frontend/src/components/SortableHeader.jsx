// components/SortableHeader.jsx
// Reusable sortable <th> — shows ▲▼ indicator
import React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export default function SortableHeader({ label, colKey, sortKey, sortDir, onSort, style }) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      style={{
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        <span style={{ color: active ? "var(--accent)" : "var(--text3)", display: "flex" }}>
          {active
            ? sortDir === "asc"
              ? <ArrowUp size={12} />
              : <ArrowDown size={12} />
            : <ArrowUpDown size={12} />}
        </span>
      </span>
    </th>
  );
}