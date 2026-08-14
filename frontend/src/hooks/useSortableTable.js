import { useState, useMemo } from "react";
export function useSortableTable(data, defaultKey = "") {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState("asc");
  const toggle = (key) => {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const sorted = useMemo(() => {
    if (!sortKey) return [...(data || [])];
    return [...(data || [])].sort((a, b) => {
      const av = a[sortKey] ?? ""; const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric:true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);
  return { sorted, sortKey, sortDir, toggle };
}