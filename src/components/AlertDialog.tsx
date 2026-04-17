import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TriangleAlert, Terminal, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  buttonText?: string;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  buttonText = 'Acknowledge Protocol',
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 border-none shadow-[0_40px_100px_rgba(0,0,0,0.3)] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-[40px] overflow-hidden">
        <div className="p-10 pb-6 bg-zinc-50 dark:bg-zinc-800/20">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shadow-lg">
                    <TriangleAlert className="h-6 w-6 text-white dark:text-zinc-900 animate-pulse" />
                </div>
                <Badge className="bg-zinc-900/10 dark:bg-zinc-100/10 text-zinc-900 dark:text-zinc-100 border-none font-black text-[9px] tracking-widest px-3 py-1 uppercase">
                    System Notification
                </Badge>
            </div>
            <DialogTitle className="text-4xl font-black tracking-tighter uppercase italic leading-none mb-3">
                {title}
            </DialogTitle>
            <DialogDescription className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed italic">
                {description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <DialogFooter className="p-10 pt-4">
          <Button
            onClick={() => onOpenChange(false)}
            className="h-14 w-full rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-[10px] uppercase tracking-[6px] shadow-2xl transition-all active:scale-95 italic"
          >
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
