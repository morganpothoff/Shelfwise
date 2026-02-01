import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

export default function ISBNScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing camera...');
  const hasScannedRef = useRef(false);
  const onScanRef = useRef(onScan);

  // Keep onScan ref updated without causing re-renders
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        // Configure hints for barcode scanning (EAN-13 is the format for ISBN barcodes)
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints);

        setStatusMessage('Looking for cameras...');
        const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();

        if (!isMounted) return;

        if (videoInputDevices.length === 0) {
          setError('No camera found. Please ensure you have a camera connected.');
          return;
        }

        // Prefer back camera on mobile devices
        const backCamera = videoInputDevices.find(device =>
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        const selectedDevice = backCamera || videoInputDevices[0];

        setStatusMessage(`Using: ${selectedDevice.label || 'Default Camera'}`);

        // Wait for video element to be in DOM
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!videoRef.current || !isMounted) return;

        setIsScanning(true);

        // Start continuous decode
        controlsRef.current = await reader.decodeFromVideoDevice(
          selectedDevice.deviceId,
          videoRef.current,
          (result, err) => {
            if (!isMounted || hasScannedRef.current) return;

            if (result) {
              const scannedText = result.getText();
              setStatusMessage(`Detected: ${scannedText}`);

              // Validate that it looks like an ISBN (10 or 13 digits)
              const cleanedIsbn = scannedText.replace(/[-\s]/g, '');
              if (/^\d{10}$|^\d{13}$/.test(cleanedIsbn)) {
                hasScannedRef.current = true;
                stopScanner();
                onScanRef.current(cleanedIsbn);
              }
            }
          }
        );

        if (isMounted) {
          setStatusMessage('Point camera at ISBN barcode');
        }
      } catch (err) {
        console.error('Scanner error:', err);
        if (isMounted) {
          setError(`Failed to access camera: ${err.message}`);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-theme-card rounded-lg p-4 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-theme-primary">Scan ISBN Barcode</h2>
          <button
            onClick={handleClose}
            className="text-theme-muted hover:text-theme-primary text-2xl"
          >
            &times;
          </button>
        </div>

        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : (
          <>
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                style={{ transform: 'scaleX(1)' }}
              />
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-24 border-2 border-green-400 rounded-lg">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-pulse"
                         style={{ animation: 'scan 2s ease-in-out infinite' }} />
                  </div>
                </div>
              )}
            </div>
            <p className="text-center text-theme-secondary mt-4 text-sm">
              {statusMessage}
            </p>
            <p className="text-center text-theme-muted mt-1 text-xs">
              Hold the barcode steady within the frame
            </p>
          </>
        )}

        <style>{`
          @keyframes scan {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(90px); }
          }
        `}</style>
      </div>
    </div>
  );
}
