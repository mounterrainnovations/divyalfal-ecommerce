'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  loading?: boolean;
  variant?: 'destructive' | 'default';
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  loading,
  variant = 'destructive',
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <div className="bg-white p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              variant === 'destructive' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-stone-900">{title}</DialogTitle>
                <DialogDescription className="text-stone-500 font-medium">
                  {description}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <DialogFooter className="flex gap-3 sm:justify-end">
            <Button
              disabled={loading}
              variant="ghost"
              onClick={onClose}
              className="font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-900 rounded-xl px-6"
            >
              Cancel
            </Button>
            <Button
              disabled={loading}
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              onClick={onConfirm}
              className={`font-bold rounded-xl px-6 shadow-lg transition-all ${
                variant === 'destructive' 
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' 
                : 'bg-stone-900 hover:bg-stone-800 shadow-stone-900/20'
              }`}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
