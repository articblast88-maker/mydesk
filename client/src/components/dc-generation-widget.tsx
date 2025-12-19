import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Package, Calendar, Hash, Building, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DCStatus {
  dcStatus: string;
  dcNumber: string | null;
  dcSubmittedDate: string | null;
  dtCode: string | null;
  dtName: string | null;
  dcAssets: string[];
}

interface DCGenerationWidgetProps {
  ticketId: string;
  ticketCategory?: string | null;
}

export function DCGenerationWidget({ ticketId, ticketCategory }: DCGenerationWidgetProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dtCode, setDtCode] = useState("");
  const [dtName, setDtName] = useState("");
  const [assets, setAssets] = useState("");
  const [notes, setNotes] = useState("");

  const { data: dcStatus, isLoading } = useQuery<DCStatus>({
    queryKey: ["/api/dc/status", ticketId],
    enabled: !!ticketId,
  });

  const generateDCMutation = useMutation({
    mutationFn: async () => {
      const seqResponse = await apiRequest("POST", "/api/dc/generate-sequence", {
        regionCode: "DC",
      });
      const { sequenceNumber } = await seqResponse.json();

      const response = await apiRequest("POST", "/api/dc/generate", {
        ticketId,
        dcNumber: sequenceNumber,
        dtCode,
        dtName,
        assets: assets.split(",").map((a) => a.trim()).filter(Boolean),
        notes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dc/status", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      setIsDialogOpen(false);
      setDtCode("");
      setDtName("");
      setAssets("");
      setNotes("");
      toast({
        title: "DC Generated",
        description: "Delivery Challan has been generated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate DC. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            DC Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isDeliveryChallan = ticketCategory 
    ? (ticketCategory.toLowerCase().includes("delivery") || ticketCategory.toLowerCase().includes("challan"))
    : false;

  if (!isDeliveryChallan && dcStatus?.dcStatus === "Not Generated") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            DC Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Not applicable for this ticket type</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (dcStatus?.dcStatus === "Generated" && dcStatus.dcNumber) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            DC Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              Generated
            </Badge>
          </div>
          
          <Separator />
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Hash className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">DC Number:</span>
              <span className="font-medium">{dcStatus.dcNumber}</span>
            </div>
            
            {dcStatus.dtCode && (
              <div className="flex items-center gap-2">
                <Building className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">DT Code:</span>
                <span className="font-medium">{dcStatus.dtCode}</span>
              </div>
            )}
            
            {dcStatus.dtName && (
              <div className="flex items-center gap-2">
                <Building className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">DT Name:</span>
                <span className="font-medium">{dcStatus.dtName}</span>
              </div>
            )}
            
            {dcStatus.dcSubmittedDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Submitted:</span>
                <span className="font-medium">
                  {new Date(dcStatus.dcSubmittedDate).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {dcStatus.dcAssets && dcStatus.dcAssets.length > 0 && (
              <div className="flex items-start gap-2">
                <Package className="h-3 w-3 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">Assets:</span>
                <span className="font-medium">{dcStatus.dcAssets.length} items</span>
              </div>
            )}
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full" data-testid="button-view-dc-details">
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delivery Challan Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">DC Number</p>
                    <p className="font-medium">{dcStatus.dcNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Generated</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">DT Code</p>
                    <p className="font-medium">{dcStatus.dtCode || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">DT Name</p>
                    <p className="font-medium">{dcStatus.dtName || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Submitted Date</p>
                    <p className="font-medium">
                      {dcStatus.dcSubmittedDate 
                        ? new Date(dcStatus.dcSubmittedDate).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                </div>
                {dcStatus.dcAssets && dcStatus.dcAssets.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Assets ({dcStatus.dcAssets.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {dcStatus.dcAssets.map((asset, idx) => (
                        <Badge key={idx} variant="outline">{asset}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          DC Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>DC not generated yet</span>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" data-testid="button-proceed-to-dc">
              Proceed to DC
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Delivery Challan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dtCode">DT Code</Label>
                <Input
                  id="dtCode"
                  value={dtCode}
                  onChange={(e) => setDtCode(e.target.value)}
                  placeholder="Enter DT Code"
                  data-testid="input-dt-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dtName">DT Name</Label>
                <Input
                  id="dtName"
                  value={dtName}
                  onChange={(e) => setDtName(e.target.value)}
                  placeholder="Enter DT Name"
                  data-testid="input-dt-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assets">Assets (comma-separated)</Label>
                <Input
                  id="assets"
                  value={assets}
                  onChange={(e) => setAssets(e.target.value)}
                  placeholder="e.g., Asset1, Asset2, Asset3"
                  data-testid="input-assets"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  data-testid="input-dc-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                data-testid="button-cancel-dc"
              >
                Cancel
              </Button>
              <Button
                onClick={() => generateDCMutation.mutate()}
                disabled={generateDCMutation.isPending || !dtCode}
                data-testid="button-generate-dc"
              >
                {generateDCMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate DC"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
