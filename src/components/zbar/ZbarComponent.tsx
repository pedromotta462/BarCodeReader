import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import './ZbarComponent.scss';

// Importa a biblioteca Zbar.wasm
const zbarWasm = import('zbar.wasm');

const ZbarComponent: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [result, setResult] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [zbarInstance, setZbarInstance] = useState<any>(null);
  const animationRef = useRef<number>();
  const beepSound = useRef<HTMLAudioElement | null>(null);

  // Inicializar a biblioteca Zbar
  useEffect(() => {
    const initZbar = async () => {
      try {
        const zbar = await zbarWasm;
        setZbarInstance(zbar);
      } catch (error) {
        console.error('Failed to initialize Zbar.wasm:', error);
        setErrorMessage('Falha ao inicializar o leitor de código de barras');
      }
    };

    initZbar();

    // Inicializa o som de beep
    beepSound.current = new Audio('/beep.mp3');

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Função para capturar o frame da webcam e processar com Zbar
  const captureFrame = useCallback(() => {
    if (scanning && webcamRef.current && zbarInstance) {
      const imageSrc = webcamRef.current.getScreenshot();
      
      if (imageSrc) {
        // Criar uma imagem para processar com o Zbar
        const img = new Image();
        img.src = imageSrc;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);
            
            // Obter os dados da imagem
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            try {
              // Processar a imagem com Zbar.wasm
              const codes = zbarInstance.scanImage(imageData);
              
              // Verificar se algum código foi detectado
              if (codes && codes.length > 0) {
                // Filtramos para códigos que possam ser de boletos
                const boletoCode = codes.find((code: any) => 
                  code.data && code.data.length >= 44
                );
                
                if (boletoCode) {
                  // Reproduz som de confirmação
                  if (beepSound.current) {
                    beepSound.current.play();
                  }
                  
                  setResult(boletoCode.data);
                  stopScanner();
                  return;
                }
              }
            } catch (error) {
              console.error('Error scanning image:', error);
            }
          }
          
          // Continuar a captura se não encontrou código válido
          animationRef.current = requestAnimationFrame(captureFrame);
        };
      } else {
        animationRef.current = requestAnimationFrame(captureFrame);
      }
    }
  }, [scanning, zbarInstance]);

  // Iniciar o scanner
  const startScanner = () => {
    setScanning(true);
    setErrorMessage('');
    animationRef.current = requestAnimationFrame(captureFrame);
  };

  // Parar o scanner
  const stopScanner = () => {
    setScanning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Limpar o resultado
  const clearResult = () => {
    setResult('');
  };

  // Efeito para gerenciar o processo de scanning
  useEffect(() => {
    if (scanning) {
      animationRef.current = requestAnimationFrame(captureFrame);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [scanning, captureFrame]);

  return (
    <div className="barcode-scanner-container">
      <h2>Leitor de Códigos de Boletos (Zbar.wasm)</h2>
      
      <div className="scanner-container">
        {scanning ? (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }}
            className="webcam"
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
            disabled={!zbarInstance}
          >
            {zbarInstance ? 'Iniciar Scanner' : 'Carregando...'}
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

export default ZbarComponent;