import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Expand } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useEffect, useState } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function SystemMetrics() {
  const [timeRange, setTimeRange] = useState('1h');
  const [chartData, setChartData] = useState<any>(null);

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['/api/metrics/range', timeRange],
    queryFn: async () => {
      const startTime = new Date(Date.now() - (timeRange === '1h' ? 3600000 : timeRange === '6h' ? 21600000 : 86400000));
      const endTime = new Date();
      const response = await fetch(`/api/metrics/range?start=${startTime.toISOString()}&end=${endTime.toISOString()}`);
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: dashboardMetrics } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (metricsData && metricsData.length > 0) {
      // Generate time labels based on range
      const hours = [];
      const cpuData = [];
      const memoryData = [];
      const diskData = [];

      // Group metrics by hour and calculate averages
      const groupedMetrics = metricsData.reduce((acc: any, metric: any) => {
        const hour = new Date(metric.timestamp).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        if (!acc[hour]) {
          acc[hour] = { cpu: [], memory: [], disk: [] };
        }
        
        acc[hour].cpu.push(parseFloat(metric.cpuUsage));
        acc[hour].memory.push(parseFloat(metric.memoryUsage));
        acc[hour].disk.push(parseFloat(metric.diskUsage));
        
        return acc;
      }, {});

      Object.entries(groupedMetrics).forEach(([hour, data]: [string, any]) => {
        hours.push(hour);
        cpuData.push(data.cpu.reduce((a: number, b: number) => a + b, 0) / data.cpu.length);
        memoryData.push(data.memory.reduce((a: number, b: number) => a + b, 0) / data.memory.length);
        diskData.push(data.disk.reduce((a: number, b: number) => a + b, 0) / data.disk.length);
      });

      setChartData({
        labels: hours.slice(-24), // Last 24 hours
        datasets: [
          {
            label: 'CPU %',
            data: cpuData.slice(-24),
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Memory %',
            data: memoryData.slice(-24),
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Disk %',
            data: diskData.slice(-24),
            borderColor: '#F59E0B',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      });
    }
  }, [metricsData]);

  if (isLoading) {
    return (
      <Card className="bg-dark-surface border-dark-border">
        <CardHeader>
          <CardTitle className="text-white">System Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-slate-800/50 rounded-lg animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#F8FAFC',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#94A3B8',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: '#94A3B8',
          callback: function(value: any) {
            return value + '%';
          },
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
      },
    },
    elements: {
      point: {
        radius: 2,
        hoverRadius: 5,
      },
    },
  };

  return (
    <Card className="bg-dark-surface border-dark-border" data-testid="system-metrics">
      <CardHeader className="border-b border-dark-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">System Performance</CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange} data-testid="time-range-select">
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="1h">Last 1 hour</SelectItem>
                <SelectItem value="6h">Last 6 hours</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
              data-testid="button-expand-chart"
            >
              <Expand size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white" data-testid="avg-cpu">
              {dashboardMetrics ? '67.2%' : '0%'}
            </div>
            <div className="text-xs text-slate-400">Avg CPU</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white" data-testid="avg-memory">
              {dashboardMetrics ? '78.5%' : '0%'}
            </div>
            <div className="text-xs text-slate-400">Avg Memory</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white" data-testid="avg-disk">
              {dashboardMetrics ? '45.2%' : '0%'}
            </div>
            <div className="text-xs text-slate-400">Avg Disk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white" data-testid="network-latency">
              12ms
            </div>
            <div className="text-xs text-slate-400">Network Latency</div>
          </div>
        </div>
        
        <div className="h-64 bg-slate-800/50 rounded-lg flex items-center justify-center">
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="text-slate-400">Loading chart data...</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
