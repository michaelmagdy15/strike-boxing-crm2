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
import { AlertCircle, Terminal, HelpCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Execute Protocol',
  cancelText = 'Abort Sequence',
  variant = 'default',
}) => {
  const isDestructive = variant === 'destructive';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 border-none shadow-[0_40px_100px_rgba(0,0,0,0.3)] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-[40px] overflow-hidden">
        <div className={cn(
            "p-10 pb-6",
            isDestructive ? "bg-rose-500/5 dark:bg-rose-500/10" : "bg-primary/5 dark:bg-zinc-800/10"
        )}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-6">
                <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg",
                    isDestructive ? "bg-rose-500 text-white shadow-rose-500/20" : "bg-primary text-white shadow-primary/20"
                )}>
                    {isDestructive ? <AlertCircle className="h-6 w-6 animate-pulse" /> : <HelpCircle className="h-6 w-6" />}
                </div>
                <Badge className={cn(
                    "border-none font-black text-[9px] tracking-widest px-3 py-1 uppercase",
                    isDestructive ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"
                )}>
                    {isDestructive ? 'Critical Validation' : 'Operational Inquiry'}
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

        <DialogFooter className="p-10 pt-4 flex flex-col sm:flex-row gap-4">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="h-14 flex-1 rounded-2xl font-black text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all italic"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant as any}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={cn(
                "h-14 flex-[1.5] rounded-2xl font-black text-[10px] uppercase tracking-[4px] shadow-2xl transition-all active:scale-95 italic",
                isDestructive ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20" : "bg-primary hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-primary/20"
            )}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
