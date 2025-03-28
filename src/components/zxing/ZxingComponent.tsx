import { useState, useEffect, useRef } from "react"
import { Camera, RefreshCw, RotateCcw } from "lucide-react"
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library"
import "./ZxingComponent.scss"

interface ICodeBarScanner {
  scannedData?: any
  setScannedData: (data: any) => void
  justIcon?: boolean
}

const CodeBarScanner = ({
  scannedData,
  setScannedData,
  justIcon = false,
}: ICodeBarScanner) => {
  const [isScanning, setIsScanning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.CODE_128,
    BarcodeFormat.ITF,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODABAR,
  ])

  const codeReader = useRef(new BrowserMultiFormatReader())
  const [isOpen, setIsOpen] = useState(false)
  const [hasError, setHasError] = useState<string | null>(null)
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    // Check orientation on mount and when orientation changes
    checkOrientation()
    window.addEventListener(`orientationchange`, checkOrientation)
    window.addEventListener(`resize`, checkOrientation)

    return () => {
      cleanupResources()
      window.removeEventListener(`orientationchange`, checkOrientation)
      window.removeEventListener(`resize`, checkOrientation)
    }
  }, [])

  useEffect(() => {
    setHasError(null)
  }, [isLandscape])

  const checkOrientation = () => {
    // Check if device is in landscape mode (width > height)
    const isLandscape = window.innerWidth > window.innerHeight
    setIsLandscape(isLandscape)
  }

  const cleanupResources = () => {
    // Release any orientation lock if we have one (only for mobile)
    if (
      isMobileDevice() &&
      window.screen &&
      window.screen.orientation &&
      window.screen.orientation.unlock
    ) {
      try {
        window.screen.orientation.unlock()
      } catch (e) {
        console.error(`Failed to unlock orientation: `, e)
      }
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    codeReader.current.reset()
    setIsScanning(false)
  }

  const stopScan = () => {
    cleanupResources()
    setIsOpen(false)
  }

  const requestLandscapeMode = () => {
    // Try to request landscape mode if supported by browser
    if (window.screen && window.screen.orientation) {
      try {
        ;(window.screen.orientation as any)
          .lock(`landscape`)
          .then(() => {
            console.log(`Landscape orientation locked`)
            setIsLandscape(true)
          })
          .catch((e) => {
            console.error(`Failed to lock orientation: `, e)
            setHasError(
              `Gire seu dispositivo para o modo paisagem (horizontal) para um melhor escaneamento`,
            )
          })
      } catch (e) {
        console.error(`Screen orientation API not fully supported`)
        setHasError(
          `Gire seu dispositivo para o modo paisagem (horizontal) para um melhor escaneamento`,
        )
      }
    } else {
      setHasError(
        `Gire seu dispositivo para o modo paisagem (horizontal) para um melhor escaneamento`,
      )
    }
  }

  const startScan = async () => {
    setIsOpen(true)
    setHasError(null)
    setIsLoading(true)

    // Only request landscape mode on mobile devices
    if (isMobileDevice() && !isLandscape) {
      requestLandscapeMode()
    }

    try {
      const devices = await codeReader.current.listVideoInputDevices()
      if (devices.length === 0) {
        throw new Error(`Nenhuma câmera encontrada`)
      }

      setCameraDevices(devices)
      // Try to select a back camera first (if available)
      const backCamera = devices.find(
        (device) =>
          device.label.toLowerCase().includes(`back`) ||
          device.label.toLowerCase().includes(`traseira`),
      )

      setSelectedDeviceId(backCamera?.deviceId || devices[0]?.deviceId || null)

      setIsScanning(true)

      const constraints = {
        audio: false,
        video: {
          deviceId: backCamera?.deviceId || devices[0]?.deviceId || undefined,
          facingMode: { ideal: `environment` },
          focusMode: `continuous`,
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      codeReader.current.decodeFromVideoDevice(
        backCamera?.deviceId || devices[0]?.deviceId || null,
        videoRef.current,
        (result, error) => {
          if (result) {
            videoRef.current?.pause()
            setScannedData(result.getText())
            stopScan()
            console.log(`Código escaneado:`, result.getText())
          }
          if (error) {
            console.error(error)
          }
        },
      )
    } catch (error: any) {
      if (error.name === `NotAllowedError`) {
        console.log(`Permissão para acessar a câmera foi negada`)
        setHasError(`Permissão para acessar a câmera foi negada`)
      } else {
        console.error(`Erro ao acessar a câmera:`, error)
        setHasError(`Erro: ${error.message || error}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )
  }

  return (
    <div className={`scanner-container`}>
      {!isScanning ? (
        <button onClick={startScan} className="scan-button">
          <Camera color="white" size={justIcon ? 24 : 30} />
          {!justIcon && <span>Escanear código</span>}
        </button>
      ) : (
        <div className="scanner-modal">
          <>
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
                    <p>
                      Por favor, gire seu dispositivo para o modo horizontal
                    </p>
                  </div>
                )}

                <video
                  ref={videoRef}
                  className="scanner-video"
                  autoPlay
                  playsInline
                ></video>

                {/* Scan area overlay */}
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
          </>
        </div>
      )}
    </div>
  )
}

export default CodeBarScanner
