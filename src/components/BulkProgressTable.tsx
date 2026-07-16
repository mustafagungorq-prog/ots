import { useState, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { Student, Progress } from "@/types";

interface BulkDataRow {
  kp: string;
  kc: string;
  rp: string;
  rc: string;
  ec: string;
  note: string;
}

interface BulkProgressTableProps {
  students: Student[];
  bulkData: Record<number, BulkDataRow>;
  lastProgress?: Record<number, Progress>;
  selectedStudents: number[];
  onToggleSelect: (sid: number) => void;
  onUpdate: (sid: number, field: keyof BulkDataRow, value: string) => void;
  onNavigate?: (sid: number) => void;
  saved?: boolean;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const COLUMNS: { key: keyof BulkDataRow; label: string; width: string }[] = [
  { key: "kp", label: "K.Ok", width: "w-20" },
  { key: "kc", label: "K.Son", width: "w-20" },
  { key: "rp", label: "R.Ok", width: "w-20" },
  { key: "rc", label: "R.Son", width: "w-20" },
  { key: "ec", label: "Elif.Son", width: "w-20" },
  { key: "note", label: "Not", width: "w-44" },
];

const LAST_PROGRESS_FIELD: Record<keyof BulkDataRow, keyof Progress> = {
  kp: "kuranPages",
  kc: "kuranCurrentPage",
  rp: "risalePages",
  rc: "risaleCurrentPage",
  ec: "elifbaCurrentPage",
  note: "notes",
};

function getLastValue(
  lastProgress: Record<number, Progress> | undefined,
  sid: number,
  field: keyof BulkDataRow,
): string | undefined {
  const p = lastProgress?.[sid];
  if (!p) return undefined;
  const v = p[LAST_PROGRESS_FIELD[field]];
  return v === undefined || v === null ? undefined : String(v);
}

export function BulkProgressTable({
  students,
  bulkData,
  lastProgress,
  selectedStudents,
  onToggleSelect,
  onUpdate,
  onNavigate,
  saved,
}: BulkProgressTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const tableRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedStudents = useMemo(
    () => students.slice(startIndex, startIndex + pageSize),
    [students, startIndex, pageSize],
  );

  // Reset page when students or pageSize change
  const safePage = Math.min(page, totalPages);
  const displayedPage = safePage;

  const setSafePage = useCallback(
    (p: number) => {
      const np = Math.max(1, Math.min(p, totalPages));
      setPage(np);
    },
    [totalPages],
  );

  const focusCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      const selector = `[data-row-index="${rowIndex}"][data-col-index="${colIndex}"]`;
      const el = tableRef.current?.querySelector(selector) as
        | HTMLElement
        | undefined;
      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement && el.type !== "checkbox") {
          el.select();
        }
      }
    },
    [tableRef],
  );

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      rowIndex: number,
      colIndex: number,
    ) => {
      const rows = paginatedStudents.length;
      const cols = COLUMNS.length + 1; // checkbox + data columns
      let nextRow = rowIndex;
      let nextCol = colIndex;

      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Enter",
          "Tab",
        ].includes(e.key)
      ) {
        e.preventDefault();
      } else {
        return;
      }

      if (e.key === "ArrowRight" || (e.key === "Tab" && !e.shiftKey)) {
        nextCol++;
      } else if (e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) {
        nextCol--;
      } else if (e.key === "ArrowDown" || e.key === "Enter") {
        nextRow++;
      } else if (e.key === "ArrowUp") {
        nextRow--;
      }

      if (nextRow >= rows) {
        nextRow = 0;
      } else if (nextRow < 0) {
        nextRow = rows - 1;
      }

      if (nextCol >= cols) {
        nextCol = 0;
        nextRow = (nextRow + 1) % rows;
      } else if (nextCol < 0) {
        nextCol = cols - 1;
        nextRow = (nextRow - 1 + rows) % rows;
      }

      focusCell(nextRow, nextCol);
    },
    [paginatedStudents.length, focusCell],
  );

  const allSelectedOnPage =
    paginatedStudents.length > 0 &&
    paginatedStudents.every((s) => selectedStudents.includes(s.id));

  const toggleAllOnPage = () => {
    const pageIds = paginatedStudents.map((s) => s.id);
    if (allSelectedOnPage) {
      pageIds.forEach((id) => {
        if (selectedStudents.includes(id)) onToggleSelect(id);
      });
    } else {
      pageIds.forEach((id) => {
        if (!selectedStudents.includes(id)) onToggleSelect(id);
      });
    }
  };

  const headerBg = "bg-gray-50";

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            {students.length} öğrenci
            {students.length > 0 &&
              ` • Sayfa ${displayedPage}/${totalPages} (toplam ${students.length})`}
          </span>
          {saved && (
            <Badge
              variant="outline"
              className="text-green-600 border-green-300"
            >
              Kaydedildi
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sayfa başına</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-8 text-xs border rounded px-2"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSafePage(1)}
              disabled={displayedPage <= 1}
            >
              <ChevronsLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSafePage(displayedPage - 1)}
              disabled={displayedPage <= 1}
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSafePage(displayedPage + 1)}
              disabled={displayedPage >= totalPages}
            >
              <ChevronRight size={14} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSafePage(totalPages)}
              disabled={displayedPage >= totalPages}
            >
              <ChevronsRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable table container */}
      <div
        ref={tableRef}
        className="relative overflow-auto max-h-[70vh] rounded-md border border-gray-200"
        tabIndex={-1}
      >
        <table className="w-full border-collapse text-sm min-w-max">
          <thead className={`sticky top-0 z-20 ${headerBg}`}>
            <tr>
              <th
                className={`sticky left-0 z-30 ${headerBg} border-b border-r px-2 py-2 text-left text-xs font-medium w-10`}
              >
                <input
                  type="checkbox"
                  checked={allSelectedOnPage}
                  onChange={toggleAllOnPage}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  data-row-index={-1}
                  data-col-index={-1}
                />
              </th>
              <th
                className={`sticky left-10 z-30 ${headerBg} border-b border-r px-2 py-2 text-left text-xs font-medium w-48`}
              >
                Öğrenci
              </th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`${headerBg} border-b border-r px-2 py-2 text-center text-xs font-medium ${c.width}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.map((s, rowIndex) => {
              const d = bulkData[s.id] || {};
              const isSelected = selectedStudents.includes(s.id);
              return (
                <tr
                  key={s.id}
                  className={`border-b transition-colors ${isSelected ? "bg-purple-50" : "hover:bg-blue-50"}`}
                >
                  <td
                    className={`sticky left-0 z-10 bg-white border-r px-2 py-1.5 ${isSelected ? "bg-purple-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(s.id)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
                      data-row-index={rowIndex}
                      data-col-index={0}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                  </td>
                  <td
                    className={`sticky left-10 z-10 bg-white border-r px-2 py-1.5 whitespace-nowrap cursor-pointer ${isSelected ? "bg-purple-50" : ""}`}
                    onClick={() => onNavigate?.(s.id)}
                    title={`${s.firstName} ${s.lastName}`}
                  >
                    <div className="font-medium text-sm w-44 truncate">
                      {s.firstName} {s.lastName}
                    </div>
                    <div className="text-[10px] text-gray-400">{s.grade}</div>
                  </td>
                  {COLUMNS.map((c, colIndex) => {
                    const dataColIndex = colIndex + 1;
                    const isNote = c.key === "note";
                    return (
                      <td
                        key={c.key}
                        className="border-r px-1 py-1 whitespace-nowrap"
                      >
                        <Input
                          type={isNote ? "text" : "number"}
                          data-row-index={rowIndex}
                          data-col-index={dataColIndex}
                          value={d[c.key] ?? getLastValue(lastProgress, s.id, c.key) ?? ""}
                          onChange={(e) => onUpdate(s.id, c.key, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, dataColIndex)}
                          placeholder={isNote ? "Not..." : "0"}
                          className={`h-8 text-xs px-2 ${c.width}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {paginatedStudents.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          Gösterilecek öğrenci yok
        </div>
      )}
    </div>
  );
}
