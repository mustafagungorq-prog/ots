import { useEffect, useMemo, useState } from "react";
import { ArchiveRestore, Search } from "lucide-react";
import { useStudentData } from "@/hooks/useStudentData";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loading } from "@/components/Loading";

export function ArchivedStudentsPage() {
  const data = useStudentData();
  const [search, setSearch] = useState("");

  useEffect(() => {
    data.loadArchivedStudents();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.archivedStudents;
    return data.archivedStudents.filter((s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q),
    );
  }, [data.archivedStudents, search]);

  if (!data.loadedArchivedStudents && data.archivedStudents.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Arşivli Öğrenciler
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arşivdeki Öğrenciler</CardTitle>
          <CardDescription>
            Devam etmeyen öğrenciler burada listelenir. Aktif listelerde
            görünmezler ve üzerlerinde işlem yapılamaz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Ara</Label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="İsim ara..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Öğrenci</TableHead>
                  <TableHead className="text-xs">Sınıf</TableHead>
                  <TableHead className="text-xs">Medrese</TableHead>
                  <TableHead className="text-xs text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">
                      {s.firstName} {s.lastName}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {s.grade || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {s.schoolName || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          data.updateStudent(s.id, { archived: false })
                        }
                      >
                        <ArchiveRestore size={14} className="mr-1" />
                        Arşivden Çıkar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-gray-500"
                    >
                      Arşivde öğrenci bulunmamaktadır.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
