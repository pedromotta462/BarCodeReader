import React, { useEffect, useRef, useState } from 'react';
import Quagga from 'quagga';
import './QuaggaComponent.scss';

const ZbarComponent: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const beepSound = useRef<HTMLAudioElement | null>(null);
  
  // Configuração do scanner
  const startScanner = () => {
    if (scannerRef.current) {
      setScanning(true);
      setErrorMessage('');
      
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: window.innerWidth,
            height: window.innerHeight / 2,
            facingMode: "environment" // Usar câmera traseira em dispositivos móveis
          },
        },
        decoder: {
          readers: [
            "i2of5_reader", // Leitor padrão para boletos bancários
            "code_128_reader", // Backup para outros formatos
            "ean_reader"
          ],
          debug: {
            drawBoundingBox: true,
            showFrequency: true,
            drawScanline: true,
            showPattern: true
          },
          multiple: false
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        locate: true
      }, (err) => {
        if (err) {
          setErrorMessage(`Erro ao iniciar scanner: ${err}`);
          setScanning(false);
          return;
        }
        
        // Inicia o processo de scanning
        Quagga.start();
      });

      // Manipula os resultados detectados
      Quagga.onDetected((data) => {
        if (data && data.codeResult) {
          const code = data.codeResult.code;
          // Validação básica para códigos de boleto (geralmente 44 dígitos)
          if (code && code.length >= 44) {
            // Reproduz som de confirmação
            if (beepSound.current) {
              beepSound.current.play();
            }
            
            setResult(code);
            stopScanner(); // Para o scanner após uma leitura bem-sucedida
          }
        }
      });
    }
  };

  const stopScanner = () => {
    Quagga.stop();
    setScanning(false);
  };

  const clearResult = () => {
    setResult('');
  };

  // Limpa o scanner quando o componente desmonta
  useEffect(() => {
    return () => {
      if (scanning) {
        Quagga.stop();
      }
    };
  }, [scanning]);

  // Inicializa o som de beep
  useEffect(() => {
    beepSound.current = new Audio('/beep.mp3'); // Certifique-se de ter este arquivo
  }, []);

  return (
    <div className="barcode-scanner-container">
      <h2>Leitor de Código de Barras de Boletos</h2>
      
      <div ref={scannerRef} className="scanner-container">
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
    </div>
  );
};

export default ZbarComponent;