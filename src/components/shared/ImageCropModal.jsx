import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

async function getCroppedImg(imageSrc, scale, offsetX, offsetY, containerWidth, containerHeight) {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  
  return new Promise((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = containerWidth;
      canvas.height = containerHeight;

      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      
      ctx.drawImage(
        image,
        offsetX,
        offsetY,
        containerWidth,
        containerHeight,
        0,
        0,
        containerWidth,
        containerHeight
      );

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    };
    image.onerror = reject;
    image.src = imageSrc;
  });
}

export default function ImageCropModal({ open, onClose, imageUrl, onSave, aspectRatio = 3/4 }) {
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [uploading, setUploading] = useState(false);
  const containerRef = useRef(null);

  const handleSave = async () => {
    try {
      setUploading(true);
      const containerWidth = 300;
      const containerHeight = 400;
      
      const croppedBlob = await getCroppedImg(imageUrl, scale, offsetX, offsetY, containerWidth, containerHeight);
      const file = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });
      const response = await base44.integrations.Core.UploadFile({ file });
      
      const fileUrl = response.file_url || response.data?.file_url;
      if (!fileUrl) {
        throw new Error('No file URL returned from upload');
      }
      
      await onSave(fileUrl);
      toast.success('Photo saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error(`Failed to save photo: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adjust Image Position</DialogTitle>
        </DialogHeader>
        
        <div className="relative w-full bg-gray-900 overflow-hidden" style={{ height: '400px' }} ref={containerRef}>
          <img 
            src={imageUrl} 
            alt="Crop preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`,
              transformOrigin: 'center',
              transition: 'transform 0.1s ease'
            }}
          />
        </div>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <Slider
              value={[scale]}
              onValueChange={(value) => setScale(value[0])}
              min={0.5}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Apply'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}