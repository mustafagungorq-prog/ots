import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function Loading({ message = "Yükleniyor..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-600">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}
