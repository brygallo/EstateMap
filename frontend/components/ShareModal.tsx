'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Share2, Copy, Check, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  title?: string;
  description?: string;
  shareTitle?: string;
  shareDescription?: string;
}

const ShareModal = ({
  isOpen,
  onClose,
  shareUrl,
  title = 'Compartir Filtros',
  description = 'Comparte esta búsqueda con otros usuarios',
  shareTitle,
  shareDescription
}: ShareModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const markCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        markCopied();
        return;
      }
      throw new Error('Clipboard API no disponible');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(textarea);
      if (ok) {
        markCopied();
      } else {
        toast.error('No se pudo copiar el enlace. Cópialo manualmente.');
      }
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('share-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, 512, 512);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = 'qr-code-estatemap.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // Prepare sharing texts
  const textToShare = shareTitle || title;
  const descriptionToShare = shareDescription || description;
  const fullText = `${textToShare} - ${descriptionToShare}`;

  // Build URLs for social media platforms
  const encodedUrl = encodeURIComponent(shareUrl);

  const socialLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm gap-0 rounded-modal border-line p-0">
        {/* Header */}
        <DialogHeader className="space-y-1 border-b border-line px-5 pb-4 pt-5 text-left">
          <DialogTitle className="flex items-center gap-2 pr-6 text-lg font-bold text-textPrimary">
            <Share2 className="h-5 w-5 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
            <span className="truncate">{title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-textSecondary">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-4 px-5 py-4">
          {/* Facebook Share Button */}
          <div>
            <span className="mb-2 block text-xs font-semibold text-textPrimary">
              Compartir en Facebook
            </span>
            <a
              href={socialLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="share-btn group flex w-full items-center justify-center gap-3 rounded-button bg-[#1877F2] p-3.5 text-white shadow-card transition-all hover:bg-[#0C63D4] hover:shadow-cardHover"
            >
              <svg className="h-7 w-7 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-base font-bold">Compartir en Facebook</span>
            </a>
          </div>

          {/* Share Link */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-textPrimary">
              O copia el enlace
            </span>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={shareUrl}
                readOnly
                aria-label="Enlace para compartir"
                className="flex-1 rounded-input border border-line bg-background px-2.5 py-2 text-xs text-textSecondary focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={cn(
                  'share-btn flex flex-shrink-0 items-center gap-1 rounded-button px-3 py-2 text-xs font-semibold text-white transition-all',
                  copied ? 'bg-success' : 'bg-primary hover:bg-primaryHover'
                )}
                aria-label={copied ? 'Enlace copiado' : 'Copiar enlace'}
              >
                {copied ? (
                  <>
                    <Check className="check-pop h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    <span className="hidden sm:inline">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    <span className="hidden sm:inline">Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center border-t border-line pt-4">
            <div className="rounded-card border border-line bg-white p-2 shadow-card">
              <QRCodeSVG
                id="share-qr-code"
                value={shareUrl}
                size={120}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="mt-2 text-center text-[10px] text-textSecondary">
              Escanea para compartir
            </p>
            <button
              onClick={handleDownloadQR}
              className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primaryHover"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Descargar QR
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="rounded-b-modal border-t border-line bg-background px-5 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-button border border-line bg-surface px-3 py-2 text-sm font-semibold text-textPrimary transition-colors hover:bg-muted"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>

      {/* Microinteracciones: rebote suave en botones y "pop" del check al copiar. */}
      <style>{`
        @keyframes shareBounce {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-3px); }
          70% { transform: translateY(-1px); }
        }
        .share-btn:hover { animation: shareBounce 0.45s ease; }
        @keyframes checkPop {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .check-pop { animation: checkPop 0.3s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .share-btn:hover, .check-pop { animation: none; }
        }
      `}</style>
    </Dialog>
  );
};

export default ShareModal;
