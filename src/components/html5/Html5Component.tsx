import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import './Html5Component.scss';

const Html5Component: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const beepSound = useRef<HTMLAudioElement | null>(null);

  // Initialize beep sound
  useEffect(() => {
    beepSound.current = new Audio('/beep.mp3');

    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop();
      }
    };
  }, []);

  // Start scanning
  const startScanner = async () => {
    try {
      setErrorMessage('');
      setScanning(true);

      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText: string) => {
        // Check if it's a boleto code (usually 44-48 digits)
        if (decodedText && decodedText.length >= 44) {
          // Play beep sound
          if (beepSound.current) {
            beepSound.current.play();
          }
          
          setResult(decodedText);
          stopScanner();
        }
      };

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 100 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        (errorMessage: string) => {
          // Erros durante o escaneamento são normais, então apenas logamos
          console.log(errorMessage);
        }
      );
    } catch (err) {
      setScanning(false);
      setErrorMessage(`Erro ao iniciar scanner: ${err}`);
      console.error(err);
    }
  };

  // Stop scanning
  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setScanning(false);
      }).catch((err) => {
        console.error('Error stopping scanner:', err);
      });
    }
  };

  // Clear result
  const clearResult = () => {
    setResult('');
  };

  return (
    <div className="barcode-scanner-container">
      <h2>Leitor de Códigos de Boletos (HTML5-QRCode)</h2>
      
      <div className="scanner-container">
        <div id="qr-reader" style={{ width: '100%', height: '100%' }}></div>
        {!scanning && !result && (
          <div className="scanner-placeholder">
            <p>Clique em "Iniciar Scanner" para ler o código de barras</p>
          </div>
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
          >
            Iniciar Scanner
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

export default Html5Component;