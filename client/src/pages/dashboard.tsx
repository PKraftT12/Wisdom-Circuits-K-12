import { useState } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { type WisdomCircuit } from "@shared/schema";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { findBestMatchingIcon } from "@shared/icon-matcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Footer } from "@/components/ui/footer";
import ChatModal from '@/components/chat-modal';
import { Send, LogOut, Settings } from 'lucide-react';
import { UserSettingsDialog } from '@/components/user-settings-dialog';
import { queryClient } from '@/lib/queryClient';

interface ColorScheme {
  bg: string;
  icon: string;
  accent: string;
}

const COLOR_SCHEMES: ColorScheme[] = [
  { bg: "bg-violet-100", icon: "text-violet-200", accent: "text-violet-700" },
  { bg: "bg-yellow-100", icon: "text-yellow-200", accent: "text-yellow-700" },
  { bg: "bg-blue-100", icon: "text-blue-200", accent: "text-blue-700" },
  { bg: "bg-green-100", icon: "text-green-200", accent: "text-green-700" },
  { bg: "bg-orange-100", icon: "text-orange-200", accent: "text-orange-700" },
  { bg: "bg-red-100", icon: "text-red-200", accent: "text-red-700" },
  { bg: "bg-pink-100", icon: "text-pink-200", accent: "text-pink-700" },
  { bg: "bg-purple-100", icon: "text-purple-200", accent: "text-purple-700" },
  { bg: "bg-indigo-100", icon: "text-indigo-200", accent: "text-indigo-700" },
  { bg: "bg-cyan-100", icon: "text-cyan-200", accent: "text-cyan-700" },
  { bg: "bg-teal-100", icon: "text-teal-200", accent: "text-teal-700" },
  { bg: "bg-amber-100", icon: "text-amber-200", accent: "text-amber-700" },
];

const getUniqueColorScheme = (existingBgColors: string[]): ColorScheme => {
  const availableSchemes = COLOR_SCHEMES.filter(
    scheme => !existingBgColors.includes(scheme.bg)
  );

  if (availableSchemes.length === 0) {
    return COLOR_SCHEMES[Math.floor(Math.random() * COLOR_SCHEMES.length)];
  }

  return availableSchemes[Math.floor(Math.random() * availableSchemes.length)];
};

const Dashboard = () => {
  const { user, logoutMutation } = useAuth();
  const [selectedCircuit, setSelectedCircuit] = useState<any>(null);
  const [circuitCode, setCircuitCode] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { data: apiCircuits = [] } = useQuery<WisdomCircuit[]>({
    queryKey: ["/api/wisdom-circuits/added"],
    enabled: !!user?.id,
  });

  const { data: archivedCircuits = [] } = useQuery<WisdomCircuit[]>({
    queryKey: ["/api/wisdom-circuits/archived"],
    enabled: !!user?.isTeacher
  });

  const formattedCircuits = apiCircuits.map((circuit, index) => {
    const existingBgColors = apiCircuits
      .slice(0, index)
      .map(c => (c.colorScheme as ColorScheme)?.bg)
      .filter(Boolean);

    // Always generate a new color scheme if one doesn't exist
    const colorScheme = getUniqueColorScheme(existingBgColors);

    const Icon = findBestMatchingIcon(circuit.name);

    return {
      id: String(circuit.id),
      subject: circuit.name,
      teacher: circuit.teacherName,
      description: circuit.description,
      Icon,
      bgColor: colorScheme.bg,
      iconColor: colorScheme.icon,
      accentColor: colorScheme.accent,
      isApiCircuit: true,
      code: circuit.code,
      colorScheme,
    };
  });

  const addCircuitByCode = useMutation({
    mutationFn: async (code: string) => {
      if (!code.trim()) {
        throw new Error("Please enter a circuit code");
      }

      const response = await fetch(`/api/wisdom-circuits/add/${code.trim()}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Invalid circuit code. Please check and try again.");
      }

      return await response.json();
    },
    onSuccess: (circuit) => {
      const existingBgColors = formattedCircuits.map(c => c.colorScheme?.bg);
      const colorScheme = getUniqueColorScheme(existingBgColors);
      const Icon = findBestMatchingIcon(circuit.name + ' ' + circuit.description);

      const newCircuit = {
        id: String(circuit.id),
        subject: circuit.name,
        teacher: circuit.teacherName,
        description: circuit.description,
        Icon,
        bgColor: colorScheme.bg,
        iconColor: colorScheme.icon,
        accentColor: colorScheme.accent,
        isApiCircuit: true,
        code: circuit.code,
        colorScheme,
      };

      queryClient.setQueryData(["/api/wisdom-circuits/added"],
        (old: WisdomCircuit[] = []) => [{
          ...circuit,
          colorScheme,
        }, ...old]
      );

      setCircuitCode('');
      toast({
        title: "Success!",
        description: "Wisdom Circuit added to your dashboard.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add circuit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddCircuit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!circuitCode) {
      toast({
        title: "Error",
        description: "Please enter a circuit code",
        variant: "destructive",
      });
      return;
    }
    addCircuitByCode.mutate(circuitCode.trim());
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }

    const items = reorder(
      formattedCircuits,
      result.source.index,
      result.destination.index
    );

    queryClient.setQueryData(["/api/wisdom-circuits/added"],
      items.map(item => ({
        id: Number(item.id),
        code: item.code,
        name: item.subject,
        teacherName: item.teacher,
        description: item.description,
        colorScheme: item.colorScheme,
        grade: apiCircuits.find(c => c.id === Number(item.id))?.grade || '',
        createdAt: apiCircuits.find(c => c.id === Number(item.id))?.createdAt || new Date(),
        teacherId: apiCircuits.find(c => c.id === Number(item.id))?.teacherId || 0,
        teachingStyles: apiCircuits.find(c => c.id === Number(item.id))?.teachingStyles || ['hybrid'],
        homeworkPolicies: apiCircuits.find(c => c.id === Number(item.id))?.homeworkPolicies || ['guide'],
        responseTypes: apiCircuits.find(c => c.id === Number(item.id))?.responseTypes || ['detailed'],
        stateAlignment: apiCircuits.find(c => c.id === Number(item.id))?.stateAlignment || 'California',
        isArchived: false
      }))
    );
  };

  const archiveCircuitMutation = useMutation({
    mutationFn: async (circuitId: number) => {
      console.log('Attempting to archive circuit:', circuitId);
      const response = await fetch(`/api/wisdom-circuits/${circuitId}/archive`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to archive circuit");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wisdom-circuits/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wisdom-circuits/added"] });
      toast({
        title: "Success",
        description: "Circuit archived successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Archive mutation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unarchiveCircuitMutation = useMutation({
    mutationFn: async (circuitId: number) => {
      const response = await fetch(`/api/wisdom-circuits/${circuitId}/unarchive`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to unarchive circuit");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wisdom-circuits/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wisdom-circuits/added"] });
      toast({
        title: "Success",
        description: "Circuit unarchived successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCircuitMutation = useMutation({
    mutationFn: async (circuitId: number) => {
      console.log('Attempting to delete circuit:', circuitId);
      const response = await fetch(`/api/wisdom-circuits/${circuitId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete circuit");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wisdom-circuits/added"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wisdom-circuits/archived"] });
      toast({
        title: "Success",
        description: "Circuit deleted successfully",
      });
      setShowSettings(false);
    },
    onError: (error: Error) => {
      console.error('Delete mutation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorder = (list: any[], startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col items-start p-2">
            {!logoError ? (
              <img
                src="/WisdomCircuit_Logo_Final_1.png"
                alt="Wisdom Circuit"
                className="h-12 w-auto mb-1"
                onError={(e) => {
                  console.error('Logo failed to load');
                  setLogoError(true);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <h1 className="text-2xl font-black tracking-tight">WISDOM CIRCUIT</h1>
            )}
            <p className="text-sm font-medium text-gray-600 mt-1">
              Fueling Knowledge, Igniting Success.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Add a Wisdom Circuit</span>
              <form onSubmit={handleAddCircuit} className="relative">
                <input
                  type="text"
                  value={circuitCode}
                  onChange={(e) => setCircuitCode(e.target.value)}
                  placeholder="enter Wisdom Circuit code"
                  className="pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-600
                    placeholder:text-gray-400 focus:outline-none focus:border-blue-400
                    w-64"
                />
                <button
                  type="submit"
                  disabled={addCircuitByCode.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full
                    hover:bg-gray-100 transition-colors"
                >
                  <Send className="h-4 w-4 text-gray-400" />
                </button>
              </form>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-14 w-14 rounded-full">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName || 'default'}`}
                    alt="User avatar"
                    className="h-full w-full rounded-full"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <UserSettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          circuits={apiCircuits}
          archivedCircuits={archivedCircuits}
          onArchive={(circuit) => archiveCircuitMutation.mutate(circuit.id)}
          onUnarchive={(circuit) => unarchiveCircuitMutation.mutate(circuit.id)}
          onDelete={(circuit) => deleteCircuitMutation.mutate(circuit.id)}
          onCircuitClick={() => { }}
        />

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="circuits" direction="horizontal">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="grid grid-cols-3 gap-6"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {formattedCircuits.map((circuit, index) => (
                  <Draggable
                    key={circuit.id}
                    draggableId={circuit.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.8 : 1,
                        }}
                      >
                        <div
                          className={`${circuit.bgColor} aspect-square rounded-xl p-4 relative
                            overflow-hidden transition-all duration-300
                            border border-gray-200 shadow-md
                            hover:shadow-xl hover:scale-105 hover:bg-opacity-80 hover:border-opacity-50
                            group cursor-move`}
                          onClick={() => setSelectedCircuit(circuit)}
                        >
                          <div className="absolute -bottom-4 -right-4 opacity-100 transition-transform duration-300 group-hover:scale-110">
                            <circuit.Icon
                              className={`w-40 h-40 ${circuit.iconColor}`}
                              strokeWidth={1.5}
                            />
                          </div>

                          <div className="relative z-10">
                            <span className={`text-sm font-bold uppercase tracking-wider ${circuit.accentColor}`}>
                              {circuit.subject}
                            </span>

                            <h2 className="text-xl font-bold text-gray-800 mt-4 tracking-tight group-hover:text-opacity-80">
                              {circuit.teacher}
                            </h2>

                            <p className="text-sm text-gray-600 mt-2">
                              {circuit.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <ChatModal
          circuit={selectedCircuit}
          isOpen={!!selectedCircuit}
          onClose={() => setSelectedCircuit(null)}
        />

        <Footer />
      </div>
    </div>
  );
};

export default Dashboard;