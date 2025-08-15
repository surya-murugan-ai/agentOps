import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download } from 'lucide-react';

const statusStyles = {
  success: "bg-success/20 text-success",
  failed: "bg-error/20 text-error", 
  warning: "bg-warning/20 text-warning",
  pending: "bg-primary/20 text-primary",
};

interface AuditLogEntry {
  id: string;
  action: string;
  details: string;
  status: string;
  impact?: string;
  timestamp: string;
  agentName?: string;
  hostname?: string;
}

export default function AuditLog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const { data: auditLogs = [], isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ['/api/audit-logs'],
    refetchInterval: 60000,
  });

  const filteredLogs = auditLogs.filter((log: AuditLogEntry) => 
    searchTerm === '' || 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.agentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.hostname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedLogs = filteredLogs.slice(
    currentPage * itemsPerPage, 
    (currentPage + 1) * itemsPerPage
  );

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  if (isLoading) {
    return (
      <Card className="bg-dark-surface border-dark-border">
        <CardHeader>
          <CardTitle className="text-white">Recent Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-10 bg-slate-700 rounded mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-dark-surface border-dark-border" data-testid="audit-log">
      <CardHeader className="border-b border-dark-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Recent Audit Log</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 w-48 pl-10"
                data-testid="search-logs"
              />
            </div>
            <Button 
              variant="ghost" 
              className="text-sm text-primary hover:text-blue-400 transition-colors"
              data-testid="button-export"
            >
              <Download className="mr-2" size={16} />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {paginatedLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-400" data-testid="no-logs">
            <Search size={48} className="mx-auto mb-4 opacity-50" />
            <p>{searchTerm ? 'No logs match your search' : 'No audit logs available'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-800/50">
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-400">Timestamp</TableHead>
                <TableHead className="text-slate-400">Agent</TableHead>
                <TableHead className="text-slate-400">Action</TableHead>
                <TableHead className="text-slate-400">Server</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((log: any, index: number) => (
                <TableRow 
                  key={log.id} 
                  className="border-slate-700 hover:bg-slate-800/30 transition-colors"
                  data-testid={`log-row-${index}`}
                >
                  <TableCell className="text-slate-300" data-testid={`log-timestamp-${index}`}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-slate-300" data-testid={`log-agent-${index}`}>
                    {log.agent?.name || 'System'}
                  </TableCell>
                  <TableCell className="text-white font-medium" data-testid={`log-action-${index}`}>
                    {log.action}
                  </TableCell>
                  <TableCell className="text-slate-300" data-testid={`log-server-${index}`}>
                    {log.server?.hostname || 'N/A'}
                  </TableCell>
                  <TableCell data-testid={`log-status-${index}`}>
                    <Badge 
                      className={statusStyles[log.status as keyof typeof statusStyles] || statusStyles.pending}
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300" data-testid={`log-impact-${index}`}>
                    {log.impact || log.details.substring(0, 50) + (log.details.length > 50 ? '...' : '')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400" data-testid="pagination-info">
                Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} audit entries
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="bg-slate-700 text-slate-300 hover:bg-slate-600"
                  data-testid="button-previous"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="bg-primary text-white hover:bg-blue-600"
                  data-testid="button-next"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
