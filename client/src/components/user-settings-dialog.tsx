import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { WisdomCircuit } from "@shared/schema";

interface UserSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circuits: WisdomCircuit[];
  archivedCircuits: WisdomCircuit[];
  onArchive: (circuit: WisdomCircuit) => void;
  onUnarchive: (circuit: WisdomCircuit) => void;
  onDelete: (circuit: WisdomCircuit) => void;
  onCircuitClick: (circuit: WisdomCircuit) => void;
}

export function UserSettingsDialog({
  open,
  onOpenChange,
  circuits,
  archivedCircuits,
  onArchive,
  onUnarchive,
  onDelete,
  onCircuitClick,
}: UserSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Circuit Management</DialogTitle>
          <DialogDescription>
            Manage your active and archived circuits
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="active" className="flex-1 flex flex-col min-h-0">
          <TabsList className="px-6">
            <TabsTrigger value="active">Active Circuits</TabsTrigger>
            <TabsTrigger value="archived">Archived Circuits</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden px-6">
            <div className="space-y-6 py-4">
              <TabsContent value="active" className="m-0 mt-0">
                <div className="rounded-md border">
                  <div className="bg-muted/50 p-3 grid grid-cols-12 gap-4 text-sm font-medium border-b">
                    <div className="col-span-4">Name</div>
                    <div className="col-span-2">Grade</div>
                    <div className="col-span-4">Created</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <ScrollArea className="h-[calc(65vh-120px)]">
                    {circuits.map((circuit) => (
                      <div
                        key={circuit.id}
                        className="p-3 grid grid-cols-12 gap-4 items-center text-sm border-t hover:bg-muted/50 cursor-pointer"
                        onClick={() => onCircuitClick(circuit)}
                      >
                        <div className="col-span-4 font-medium">{circuit.name}</div>
                        <div className="col-span-2">Grade {circuit.grade}</div>
                        <div className="col-span-4">
                          {format(new Date(circuit.createdAt), 'MMM d, yyyy')}
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchive(circuit);
                            }}
                            className="h-8 w-8"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(circuit);
                            }}
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="archived" className="m-0 mt-0">
                <div className="rounded-md border">
                  <div className="bg-muted/50 p-3 grid grid-cols-12 gap-4 text-sm font-medium border-b">
                    <div className="col-span-4">Name</div>
                    <div className="col-span-2">Grade</div>
                    <div className="col-span-4">Created</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <ScrollArea className="h-[calc(65vh-120px)]">
                    {archivedCircuits.map((circuit) => (
                      <div
                        key={circuit.id}
                        className="p-3 grid grid-cols-12 gap-4 items-center text-sm border-t hover:bg-muted/50 cursor-pointer"
                        onClick={() => onCircuitClick(circuit)}
                      >
                        <div className="col-span-4 font-medium">{circuit.name}</div>
                        <div className="col-span-2">Grade {circuit.grade}</div>
                        <div className="col-span-4">
                          {format(new Date(circuit.createdAt), 'MMM d, yyyy')}
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUnarchive(circuit);
                            }}
                            className="h-8 w-8"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(circuit);
                            }}
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}