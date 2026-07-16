// @ts-nocheck
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { useStudentData } from "@/hooks/useStudentData";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loading } from "@/components/Loading";

export function ParentStudentsPage() {
  const data = useStudentData();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    data.loadStudents();
    data.loadParentStudentLinks();
  }, []);

  const linkedStudentIds = useMemo(() => {
    if (!currentUser) return [];
    return data.getParentStudents(currentUser.id);
  }, [data, currentUser, data.parentStudentLinks]);

  const myStudents = useMemo(() => {
    const idSet = new Set(linkedStudentIds);
    return data.students.filter((s) => idSet.has(s.id));
  }, [linkedStudentIds, data.students]);

  if (data.loadingStudents || data.loadingParentStudentLinks) {
    return <Loading />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
        Öğrencilerim
      </h2>
      {myStudents.length === 0 && (
        <p className="text-sm text-gray-500">
          Henüz size atanmış öğrenci yok.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {myStudents.map((s) => (
          <Card
            key={s.id}
            className="cursor-pointer hover:shadow-md"
            onClick={() => navigate(`/student-profile/${s.id}`)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {s.firstName} {s.lastName}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              <p>Sınıf: {s.grade || "-"}</p>
              <p>Okul: {s.schoolName || "-"}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
