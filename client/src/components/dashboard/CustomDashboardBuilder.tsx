import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, X, GripVertical, BarChart3, LineChart, PieChart, Activity } from 'lucide-react';

interface DashboardWidget {
  id: string;
  type: 'line' | 'bar' | 'doughnut' | 'scatter' | 'metric' | 'table';
  title: string;
  dataSource: string;
  timeRange: string;
  filters: Record<string, any>;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
}

interface CustomDashboardBuilderProps {
  onSave: (widgets: DashboardWidget[]) => void;
  onCancel: () => void;
  initialWidgets?: DashboardWidget[];
}

const widgetTypes = [
  { id: 'line', name: 'Line Chart', icon: LineChart, description: 'Time-series data visualization' },
  { id: 'bar', name: 'Bar Chart', icon: BarChart3, description: 'Compare values across categories' },
  { id: 'doughnut', name: 'Doughnut Chart', icon: PieChart, description: 'Part-to-whole relationships' },
  { id: 'metric', name: 'Metric Card', icon: Activity, description: 'Single value displays' },
];

const dataSources = [
  { id: 'servers', name: 'Server Metrics', description: 'CPU, Memory, Disk usage' },
  { id: 'alerts', name: 'Alert Data', description: 'Alert counts and distributions' },
  { id: 'remediation', name: 'Remediation Actions', description: 'Remediation statistics' },
  { id: 'performance', name: 'Performance Data', description: 'Response times and correlations' },
  { id: 'trends', name: 'Historical Trends', description: 'Time-based trend analysis' },
];

const timeRanges = [
  { id: '1h', name: '1 Hour' },
  { id: '24h', name: '24 Hours' },
  { id: '7d', name: '7 Days' },
  { id: '30d', name: '30 Days' },
  { id: '90d', name: '90 Days' },
];

export function CustomDashboardBuilder({ onSave, onCancel, initialWidgets = [] }: CustomDashboardBuilderProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(initialWidgets);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [isAddingWidget, setIsAddingWidget] = useState(false);

  const addWidget = (type: string) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: type as any,
      title: `New ${widgetTypes.find(w => w.id === type)?.name || 'Widget'}`,
      dataSource: 'servers',
      timeRange: '24h',
      filters: {},
      position: { x: 0, y: 0, w: 6, h: 4 },
      config: {},
    };
    setWidgets([...widgets, newWidget]);
    setSelectedWidget(newWidget.id);
    setIsAddingWidget(false);
  };

  const updateWidget = (id: string, updates: Partial<DashboardWidget>) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    if (selectedWidget === id) {
      setSelectedWidget(null);
    }
  };

  const selectedWidgetData = widgets.find(w => w.id === selectedWidget);

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen" data-testid="dashboard-builder">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" data-testid="builder-title">Dashboard Builder</h1>
          <p className="text-slate-400">Create and customize your analytics dashboard</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onCancel} data-testid="cancel-builder">
            Cancel
          </Button>
          <Button onClick={() => onSave(widgets)} data-testid="save-dashboard">
            Save Dashboard
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Widget List & Add Widget */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="mr-2" size={16} />
                Add Widget
              </CardTitle>
              <CardDescription>Choose a widget type to add to your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {widgetTypes.map((type) => (
                <Button
                  key={type.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-3"
                  onClick={() => addWidget(type.id)}
                  data-testid={`add-widget-${type.id}`}
                >
                  <type.icon size={16} className="mr-3" />
                  <div className="text-left">
                    <div className="font-medium">{type.name}</div>
                    <div className="text-xs text-slate-400">{type.description}</div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dashboard Widgets</CardTitle>
              <CardDescription>{widgets.length} widgets configured</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {widgets.map((widget) => (
                  <div
                    key={widget.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                      selectedWidget === widget.id ? 'bg-blue-900/50 border border-blue-500' : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                    onClick={() => setSelectedWidget(widget.id)}
                    data-testid={`widget-item-${widget.id}`}
                  >
                    <div className="flex items-center">
                      <GripVertical size={14} className="text-slate-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium">{widget.title}</div>
                        <div className="text-xs text-slate-400">{widget.type} chart</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWidget(widget.id);
                      }}
                      data-testid={`remove-widget-${widget.id}`}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
                {widgets.length === 0 && (
                  <div className="text-center text-slate-400 py-8">
                    <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No widgets added yet</p>
                    <p className="text-xs">Add widgets to customize your dashboard</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Widget Configuration */}
        <div className="col-span-4">
          {selectedWidgetData ? (
            <Card>
              <CardHeader>
                <CardTitle>Configure Widget</CardTitle>
                <CardDescription>Customize the selected widget settings</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="general" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="data">Data</TabsTrigger>
                    <TabsTrigger value="style">Style</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4">
                    <div>
                      <Label htmlFor="widget-title">Widget Title</Label>
                      <Input
                        id="widget-title"
                        value={selectedWidgetData.title}
                        onChange={(e) => updateWidget(selectedWidgetData.id, { title: e.target.value })}
                        data-testid="widget-title-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="widget-type">Widget Type</Label>
                      <Select
                        value={selectedWidgetData.type}
                        onValueChange={(value) => updateWidget(selectedWidgetData.id, { type: value as any })}
                      >
                        <SelectTrigger data-testid="widget-type-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {widgetTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Width</Label>
                        <Input
                          type="number"
                          value={selectedWidgetData.position.w}
                          onChange={(e) => updateWidget(selectedWidgetData.id, {
                            position: { ...selectedWidgetData.position, w: parseInt(e.target.value) }
                          })}
                          min="1"
                          max="12"
                          data-testid="widget-width-input"
                        />
                      </div>
                      <div>
                        <Label>Height</Label>
                        <Input
                          type="number"
                          value={selectedWidgetData.position.h}
                          onChange={(e) => updateWidget(selectedWidgetData.id, {
                            position: { ...selectedWidgetData.position, h: parseInt(e.target.value) }
                          })}
                          min="1"
                          max="10"
                          data-testid="widget-height-input"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="data" className="space-y-4">
                    <div>
                      <Label htmlFor="data-source">Data Source</Label>
                      <Select
                        value={selectedWidgetData.dataSource}
                        onValueChange={(value) => updateWidget(selectedWidgetData.id, { dataSource: value })}
                      >
                        <SelectTrigger data-testid="data-source-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dataSources.map((source) => (
                            <SelectItem key={source.id} value={source.id}>
                              <div>
                                <div>{source.name}</div>
                                <div className="text-xs text-slate-400">{source.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="time-range">Time Range</Label>
                      <Select
                        value={selectedWidgetData.timeRange}
                        onValueChange={(value) => updateWidget(selectedWidgetData.id, { timeRange: value })}
                      >
                        <SelectTrigger data-testid="time-range-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeRanges.map((range) => (
                            <SelectItem key={range.id} value={range.id}>
                              {range.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="filters">Filters (JSON)</Label>
                      <Textarea
                        id="filters"
                        value={JSON.stringify(selectedWidgetData.filters, null, 2)}
                        onChange={(e) => {
                          try {
                            const filters = JSON.parse(e.target.value);
                            updateWidget(selectedWidgetData.id, { filters });
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }}
                        placeholder='{"severity": "critical", "serverId": "srv-001"}'
                        data-testid="filters-textarea"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="style" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-legend">Show Legend</Label>
                      <Switch
                        id="show-legend"
                        checked={selectedWidgetData.config.showLegend !== false}
                        onCheckedChange={(checked) =>
                          updateWidget(selectedWidgetData.id, {
                            config: { ...selectedWidgetData.config, showLegend: checked }
                          })
                        }
                        data-testid="show-legend-switch"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-grid">Show Grid Lines</Label>
                      <Switch
                        id="show-grid"
                        checked={selectedWidgetData.config.showGrid !== false}
                        onCheckedChange={(checked) =>
                          updateWidget(selectedWidgetData.id, {
                            config: { ...selectedWidgetData.config, showGrid: checked }
                          })
                        }
                        data-testid="show-grid-switch"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="animate">Animate Charts</Label>
                      <Switch
                        id="animate"
                        checked={selectedWidgetData.config.animate !== false}
                        onCheckedChange={(checked) =>
                          updateWidget(selectedWidgetData.id, {
                            config: { ...selectedWidgetData.config, animate: checked }
                          })
                        }
                        data-testid="animate-switch"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-slate-400">
                  <BarChart3 size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Widget Selected</p>
                  <p className="text-sm">Select a widget from the list to configure it</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dashboard Preview */}
        <div className="col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Preview</CardTitle>
              <CardDescription>Preview of your custom dashboard layout</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-2 min-h-96" data-testid="dashboard-preview">
                {widgets.map((widget) => (
                  <div
                    key={widget.id}
                    className={`rounded border-2 p-3 flex items-center justify-center ${
                      selectedWidget === widget.id ? 'border-blue-500 bg-blue-900/20' : 'border-slate-600 bg-slate-800'
                    }`}
                    style={{
                      gridColumn: `span ${widget.position.w}`,
                      minHeight: `${widget.position.h * 60}px`,
                    }}
                    onClick={() => setSelectedWidget(widget.id)}
                    data-testid={`preview-widget-${widget.id}`}
                  >
                    <div className="text-center">
                      <div className="text-sm font-medium text-white">{widget.title}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {widgetTypes.find(t => t.id === widget.type)?.name} | {widget.dataSource}
                      </div>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {widget.timeRange}
                      </Badge>
                    </div>
                  </div>
                ))}
                {widgets.length === 0 && (
                  <div className="col-span-12 flex items-center justify-center h-96 border-2 border-dashed border-slate-600 rounded">
                    <div className="text-center text-slate-400">
                      <BarChart3 size={64} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Empty Dashboard</p>
                      <p className="text-sm">Add widgets to see them here</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}