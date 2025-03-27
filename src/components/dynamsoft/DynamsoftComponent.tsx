import React, { useEffect, useRef, useState } from 'react';
import { BarcodeReader } from 'dynamsoft-barcode-reader-bundle';
import './DynamsoftComponent.scss';

// Substituir com sua chave de licença quando tiver uma
BarcodeReader.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
// Em um ambiente de produção, você deve obter uma licença válida em https://www.dynamsoft.com/customer/license/trialLicense

const DynamsoftComponent: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [readerReady, setReaderReady] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BarcodeReader | null>(null);
  const beepSound = useRef<HTMLAudioElement | null>(null);
  const scanInterval = useRef<number | null>(null);

  // Inicialização do leitor e som de feedback
  useEffect(() => {
    const initReader = async () => {
      try {
        // Inicializar o leitor Dynamsoft
        const reader = await BarcodeReader.createInstance();
        
        // Configurar para formatos de código de barras para boletos brasileiros
        await reader.updateRuntimeSettings("balance");
        const settings = await reader.getRuntimeSettings();
        settings.barcodeFormatIds = 
          BarcodeReader.EnumBarcodeFormat.BF_CODE_128 | 
          BarcodeReader.EnumBarcodeFormat.BF_ITF |
          BarcodeReader.EnumBarcodeFormat.BF_EAN_13;
        settings.expectedBarcodesCount = 1; // Otimiza para encontrar apenas um código por vez
        settings.timeout = 5000; // 5 segundos por frame
        await reader.updateRuntimeSettings(settings);
        
        readerRef.current = reader;
        setReaderReady(true);
      } catch (error) {
        console.error('Failed to initialize Dynamsoft Barcode Reader:', error);
        setErrorMessage('Falha ao inicializar o leitor de código de barras');
      }
    };

    // Inicializar som de beep
    beepSound.current = new Audio('/beep.mp3');

    initReader();

    // Cleanup quando o componente for desmontado
    return () => {
      if (readerRef.current) {
        readerRef.current.destroyContext();
        readerRef.current = null;
      }
      
      if (scanInterval.current !== null) {
        clearInterval(scanInterval.current);
        scanInterval.current = null;
      }
    };
  }, []);

  // Iniciar o scanner
  const startScanner = async () => {
    if (!readerReady || !readerRef.current) {
      setErrorMessage('O leitor de código de barras não está pronto');
      return;
    }

    try {
      setErrorMessage('');
      setScanning(true);

      // Acessar a câmera
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment"
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Iniciar o processo de scanning
        scanInterval.current = window.setInterval(async () => {
          if (!scanning || !videoRef.current || !readerRef.current) return;
          
          try {
            const results = await readerRef.current.decode(videoRef.current);
            
            if (results.length > 0) {
              // Filtramos para códigos que possam ser de boletos
              const boletoCode = results.find(result => 
                result.barcodeText && result.barcodeText.length >= 44
              );
              
              if (boletoCode) {
                // Reproduz som de confirmação
                if (beepSound.current) {
                  beepSound.current.play().catch(console.error);
                }
                
                setResult(boletoCode.barcodeText);
                stopScanner();
              }
            }
          } catch (error) {
            // Erros de frame são comuns, então apenas logamos
            console.debug('Error scanning frame:', error);
          }
        }, 100); // Verificar a cada 100ms
      }
    } catch (error) {
      console.error('Error starting scanner:', error);
      setErrorMessage(`Erro ao acessar a câmera: ${error}`);
      setScanning(false);
    }
  };

  // Parar o scanner
  const stopScanner = () => {
    setScanning(false);
    
    if (scanInterval.current !== null) {
      clearInterval(scanInterval.current);
      scanInterval.current = null;
    }

    // Parar a stream de vídeo
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Limpar o resultado
  const clearResult = () => {
    setResult('');
  };

  return (
    <div className="barcode-scanner-container">
      <h2>Leitor de Códigos de Boletos (Dynamsoft)</h2>
      
      <div className="scanner-container">
        {scanning ? (
          <video 
            ref={videoRef}
            className="video-feed"
            playsInline
          />
        ) : (
          !result && (
            <div className="scanner-placeholder">
              <p>Clique em "Iniciar Scanner" para ler o código de barras</p>
            </div>
          )
        )}
      </div>

      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      {result && (
        <div className="result-container">
          <h3>Código Lido:</h3>
          <p className="barcode-result">{result}</p>
          <div className="result-info">
            <p>Número de dígitos: {result.length}</p>
            <p>Tipo: {result.length === 44 ? 'Código de Boleto Bancário' : 'Código de Barras'}</p>
          </div>
        </div>
      )}

      <div className="button-container">
        {!scanning && !result && (
          <button 
            className="action-button start-button" 
            onClick={startScanner}
            disabled={!readerReady}
          >
            {readerReady ? 'Iniciar Scanner' : 'Carregando...'}
          </button>
        )}
        
        {scanning && (
          <button 
            className="action-button stop-button" 
            onClick={stopScanner}
          >
            Parar Scanner
          </button>
        )}
        
        {result && (
          <>
            <button 
              className="action-button clear-button" 
              onClick={clearResult}
            >
              Limpar Resultado
            </button>
            <button 
              className="action-button scan-again-button" 
              onClick={startScanner}
            >
              Ler Outro Código
            </button>
          </>
        )}
      </div>

      <div className="scanner-status">
        {scanning && <div className="scanning-indicator">Escaneando...</div>}
      </div>
    </div>
  );
};

export default DynamsoftComponent;