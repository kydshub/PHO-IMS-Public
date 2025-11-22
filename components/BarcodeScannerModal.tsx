import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface BarcodeScannerModalProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const codeReader = useRef(new BrowserMultiFormatReader());
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    if (!videoRef.current) return;

    const reader = codeReader.current;
    let isMounted = true;
    const videoElement = videoRef.current;

    videoElement.onloadeddata = () => {
        if (isMounted) {
            setIsCameraLoading(false);
        }
    };
    
    reader.decodeFromVideoDevice(undefined, videoElement, (result, err) => {
        if (!isMounted) return;

        if (result) {
          onScanRef.current(result.getText());
        }

        if (err && !(err instanceof NotFoundException)) {
          console.error('Barcode scan error:', err);
          setError('An error occurred while scanning. Please try again.');
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        console.error("Error accessing camera: ", err);
        let errorMessage = `An unexpected error occurred: ${err.message || 'Unknown error'}. Please try again.`;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
             errorMessage = 'Camera permission was denied. To use the scanner, please grant camera access in your browser settings.';
        } else if (err.name === 'NotFoundError') {
            errorMessage = 'No camera found on this device. Please ensure a camera is connected and enabled.';
        } else if (err.name === 'NotReadableError') {
            errorMessage = 'The camera is currently in use by another application or there was a hardware error. Please close other applications and try again.';
        }
        setError(errorMessage);
        setIsCameraLoading(false);
      });

    return () => {
      isMounted = false;
      reader.reset();
      videoElement.onloadeddata = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal title="Scan Item Barcode" isOpen={true} onClose={onClose}>
        <style>
            {`@keyframes scan {
                0%, 100% { transform: translateY(-45%); opacity: 0.5; }
                50% { transform: translateY(45%); opacity: 1; }
            }`}
        </style>
        <div className="relative aspect-video w-full bg-secondary-900 rounded-md overflow-hidden flex items-center justify-center">
             <video ref={videoRef} className={`h-full w-full object-cover ${isCameraLoading || error ? 'hidden' : 'block'}`} />
             
             {/* Scanning Line Overlay */}
             {!isCameraLoading && !error && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                    <div className="w-[90%] h-0.5 bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,0.7)] animate-[scan_2s_ease-in-out_infinite]"></div>
                </div>
             )}
             
             {isCameraLoading && !error && <Spinner />}
             
             {error && (
                <div className="p-4 text-center text-white">
                    <p className="font-semibold">Camera Error</p>
                    <p className="text-sm">{error}</p>
                </div>
             )}
        </div>
        <div className="mt-4 text-center">
            <p className="text-secondary-600">Point the camera at a product barcode.</p>
        </div>
    </Modal>
  );
};

export default BarcodeScannerModal;