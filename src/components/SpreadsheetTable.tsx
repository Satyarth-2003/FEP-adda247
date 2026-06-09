"use client";
import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus } from "lucide-react";

export interface SheetColumn<T = Record<string, unknown>> {
  key: keyof T & string;
  label: string;
  width?: string;
  type?: "text" | "number" | "select" | "readonly";
  options?: string[];
  align?: "left" | "right" | "center";
  format?: (v: T[keyof T]) => string;
}

interface SpreadsheetTableProps<T extends Record<string, unknown>> {
  columns: SheetColumn<T>[];
  rows: T[];
  onRowsChange: (rows: T[]) => void;
  rowTemplate: T;
  readOnly?: boolean;
  maxHeight?: string;
}

export function SpreadsheetTable<T extends Record<string, unknown>>({
  columns, rows, onRowsChange, rowTemplate, readOnly = false, maxHeight = "60vh",
}: SpreadsheetTableProps<T>) {
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);
  const [draft, setDraft] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  const startEdit = useCallback((ri: number, ci: number) => {
    if (readOnly) return;
    const col = columns[ci];
    if (col.type === "readonly") return;
    setEditing({ row: ri, col: ci });
    const v = rows[ri]?.[col.key];
    setDraft(v == null ? "" : String(v));
    setTimeout(() => (inputRef.current as HTMLInputElement | null)?.select(), 10);
  }, [columns, rows, readOnly]);

  const commitEdit = useCallback((ri: number, ci: number, val: string) => {
    const col = columns[ci];
    const parsed: unknown = col.type === "number" ? (val === "" ? null : Number(val)) : val;
    const updated = rows.map((r, i) => i === ri ? { ...r, [col.key]: parsed } : r) as T[];
    onRowsChange(updated);
    setEditing(null);
  }, [columns, rows, onRowsChange]);

  const cancelEdit = useCallback(() => setEditing(null), []);

  const handleKeyDown = useCallback((e: KeyboardEvent, ri: number, ci: number) => {
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      commitEdit(ri, ci, draft);
      const editableIdxs = columns.map((c, i) => ({ c, i })).filter(x => x.c.type !== "readonly").map(x => x.i);
      const curPos = editableIdxs.indexOf(ci);
      if (e.key === "Enter") {
        const nextRi = ri + 1 < rows.length ? ri + 1 : ri;
        setTimeout(() => startEdit(nextRi, ci), 10);
      } else {
        const nextPos = curPos + 1;
        if (nextPos < editableIdxs.length) {
          setTimeout(() => startEdit(ri, editableIdxs[nextPos]), 10);
        } else if (ri + 1 < rows.length) {
          setTimeout(() => startEdit(ri + 1, editableIdxs[0]), 10);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }, [columns, rows, draft, commitEdit, cancelEdit, startEdit]);

  function addRow() {
    onRowsChange([...rows, { ...rowTemplate }] as T[]);
  }

  function deleteRow(ri: number) {
    onRowsChange(rows.filter((_, i) => i !== ri) as T[]);
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div style={{ overflowX: "auto", maxHeight, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg-elev)", zIndex: 2 }}>
              {!readOnly && <th style={{ width: 32, padding: "8px 4px" }} />}
              {columns.map((col) => (
                <th key={col.key} style={{
                  padding: "8px 12px", textAlign: col.align ?? "left",
                  fontWeight: 500, fontSize: 10, textTransform: "uppercase",
                  letterSpacing: "0.1em", color: "var(--fg-muted)",
                  width: col.width, whiteSpace: "nowrap",
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((row, ri) => (
                <motion.tr key={ri}
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="group"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  {!readOnly && (
                    <td style={{ padding: "0 4px", width: 32, textAlign: "center" }}>
                      <button onClick={() => deleteRow(ri)}
                        style={{ opacity: 0, color: "var(--fg-dim)", cursor: "pointer", background: "none", border: "none", padding: 4, borderRadius: 4, transition: "all 0.15s" }}
                        className="group-hover:!opacity-100 hover:!text-[var(--rose)]">
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </button>
                    </td>
                  )}
                  {columns.map((col, ci) => {
                    const isEditing = editing?.row === ri && editing?.col === ci;
                    const val = row[col.key];
                    const displayVal = col.format ? col.format(val) : (val == null ? "" : String(val));
                    const isEditable = col.type !== "readonly" && !readOnly;

                    return (
                      <td key={col.key}
                        onClick={() => isEditable && !isEditing && startEdit(ri, ci)}
                        style={{
                          padding: isEditing ? "2px 4px" : "6px 12px",
                          textAlign: col.align ?? "left",
                          fontFamily: col.type === "number" ? "var(--font-mono)" : undefined,
                          cursor: isEditable ? "text" : "default",
                          background: isEditing ? "var(--bg)" : undefined,
                          transition: "background 0.1s",
                          minWidth: col.type === "number" ? 60 : 80,
                          color: isEditable ? "var(--fg)" : "var(--fg-muted)",
                        }}
                      >
                        {isEditing ? (
                          col.type === "select" ? (
                            <select
                              ref={inputRef as React.RefObject<HTMLSelectElement>}
                              value={draft}
                              onChange={e => setDraft(e.target.value)}
                              onBlur={() => commitEdit(ri, ci, draft)}
                              onKeyDown={e => handleKeyDown(e as unknown as KeyboardEvent, ri, ci)}
                              autoFocus
                              style={{
                                width: "100%", background: "var(--bg-elev)", border: "1px solid var(--border)",
                                borderRadius: 6, padding: "3px 6px", fontSize: 12, color: "var(--fg)", outline: "none",
                              }}
                            >
                              {(col.options ?? []).map(o => <option key={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              ref={inputRef as React.RefObject<HTMLInputElement>}
                              type={col.type === "number" ? "number" : "text"}
                              value={draft}
                              onChange={e => setDraft(e.target.value)}
                              onBlur={() => commitEdit(ri, ci, draft)}
                              onKeyDown={e => handleKeyDown(e, ri, ci)}
                              autoFocus
                              style={{
                                width: "100%", background: "var(--bg-elev)", border: "1px solid var(--border)",
                                borderRadius: 6, padding: "3px 6px", fontSize: 12, color: "var(--fg)", outline: "none",
                                fontFamily: col.type === "number" ? "var(--font-mono)" : undefined,
                              }}
                            />
                          )
                        ) : (
                          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: col.width ?? 200 }}>
                            {displayVal || <span style={{ color: "var(--fg-dim)" }}>—</span>}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button onClick={addRow}
          style={{
            display: "flex", alignItems: "center", gap: 6, width: "100%",
            padding: "8px 16px", fontSize: 12, color: "var(--fg-muted)",
            background: "none", border: "none", borderTop: "1px solid var(--border)",
            cursor: "pointer", transition: "color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--fg)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-elev)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--fg-muted)"; (e.currentTarget as HTMLElement).style.background = "none"; }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Add row
        </button>
      )}
    </div>
  );
}
