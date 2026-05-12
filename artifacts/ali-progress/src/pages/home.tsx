import { useSession } from "@/hooks/use-session";
import { MILESTONES } from "@/lib/nodes";
import { 
  useGetUserProgress, 
  getGetUserProgressQueryKey, 
  useUpsertUserProgress 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Lock, ChevronRight, PlaySquare } from "lucide-react";
import { useState, useEffect } from "react";
import { AdOverlay } from "@/components/AdOverlay";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export default function Home() {
  const sessionId = useSession();
  const queryClient = useQueryClient();
  const [adState, setAdState] = useState<{ isOpen: boolean, type: "interstitial" | "video" }>({ 
    isOpen: false, 
    type: "interstitial" 
  });

  const { data: progressData, isLoading } = useGetUserProgress(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetUserProgressQueryKey(sessionId),
    }
  });

  const upsertProgress = useUpsertUserProgress();

  const completedNodes = progressData?.completedNodes || [];
  const completedCount = completedNodes.length;
  const totalNodes = MILESTONES.length;
  
  // Highest completed node id (1-indexed) or 0
  const maxCompleted = completedNodes.length > 0 ? Math.max(...completedNodes) : 0;
  
  // The next available node is maxCompleted + 1
  const availableNode = maxCompleted + 1;

  const handleCompleteNode = (nodeId: number) => {
    if (!sessionId) return;
    
    // Only allow completing the available node
    if (nodeId !== availableNode) return;

    const newCompleted = [...completedNodes, nodeId];
    const newCurrent = nodeId + 1 <= totalNodes ? nodeId + 1 : nodeId;

    upsertProgress.mutate(
      {
        sessionId,
        data: {
          completedNodes: newCompleted,
          currentNode: newCurrent,
        }
      },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetUserProgressQueryKey(sessionId), data);
          
          // Trigger interstitial ad every 3 completions
          if (newCompleted.length % 3 === 0) {
            setAdState({ isOpen: true, type: "interstitial" });
          }
        }
      }
    );
  };

  const closeAd = () => {
    setAdState({ isOpen: false, type: "interstitial" });
  };

  const showVideoAd = () => {
    setAdState({ isOpen: true, type: "video" });
  };

  if (isLoading || !sessionId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const progressPercentage = (completedCount / totalNodes) * 100;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b shadow-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-6">
          <div className="font-bold text-sm tracking-wider uppercase text-slate-500 shrink-0">
            ALI Initiative
          </div>
          <div className="flex-1 max-w-md">
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span>Progress Path</span>
              <span className="text-primary">{completedCount} / {totalNodes}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" data-testid="progress-bar-main" />
          </div>
        </div>
      </div>

      {/* Main Path */}
      <div className="pt-32 px-6 max-w-4xl mx-auto flex flex-col items-center">
        <div className="w-full relative flex flex-col items-center">
          {/* Central Line */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-slate-200 -z-10" />
          
          {MILESTONES.map((label, index) => {
            const nodeId = index + 1;
            const isCompleted = completedNodes.includes(nodeId);
            const isAvailable = nodeId === availableNode;
            const isLocked = nodeId > availableNode;
            
            // Layout logic: snake/zigzag
            // Even rows go right, odd rows go left
            const row = Math.floor(index / 1); // just alternate every item for simpler visual snake
            const isRight = index % 2 === 0;

            return (
              <motion.div
                key={nodeId}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.05 % 0.3 }}
                className={`w-full flex ${isRight ? 'justify-end pr-8 md:pr-0 md:justify-end md:w-1/2 md:ml-auto md:pl-12' : 'justify-start pl-8 md:pl-0 md:justify-start md:w-1/2 md:mr-auto md:pr-12'} mb-16 relative`}
                data-testid={`node-${nodeId}`}
              >
                {/* Connector point on the central line */}
                <div className="absolute top-1/2 -translate-y-1/2 hidden md:block" 
                     style={{ [isRight ? 'left' : 'right']: '-16px' }}>
                  <div className={`w-8 h-1 ${isCompleted ? 'bg-primary' : 'bg-slate-200'}`} />
                </div>
                
                {/* Node Card */}
                <button
                  onClick={() => handleCompleteNode(nodeId)}
                  disabled={!isAvailable}
                  className={`
                    relative group flex flex-col p-6 rounded-2xl w-full max-w-[320px] text-left transition-all duration-300
                    ${isCompleted ? 'bg-white border-2 border-primary/20 shadow-md' : ''}
                    ${isAvailable ? 'bg-primary text-primary-foreground shadow-xl scale-105 hover:scale-[1.07]' : ''}
                    ${isLocked ? 'bg-slate-100/50 border border-slate-200 opacity-60' : ''}
                  `}
                  data-testid={`button-node-${nodeId}`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-full shrink-0 font-bold shadow-inner
                      ${isCompleted ? 'bg-primary text-white' : ''}
                      ${isAvailable ? 'bg-white text-primary' : ''}
                      ${isLocked ? 'bg-slate-200 text-slate-400' : ''}
                    `}>
                      {isCompleted ? <Check className="w-5 h-5" /> : nodeId}
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs uppercase tracking-widest font-bold opacity-70`}>
                        Milestone {nodeId}
                      </div>
                      <h3 className={`font-bold text-lg leading-tight mt-1 ${isAvailable ? 'text-white' : 'text-slate-900'}`}>
                        {label}
                      </h3>
                    </div>
                  </div>

                  {isAvailable && (
                    <div className="flex items-center gap-2 mt-2 text-sm font-medium bg-white/20 px-3 py-2 rounded-lg w-fit">
                      <span>Click to complete</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}

                  {isLocked && (
                    <div className="absolute top-4 right-4 text-slate-300">
                      <Lock className="w-5 h-5" />
                    </div>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
        
        {completedCount === totalNodes && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="my-16 text-center"
          >
            <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Check className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Mission Accomplished</h2>
            <p className="text-slate-500 max-w-md mx-auto">
              You have successfully completed all milestones in the ALI Initiative Progress Path. 
              Your dedication sets a new standard for leadership.
            </p>
          </motion.div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <Button 
          size="lg" 
          className="rounded-full shadow-2xl h-14 px-6 bg-secondary text-secondary-foreground hover:bg-secondary/90 border-2 border-transparent hover:border-white/50 transition-all hover:scale-105"
          onClick={showVideoAd}
          data-testid="button-fab-ad"
        >
          <PlaySquare className="w-5 h-5 mr-2" />
          <span className="font-bold">Support with an Ad</span>
        </Button>
      </div>

      <AdOverlay 
        isOpen={adState.isOpen} 
        onClose={closeAd} 
        type={adState.type} 
      />
    </div>
  );
}
