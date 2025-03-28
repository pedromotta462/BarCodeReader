import { scanImageData } from "@undecaf/zbar-wasm"
import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff, Zap, ZapOff, RefreshCw } from "lucide-react"
import "./ZbarComponent.scss"
import beep from "../../../public/sounds/beep.mp3"

interface ICodeBarScanner {
  scannedData?: any
  setScannedData: (data: any) => void
  justIcon?: boolean
}

const CodeBarScanner = ({
  setScannedData,
  justIcon = false,
}: ICodeBarScanner) => {
  const [data, setData] = useState<any>({ typeName: "", scanData: "" })

  const videoRef = useRef<any>(null)
  const canvasRef = useRef<any>(null)
  const audioRef = useRef<any>(null)

  const [showDialog, setShowDialog] = useState<any>(false)
  const handleShowDialog = () => setShowDialog(!showDialog)

  const [isScanning, setIsScanning] = useState<any>(false)
  const isScanningRef = useRef<any>(isScanning)
  const [facingMode, setFacingMode] = useState<any>("environment")
  const [isTorchOn, setIsTorchOn] = useState<any>(false)
  const [supportsTorch, setSupportsTorch] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    isScanningRef.current = isScanning
  }, [isScanning])

  const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  const handleError = (error: any) => {
    console.error("Error:", error)
    setIsScanning(false)
    setData(null)
  }

  const convertToGrayscale = (imageData: any) => {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
      data[i] = avg // Red
      data[i + 1] = avg // Green
      data[i + 2] = avg // Blue
    }
    return imageData
  }

  const getMediaConstraints = async (facingMode: any) => {
    const baseSettings = isPhone()
      ? {
          height: { ideal: 1080 },
          width: { ideal: 1920 },
        }
      : {
          height: { ideal: 720 },
          width: { ideal: 1280 },
        }

    let customConstraints = {
      audio: false,
      video: {
        ...baseSettings,
        aspectRatio: undefined, // Allows video to cover the entire screen
        facingMode: facingMode,
        resizeMode: false,
        focusMode: "continuous",
        focusDistance: 0,
        exposureMode: "continuous",
        zoom: facingMode === "user" ? 1 : 2, // Set zoom based on facingMode
        frameRate: { ideal: 15, max: 30 },
      },
    }

    if (facingMode === "environment" && isPhone()) {
      const cameraId = await getAndSetCameraIdWithFlash()
      if (cameraId) {
        ;(customConstraints.video as MediaTrackConstraints).deviceId = cameraId
      }
    }

    return customConstraints
  }

  // Usually the camera with flash is the main rear camera
  const getCameraIdWithFlash = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices()
    for (const device of devices) {
      const constraints = {
        video: {
          deviceId: device.deviceId,
          facingMode: "environment", // Prefer the rear camera
        },
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        const videoTrack = stream.getVideoTracks()[0]
        const capabilities = videoTrack.getCapabilities()

        // Check if the torch (flash) capability is supported
        if ("torch" in capabilities && capabilities.torch) {
          console.log(`Device ${device.deviceId} supports torch.`)
          stream.getTracks().forEach((track) => track.stop()) // Stop using the camera
          return device.deviceId // Return the ID of the camera that supports flash
        }

        // Stop using the camera
        stream.getTracks().forEach((track) => track.stop())
      } catch (error) {
        console.error(`Error with device ${device.deviceId}:`, error)
      }
    }

    return null // Return null if no camera with flash support is found
  }

  const getAndSetCameraIdWithFlash = async () => {
    let cameraId = localStorage.getItem("cameraIdWithFlash")

    // If no valid cameraId is stored, find one and store it
    if (!cameraId) {
      cameraId = await getCameraIdWithFlash()
      if (cameraId) {
        localStorage.setItem("cameraIdWithFlash", cameraId)
      }
    }

    return cameraId
  }

  const handleScan = async () => {
    setData(null) // Clear previous data
    setIsScanning(true)
    setIsLoading(true)

    try {
      const mediaConstraints = await getMediaConstraints(facingMode)
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
      videoRef.current.srcObject = stream

      // Check if torch is supported
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities()
        setSupportsTorch(!!("torch" in capabilities && capabilities.torch))
      }

      videoRef.current.onplay = async () => {
        setIsLoading(false)
        const canvas = canvasRef.current
        const context = canvas.getContext("2d", { willReadFrequently: true })
        const width = videoRef.current.videoWidth
        const height = videoRef.current.videoHeight
        canvas.width = width
        canvas.height = height

        const tick = async () => {
          // Tick function always refers to current value of isScanning so isScanningRef is used to store the updated value at run time
          if (!isScanningRef.current) {
            // Stop stream and scanning
            console.log("Stopping scan...")
            handleStopScan()
            return
          }

          context.drawImage(videoRef.current, 0, 0, width, height)

          const imageData = context.getImageData(0, 0, width, height) // Get image data
          const grayscaleImageData = convertToGrayscale(imageData)

          const results = await scanImageData(grayscaleImageData)

          if (results && results.length > 0) {
            // Stop scanning and show the result
            setIsScanning(false)
            handleStopScan()

            setData({
              typeName: results[0]?.typeName.replace("ZBAR_", ""),
              scanData: results[0]?.decode(),
            })

            console.log("Scan result:", results[0]?.decode())
            setScannedData(results[0]?.decode())

            window?.navigator?.vibrate?.(300) // Vibrate device on successful scan (works only on Android devices)
            audioRef.current.play() // Play beep sound on successful scan
            setShowDialog(true)
          } else {
            requestAnimationFrame(tick) // Continue scanning
          }
        }

        requestAnimationFrame(tick)
      }
    } catch (error) {
      handleError(error)
      setIsLoading(false)
    }
  }

  const handleStopScan = () => {
    console.log("Stopping scan...")
    setIsScanning(false)
    setIsLoading(false)
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      console.log("Stopping tracks:", tracks)
      tracks.forEach((track: any) => {
        track.stop()
      })
      videoRef.current.srcObject = null
    }
  }

  const handleSwitchCamera = async () => {
    if (!videoRef.current) {
      console.log("Video element not found.")
      return
    }

    // Stop current tracks
    videoRef.current.srcObject
      ?.getTracks()
      .forEach((track: any) => track.stop())

    // Toggle the facing mode
    const newFacingMode = facingMode === "user" ? "environment" : "user"

    try {
      const mediaConstraints = await getMediaConstraints(newFacingMode)
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)

      // Update the video source and facing mode state
      videoRef.current.srcObject = stream
      setFacingMode(newFacingMode) // Update the state to reflect the new facing mode
      console.log(`Switched camera to ${newFacingMode}.`)

      // Check if torch is supported on new camera
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities()
        setSupportsTorch(!!("torch" in capabilities && capabilities.torch))
        if (!("torch" in capabilities && capabilities.torch)) {
          setIsTorchOn(false)
        }
      }
    } catch (error) {
      console.error("Error switching camera:", error)
    }
  }

  const handleToggleTorch = async () => {
    if (!videoRef.current) {
      console.log("Video element not found.")
      return
    }

    const tracks = videoRef.current.srcObject?.getVideoTracks()
    if (tracks && tracks.length > 0) {
      const track = tracks[0]
      const capabilities = track.getCapabilities()

      // Check if flash is supported
      if (!capabilities.torch) {
        console.log("Flash not supported by this device.")
        return
      }

      try {
        // Toggle flash
        await track.applyConstraints({
          advanced: [
            {
              fillLightMode: isTorchOn ? "flash" : "off",
              torch: !isTorchOn,
            },
          ],
        })
        console.log(`Flash ${!isTorchOn ? "enabled" : "disabled"}.`)

        // Update the isTorchOn state
        setIsTorchOn(!isTorchOn)
      } catch (error) {
        console.error("Error toggling flash:", error)
      }
    } else {
      console.log("No video track found.")
    }
  }

  const handleDataCopy = () => {
    const copyText = `${data.scanData}`
    navigator.clipboard.writeText(copyText).then(
      () => {
        // Optionally, show a notification or alert that the text was copied.
        console.log("Copied to clipboard successfully!")
      },
      (err) => {
        console.error("Failed to copy text to clipboard", err)
      },
    )

    setShowDialog(!showDialog)
  }

  useEffect(() => {
    // Cleanup function to release resources
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject
          .getTracks()
          .forEach((track: any) => track.stop())
      }
    }
  }, [])

  return (
    <div className="scanner-container">
      {!isScanning ? (
        <button onClick={handleScan} className="scan-button">
          <Camera color="white" size={justIcon ? 24 : 30} />
          {!justIcon && <span>Escanear código</span>}
        </button>
      ) : (
        <div className="scanner-modal">
          <div className="scanner-content">
            {isPhone() && (
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

            <div className="video-container">
              <video
                ref={videoRef}
                className="scanner-video"
                autoPlay
                muted
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

              {supportsTorch && (
                <button
                  className="torch-button"
                  onClick={handleToggleTorch}
                  aria-label={isTorchOn ? "Desligar flash" : "Ligar flash"}
                >
                  {isTorchOn ? (
                    <ZapOff className="icon" size={24} color="#fff" />
                  ) : (
                    <Zap className="icon" size={24} color="#fff" />
                  )}
                </button>
              )}

              <p className="scan-instruction">
                Posicione o código de barras dentro da área
              </p>
            </div>

            <div className="controls">
              {isPhone() && (
                <button
                  className="control-button switch-camera"
                  onClick={handleSwitchCamera}
                >
                  <RefreshCw size={20} />
                  <span>Trocar câmera</span>
                </button>
              )}
              <button
                className="control-button cancel"
                onClick={handleStopScan}
              >
                <CameraOff size={20} />
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showDialog && data && (
        <div className="modal-overlay" onClick={handleShowDialog}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{data.typeName}</h3>
              <button className="close-button" onClick={handleShowDialog}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>{data.scanData}</p>
            </div>

            <div className="modal-footer">
              <button className="button secondary" onClick={handleDataCopy}>
                COPY
              </button>
              <button className="button primary" onClick={handleShowDialog}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} hidden />
      <audio
        ref={audioRef}
        src={beep}
        preload="auto"
      />
    </div>
  )
}

export default CodeBarScanner
