import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Plus,
  Trash2,
  Star,
  StarOff,
  Search,
  Cpu,
  DollarSign,
  Layers,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AiModel } from "@shared/schema";

export default function ModelsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newModel, setNewModel] = useState({
    name: "",
    modelId: "",
    description: "",
    category: "general",
    contextWindow: 8192,
    inputCost: "0",
    outputCost: "0",
  });

  const { data: models = [], isLoading } = useQuery<AiModel[]>({
    queryKey: ["/api/models"],
  });

  const addModel = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/models", newModel);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      setDialogOpen(false);
      setNewModel({ name: "", modelId: "", description: "", category: "general", contextWindow: 8192, inputCost: "0", outputCost: "0" });
      toast({ title: "Model added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add model", description: error.message, variant: "destructive" });
    },
  });

  const toggleModel = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: number; isEnabled: boolean }) => {
      await apiRequest("PATCH", `/api/models/${id}`, { isEnabled });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/models"] }),
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: number; isFavorite: boolean }) => {
      await apiRequest("PATCH", `/api/models/${id}`, { isFavorite });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/models"] }),
  });

  const deleteModel = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/models/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      toast({ title: "Model removed" });
    },
  });

  const filtered = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.modelId.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || m.category === category;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...new Set(models.map((m) => m.category || "general"))];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-models-title">
            <Bot className="w-6 h-6 text-primary" />
            AI Models
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your AI models. Add any OpenRouter model by ID.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-model" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Model
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add OpenRouter Model</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  data-testid="input-model-name"
                  placeholder="e.g. DeepSeek V3"
                  value={newModel.name}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">OpenRouter Model ID</label>
                <Input
                  data-testid="input-model-id"
                  placeholder="e.g. deepseek/deepseek-v3"
                  value={newModel.modelId}
                  onChange={(e) => setNewModel({ ...newModel, modelId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Find model IDs at openrouter.ai/models
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  data-testid="input-model-description"
                  placeholder="Brief description"
                  value={newModel.description}
                  onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={newModel.category}
                    onValueChange={(v) => setNewModel({ ...newModel, category: v })}
                  >
                    <SelectTrigger data-testid="select-model-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="coding">Coding</SelectItem>
                      <SelectItem value="reasoning">Reasoning</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                      <SelectItem value="fast">Fast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Context Window</label>
                  <Input
                    data-testid="input-context-window"
                    type="number"
                    value={newModel.contextWindow}
                    onChange={(e) =>
                      setNewModel({ ...newModel, contextWindow: parseInt(e.target.value) || 8192 })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Input Cost ($/1M tokens)</label>
                  <Input
                    data-testid="input-cost-input"
                    placeholder="0"
                    value={newModel.inputCost}
                    onChange={(e) => setNewModel({ ...newModel, inputCost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Output Cost ($/1M tokens)</label>
                  <Input
                    data-testid="input-cost-output"
                    placeholder="0"
                    value={newModel.outputCost}
                    onChange={(e) => setNewModel({ ...newModel, outputCost: e.target.value })}
                  />
                </div>
              </div>
              <Button
                data-testid="button-save-model"
                onClick={() => addModel.mutate()}
                disabled={!newModel.name || !newModel.modelId || addModel.isPending}
                className="w-full"
              >
                {addModel.isPending ? "Adding..." : "Add Model"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-models"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-5 space-y-3">
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {models.length === 0 ? "No models configured. Add your first model." : "No models match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((model) => (
            <Card key={model.id} className="hover-elevate" data-testid={`card-model-${model.id}`}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate" data-testid={`text-model-name-${model.id}`}>
                        {model.name}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">{model.modelId}</p>
                    </div>
                  </div>
                  <button
                    data-testid={`button-favorite-${model.id}`}
                    onClick={() =>
                      toggleFavorite.mutate({ id: model.id, isFavorite: !model.isFavorite })
                    }
                  >
                    {model.isFavorite ? (
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ) : (
                      <StarOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>

                {model.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {model.description}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <Badge variant="outline" className="text-xs gap-1">
                    <Layers className="w-3 h-3" />
                    {(model.contextWindow || 8192).toLocaleString()}
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <DollarSign className="w-3 h-3" />
                    {model.inputCost === "0" && model.outputCost === "0" ? "Free" : `$${model.inputCost}`}
                  </Badge>
                  {model.category && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Sparkles className="w-3 h-3" />
                      {model.category}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      data-testid={`switch-model-enabled-${model.id}`}
                      checked={model.isEnabled}
                      onCheckedChange={(checked) =>
                        toggleModel.mutate({ id: model.id, isEnabled: checked })
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {model.isEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid={`button-delete-model-${model.id}`}
                    onClick={() => deleteModel.mutate(model.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
