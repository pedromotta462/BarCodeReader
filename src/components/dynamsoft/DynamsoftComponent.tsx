import React from "react";
import { BarcodeReader } from 'dynamsoft-javascript-barcode';
import "./DynamsoftComponent.scss";

// Configuração Dynamsoft
BarcodeReader.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzODQ0MzgxLVRYbFhaV0pRY205cSIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21kbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsIm9yZ2FuaXphdGlvbklEIjoiMTAzODQ0MzgxIiwic3RhbmRieVNlcnZlclVSTCI6Imh0dHBzOi8vc2Rscy5keW5hbXNvZnRvbmxpbmUuY29tIiwiY2hlY2tDb2RlIjoxNTgzNzM1OTQ4fQ==";
BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.30/dist/";

class DynamsoftComponent extends React.Component {
  state = {
    reader: null,
    isScanning: false,
    result: "",
    errorMessage: "",
    readerReady: false
  };

  videoRef = React.createRef();
  scanTimer = null;
  containerRef = React.createRef();
  beepSound = null;

  async componentDidMount() {
    this.beepSound = new Audio('/beep.mp3');
    
    try {
      // Inicializa a biblioteca
      await BarcodeReader.loadWasm();
      
      // Cria leitor
      const reader = await BarcodeReader.createInstance();
      
      // Configurações para boletos
      await reader.updateRuntimeSettings("speed");
      const settings = await reader.getRuntimeSettings();
      
      settings.expectedBarcodesCount = 1;
      settings.minResultConfidence = 50;
      await reader.updateRuntimeSettings(settings);
      
      this.setState({ 
        reader,
        readerReady: true 
      });
    } catch (error) {
      console.error("Error initializing barcode reader:", error);
      this.setState({ 
        errorMessage: `Falha ao inicializar o leitor: ${error}`,
        readerReady: false 
      });
    }
  }

  componentWillUnmount() {
    this.stopScanning();
    
    if (this.state.reader) {
      this.state.reader.destroyContext();
    }
  }

  startScanning = async () => {
    const { reader, readerReady } = this.state;
    
    if (!readerReady || !reader) {
      this.setState({ errorMessage: 'O leitor de código de barras não está pronto' });
      return;
    }

    try {
      this.setState({ isScanning: true, errorMessage: "" });

      // Acessar a câmera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (this.videoRef.current) {
        this.videoRef.current.srcObject = stream;
        await this.videoRef.current.play();

        // Escanear frames regularmente
        this.scanTimer = window.setInterval(async () => {
          if (this.videoRef.current && reader) {
            try {
              const results = await reader.decode(this.videoRef.current);
              
              if (results.length > 0) {
                // Filtrar para códigos que parecem ser boletos
                const boletoCode = results.find(result => 
                  result.barcodeText && result.barcodeText.length >= 44
                );
                
                if (boletoCode) {
                  // Reproduz som de confirmação
                  if (this.beepSound) {
                    this.beepSound.play().catch(console.error);
                  }
                  
                  this.setState({ result: boletoCode.barcodeText });
                  this.stopScanning();
                }
              }
            } catch (err) {
              // Erros de decodificação são comuns
            }
          }
        }, 200);
      }
    } catch (error) {
      console.error('Error starting scanner:', error);
      this.setState({ 
        errorMessage: `Erro ao iniciar a câmera: ${error}`,
        isScanning: false 
      });
    }
  };

  stopScanning = () => {
    this.setState({ isScanning: false });
    
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    
    // Parar a stream de vídeo
    if (this.videoRef.current && this.videoRef.current.srcObject) {
      const tracks = this.videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.videoRef.current.srcObject = null;
    }
  };

  clearResult = () => {
    this.setState({ result: "" });
  };

  render() {
    const { isScanning, result, errorMessage, readerReady } = this.state;

    return (
      <div className="barcode-scanner-container">
        <h2>Leitor de Códigos de Boletos (Dynamsoft)</h2>
        
        <div className="scanner-container" ref={this.containerRef}>
          {isScanning ? (
            <video 
              ref={this.videoRef}
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

        {result ? (
          <div className="result-container">
            <h3>Código Lido:</h3>
            <p className="barcode-result">{result}</p>
            <div className="result-info">
              <p>Número de dígitos: {result.length}</p>
              <p>Tipo: {result.length === 44 ? 'Código de Boleto Bancário' : 'Código de Barras'}</p>
            </div>
            <div className="result-actions">
              <button className="action-button clear-button" onClick={this.clearResult}>
                Limpar Resultado
              </button>
              <button className="action-button scan-again-button" onClick={this.startScanning}>
                Ler Outro Código
              </button>
            </div>
          </div>
        ) : (
          <div className="button-container">
            {!isScanning && (
              <button 
                className="action-button start-button" 
                onClick={this.startScanning}
                disabled={!readerReady}
              >
                {readerReady ? 'Iniciar Scanner' : 'Carregando...'}
              </button>
            )}
            
            {isScanning && (
              <button 
                className="action-button stop-button" 
                onClick={this.stopScanning}
              >
                Parar Scanner
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default DynamsoftComponent;