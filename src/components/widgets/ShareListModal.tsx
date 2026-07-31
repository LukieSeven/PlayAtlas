import React, { useState } from 'react';
import { X, Copy, Check, Share2, Globe, Github, QrCode } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';

interface ShareListModalProps {
  isOpen: boolean;
  onClose: () => void;
  listTitle?: string;
  shareUrl?: string;
}

export const ShareListModal: React.FC<ShareListModalProps> = ({
  isOpen,
  onClose,
  shareUrl = 'https://playatlas.app/share/goty-2026-lukie',
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 border border-indigo-500/30 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xl font-bold text-white">Share Public List</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info & GitHub Cache Notice */}
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-indigo-300">
              <Github className="w-4 h-4" />
              <span>GitHub Auto-Sync & Public Cache Active</span>
            </div>
            <p className="text-slate-400">
              This list will be formatted, cached locally, and linked directly to your GitHub repository (<span className="text-indigo-300 font-mono">LukieSeven/PlayAtlas</span>).
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Public Shareable URL
            </label>
            <div className="flex items-center gap-2">
              <Input value={shareUrl} readOnly icon={<Globe className="w-4 h-4" />} />
              <Button
                variant={copied ? 'primary' : 'glow'}
                size="md"
                onClick={handleCopy}
                icon={copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>

        {/* QR & Embed Options */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-slate-500" />
            <span>Generate QR Code</span>
          </div>
          <Badge variant="cyan">READ-ONLY ACCESS</Badge>
        </div>
      </div>
    </div>
  );
};
