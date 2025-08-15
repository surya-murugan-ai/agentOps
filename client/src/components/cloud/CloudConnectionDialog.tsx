import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Check, Cloud, Key } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CloudConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectionCreated?: () => void;
}

interface ConnectionForm {
  name: string;
  provider: 'aws' | 'azure' | 'gcp' | '';
  region: string;
  accountId: string;
  credentials: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
    subscriptionId?: string;
    projectId?: string;
    privateKey?: string;
    clientEmail?: string;
  };
}

export function CloudConnectionDialog({ open, onOpenChange, onConnectionCreated }: CloudConnectionDialogProps) {
  const [form, setForm] = useState<ConnectionForm>({
    name: '',
    provider: '',
    region: '',
    accountId: '',
    credentials: {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/cloud-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          encryptedCredentials: form.credentials,
        }),
      });

      if (response.ok) {
        const connection = await response.json();
        
        // Test the connection
        const testResponse = await fetch(`/api/cloud-connections/${connection.id}/test`, {
          method: 'POST',
        });
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          setTestResult(testData);
          
          if (testData.success) {
            setTimeout(() => {
              onConnectionCreated?.();
              onOpenChange(false);
              resetForm();
            }, 2000);
          }
        }
      } else {
        const error = await response.json();
        setTestResult({ success: false, message: error.error || 'Failed to create connection' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Network error occurred' });
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setForm({
      name: '',
      provider: '',
      region: '',
      accountId: '',
      credentials: {},
    });
    setTestResult(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const renderCredentialFields = () => {
    switch (form.provider) {
      case 'aws':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="accessKeyId">Access Key ID</Label>
              <Input
                id="accessKeyId"
                type="password"
                value={form.credentials.accessKeyId || ''}
                onChange={(e) => setForm({
                  ...form,
                  credentials: { ...form.credentials, accessKeyId: e.target.value }
                })}
                placeholder="AKIA..."
                data-testid="input-access-key-id"
              />
            </div>
            <div>
              <Label htmlFor="secretAccessKey">Secret Access Key</Label>
              <Input
                id="secretAccessKey"
                type="password"
                value={form.credentials.secretAccessKey || ''}
                onChange={(e) => setForm({
                  ...form,
                  credentials: { ...form.credentials, secretAccessKey: e.target.value }
                })}
                placeholder="Secret key..."
                data-testid="input-secret-access-key"
              />
            </div>
            <div>
              <Label htmlFor="sessionToken">Session Token (Optional)</Label>
              <Input
                id="sessionToken"
                type="password"
                value={form.credentials.sessionToken || ''}
                onChange={(e) => setForm({
                  ...form,
                  credentials: { ...form.credentials, sessionToken: e.target.value }
                })}
                placeholder="Session token..."
                data-testid="input-session-token"
              />
            </div>
          </div>
        );

      case 'azure':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="tenantId">Tenant ID</Label>
              <Input
                id="tenantId"
                value={form.credentials.tenantId || ''}
                onChange={(e) => setForm({
                  ...form,
                  credentials: { ...form.credentials, tenantId: e.target.value }
                })}
                placeholder="Tenant ID..."
                data-testid="input-tenant-id"
              />
            </div>
            <div>
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                value={form.credentials.clientId || ''}
                onChange={(e) => setForm({
                  ...form,
                  credentials: { ...form.credentials, clientId: e.target.value }
                })}
                placeholder="Client ID..."
                data-testid="input-client-id"
              />
            </div>
            <div>
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                value={form.credentials.clientSecret || ''}
                onChange={(e) => setForm({
                  ...form,
                  credentials: { ...form.credentials, clientSecret: e.target.value }
                })}
                placeholder="Client secret..."
                data-testid="input-client-secret"
              />
            </div>
            <div>
              <Label htmlFor="subscriptionId">Subscription ID</Label>
              <Input
                id="subscriptionId"
                value={form.credentials.subscriptionId || ''}
                onChange={(e) => setForm({
                  ...form,
                  credentials: { ...form.credentials, subscriptionId: e.target.value }
                })}
                placeholder="Subscription ID..."
                data-testid="input-subscription-id"
              />
            </div>
          </div>
        );

      case 'gcp':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="projectId">Project ID</Label>
              <Input
                id="projectId"
                value={form.credentials.projectId || ''}
                onChange={(e) => setForm({
                  ...form,
                  credentials: { ...form.credentials, projectId: e.target.value }
                })}
                placeholder="Project ID..."
                data-testid="input-project-id"
              />
            </div>
            <div>
              <Label htmlFor="privateKey">Service Account Key (JSON)</Label>
              <Textarea
                id="privateKey"
                value={form.credentials.privateKey || ''}
                onChange={(e) => setForm({
                  ...form,
                  credentials: { ...form.credentials, privateKey: e.target.value }
                })}
                placeholder="Paste your service account JSON key here..."
                rows={6}
                data-testid="input-private-key"
              />
            </div>
          </div>
        );

      default:
        return (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Select a cloud provider to configure credentials
            </AlertDescription>
          </Alert>
        );
    }
  };

  const getRegionOptions = () => {
    switch (form.provider) {
      case 'aws':
        return [
          'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
          'eu-west-1', 'eu-west-2', 'eu-central-1', 'ap-southeast-1'
        ];
      case 'azure':
        return [
          'eastus', 'eastus2', 'westus', 'westus2',
          'westeurope', 'northeurope', 'southeastasia', 'eastasia'
        ];
      case 'gcp':
        return [
          'us-central1', 'us-east1', 'us-west1', 'us-west2',
          'europe-west1', 'europe-west2', 'asia-southeast1', 'asia-east1'
        ];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Add Cloud Connection
          </DialogTitle>
          <DialogDescription>
            Connect your cloud provider to start monitoring resources
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Connection Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My AWS Production"
                required
                data-testid="input-connection-name"
              />
            </div>
            <div>
              <Label htmlFor="provider">Cloud Provider</Label>
              <Select value={form.provider} onValueChange={(value: any) => setForm({ ...form, provider: value, region: '', credentials: {} })}>
                <SelectTrigger data-testid="select-provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aws">Amazon Web Services (AWS)</SelectItem>
                  <SelectItem value="azure">Microsoft Azure</SelectItem>
                  <SelectItem value="gcp">Google Cloud Platform (GCP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.provider && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="region">Region</Label>
                <Select value={form.region} onValueChange={(value) => setForm({ ...form, region: value })}>
                  <SelectTrigger data-testid="select-region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {getRegionOptions().map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="accountId">Account/Subscription ID</Label>
                <Input
                  id="accountId"
                  value={form.accountId}
                  onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                  placeholder={form.provider === 'aws' ? 'AWS Account ID' : form.provider === 'azure' ? 'Subscription ID' : 'Project ID'}
                  data-testid="input-account-id"
                />
              </div>
            </div>
          )}

          {form.provider && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Credentials
                </CardTitle>
                <CardDescription>
                  Enter your {form.provider.toUpperCase()} credentials to authenticate
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderCredentialFields()}
              </CardContent>
            </Card>
          )}

          {testResult && (
            <Alert className={testResult.success ? "border-green-500" : "border-red-500"}>
              {testResult.success ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription className={testResult.success ? "text-green-700" : "text-red-700"}>
                {testResult.message}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !form.name || !form.provider || !form.region}
              data-testid="button-create-connection"
            >
              {isLoading ? 'Creating...' : 'Create & Test Connection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}