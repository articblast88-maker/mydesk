import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface NewKeyResponse {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
  message: string;
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<NewKeyResponse | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/api-keys", { name });
      return await response.json() as NewKeyResponse;
    },
    onSuccess: (data) => {
      setCreatedKey(data);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "API Key Created",
        description: "Make sure to copy your key - it won't be shown again!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "API Key Revoked",
        description: "The API key has been revoked and can no longer be used.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      });
    },
  });

  const handleCopyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newKeyName);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCreatedKey(null);
    setShowKey(false);
    setNewKeyName("");
  };

  return (
    <div className="flex-1 overflow-auto p-6" data-testid="page-api-keys">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">API Keys</h1>
            <p className="text-muted-foreground mt-1">
              Manage API keys for external access to your helpdesk
            </p>
          </div>
          <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
            <SheetTrigger asChild>
              <Button data-testid="button-create-api-key">
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-[500px] flex flex-col overflow-hidden">
              {!createdKey ? (
                <>
                  <SheetHeader>
                    <SheetTitle>Create API Key</SheetTitle>
                    <SheetDescription>
                      Create a new API key to access the helpdesk API from external applications.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 py-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="keyName">Key Name</Label>
                      <Input
                        id="keyName"
                        placeholder="e.g., My Integration, Zapier, etc."
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        data-testid="input-key-name"
                      />
                      <p className="text-sm text-muted-foreground">
                        Give your key a descriptive name to identify its purpose.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateKey} 
                      disabled={createMutation.isPending}
                      data-testid="button-submit-create"
                    >
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Key
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      API Key Created
                    </SheetTitle>
                    <SheetDescription>
                      Copy your API key now. You won't be able to see it again!
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 py-4 mt-4">
                    <div className="space-y-2">
                      <Label>Your API Key</Label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            readOnly
                            type={showKey ? "text" : "password"}
                            value={createdKey.key}
                            className="pr-10 font-mono text-sm"
                            data-testid="input-created-key"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowKey(!showKey)}
                          >
                            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleCopyKey(createdKey.key)}
                          data-testid="button-copy-key"
                        >
                          {copied ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-amber-600 dark:text-amber-500">
                        Make sure to copy this key and store it securely. It will not be shown again.
                      </p>
                    </div>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <h4 className="text-sm font-medium mb-2">How to use your API key:</h4>
                        <pre className="text-xs bg-background p-3 rounded-md overflow-x-auto">
{`curl -X GET "https://your-app.replit.app/api/tickets" \\
  -H "Authorization: Bearer ${createdKey.key}"`}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleCloseDialog} data-testid="button-done">
                      Done
                    </Button>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Your API Keys
            </CardTitle>
            <CardDescription>
              API keys allow external applications to access your helpdesk data via the REST API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !apiKeys || apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No API keys yet</p>
                <p className="text-sm">Create an API key to start using the API</p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`card-api-key-${key.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" data-testid={`text-key-name-${key.id}`}>
                          {key.name}
                        </span>
                        {key.isActive ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            Revoked
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="font-mono">{key.keyPrefix}...</span>
                        <span>Created {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}</span>
                        {key.lastUsedAt && (
                          <span>Last used {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}</span>
                        )}
                      </div>
                    </div>
                    {key.isActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                        onClick={() => revokeMutation.mutate(key.id)}
                        disabled={revokeMutation.isPending}
                        data-testid={`button-revoke-${key.id}`}
                      >
                        {revokeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>API Documentation</CardTitle>
            <CardDescription>Quick reference for using the API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Authentication</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Include your API key in the Authorization header:
              </p>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                Authorization: Bearer hd_your_api_key_here
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Available Endpoints</h4>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <Badge variant="outline" className="w-16 justify-center">GET</Badge>
                  <code className="text-muted-foreground">/api/tickets</code>
                  <span className="text-muted-foreground">- List all tickets</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="w-16 justify-center">POST</Badge>
                  <code className="text-muted-foreground">/api/tickets</code>
                  <span className="text-muted-foreground">- Create a ticket</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="w-16 justify-center">GET</Badge>
                  <code className="text-muted-foreground">/api/users</code>
                  <span className="text-muted-foreground">- List all users</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="w-16 justify-center">POST</Badge>
                  <code className="text-muted-foreground">/api/users</code>
                  <span className="text-muted-foreground">- Create a user</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="w-16 justify-center">POST</Badge>
                  <code className="text-muted-foreground">/api/api-keys/verify</code>
                  <span className="text-muted-foreground">- Verify your API key</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
