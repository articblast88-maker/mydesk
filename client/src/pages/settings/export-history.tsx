import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileDown, Loader2 } from "lucide-react";
import { DataExport } from "@shared/schema";

export default function ExportHistory() {
  const { data: exports, isLoading } = useQuery<DataExport[]>({
    queryKey: ["/api/exports"],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const handleDownload = (fileUrl: string | null, fileName: string | null) => {
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Export History</h1>
        <p className="text-muted-foreground">View and download previous data exports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Exports</CardTitle>
          <CardDescription>History of contact and company data exports</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : exports && exports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map((exp) => (
                  <TableRow key={exp.id} data-testid={`row-export-${exp.id}`}>
                    <TableCell className="font-medium capitalize">{exp.entityType}</TableCell>
                    <TableCell>{getStatusBadge(exp.status)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {exp.selectedFields?.join(", ") || "-"}
                      </span>
                    </TableCell>
                    <TableCell>{exp.totalRecords ?? "-"}</TableCell>
                    <TableCell>{new Date(exp.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      {exp.status === "completed" && exp.fileUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(exp.fileUrl, exp.fileName)}
                          data-testid={`button-download-${exp.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : exp.status === "failed" ? (
                        <span className="text-xs text-red-500">{exp.errorMessage || "Failed"}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No exports yet</p>
              <p className="text-sm">Export contacts or companies to see history here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
