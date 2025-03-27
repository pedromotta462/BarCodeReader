import { useState, useEffect, useRef } from "react";
import { Camera, RotateCcw } from "lucide-react";
import Quagga from "@ericblade/quagga2";
import "./ZxingComponent.css";

interface ICodeBarScanner {
  scannedData?: string;
  setScannedData: (data: string) => void;
  justIcon?: boolean;
}

interface QuaggaJSResultObject {
  codeResult: {
    code: string | null;
  };
}

interface ScreenOrientation {
  lock: (orientation: "landscape" | "portrait") => Promise<void>;
  unlock: () => void;
}

const ZxingComponent = ({
  setScannedData,
  justIcon = false,
}: ICodeBarScanner) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    checkOrientation();
    window.addEventListener(`orientationchange`, checkOrientation);
    window.addEventListener(`resize`, checkOrientation);

    return () => {
      cleanupResources();
      window.removeEventListener(`orientationchange`, checkOrientation);
      window.removeEventListener(`resize`, checkOrientation);
    };
  }, []);

  useEffect(() => {
    setHasError(null);
  }, [isLandscape]);

  const checkOrientation = () => {
    const isLandscape = window.innerWidth > window.innerHeight;
    setIsLandscape(isLandscape);
  };

  const cleanupResources = () => {
    if (
      isMobileDevice() &&
      window.screen &&
      window.screen.orientation &&
      window.screen.orientation.unlock
    ) {
      try {
        window.screen.orientation.unlock();
      } catch (e) {
        console.error(`Failed to unlock orientation: `, e);
      }
    }

    Quagga.stop();
    setIsScanning(false);
  };

  const stopScan = () => {
    cleanupResources();
  };

  const requestLandscapeMode = () => {
    if (window.screen && window.screen.orientation) {
      try {
        const orientation = window.screen.orientation as unknown as ScreenOrientation;
        orientation
          .lock(`landscape`)
          .then(() => {
            console.log(`Landscape orientation locked`);
            setIsLandscape(true);
          })
          .catch((error: Error) => {
            console.error(`Failed to lock orientation: `, error);
            setHasError(
              `Gire seu dispositivo para o modo paisagem (horizontal) para um melhor escaneamento`
            );
          });
      } catch {
        console.error(`Screen orientation API not fully supported`);
        setHasError(
          `Gire seu dispositivo para o modo paisagem (horizontal) para um melhor escaneamento`
        );
      }
    } else {
      setHasError(
        `Gire seu dispositivo para o modo paisagem (horizontal) para um melhor escaneamento`
      );
    }
  };

  const startScan = async () => {
    setScannedData('');
    setHasError(null);
    setIsLoading(true);

    if (isMobileDevice() && !isLandscape) {
      requestLandscapeMode();
    }

    try {
      if (!videoRef.current) {
        throw new Error('Elemento de vídeo não encontrado');
      }

      await Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current,
          constraints: {
            facingMode: "environment",
            aspectRatio: { min: 1, max: 2 }
          },
        },
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader",
            "code_128_reader",
            "code_39_reader",
            "upc_reader",
            "upc_e_reader"
          ]
        },
        locate: true,
        frequency: 10,
        debug: false
      });

      setIsScanning(true);
      Quagga.start();

      Quagga.onDetected((result: QuaggaJSResultObject) => {
        if (result.codeResult.code) {
          setScannedData(result.codeResult.code);
          stopScan();
          console.log(`Código escaneado:`, result.codeResult.code);
        }
      });

    } catch (error: unknown) {
      if (error instanceof Error && error.name === `NotAllowedError`) {
        console.log(`Permissão para acessar a câmera foi negada`);
        setHasError(`Permissão para acessar a câmera foi negada`);
      } else {
        console.error(`Erro ao acessar a câmera:`, error);
        setHasError(`Erro: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  return (
    <div className={`scanner-container ${isScanning ? 'scanning' : ''}`}>
      {!isScanning ? (
        <button onClick={startScan} className="scan-button">
          <Camera color="white" size={justIcon ? 24 : 30} />
          {!justIcon && <span>Escanear código</span>}
        </button>
      ) : (
        <div className="scanner-content">
          {isMobileDevice() && !isLandscape && (
            <p className="scanning-text">
              <Camera size={24} /> Escaneando código de barras
            </p>
          )}

          {isLoading && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Inicializando câmera...</p>
            </div>
          )}

          {hasError && <p className="error-text">{hasError}</p>}

          <div
            className={`video-container ${
              isMobileDevice() && !isLandscape ? `please-rotate` : ``
            }`}
          >
            {isMobileDevice() && !isLandscape && (
              <div className="rotation-prompt">
                <RotateCcw size={40} />
                <p>Por favor, gire seu dispositivo para o modo horizontal</p>
              </div>
            )}

            <video
              ref={videoRef}
              className="scanner-video"
              autoPlay
              playsInline
            ></video>

            <div className="scan-area">
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>
              <div className="scan-line"></div>
            </div>

            <p className="scan-instruction">
              Posicione o código de barras dentro da área
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZxingComponent;
