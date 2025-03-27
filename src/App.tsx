import "./App.css";
import { useState, type ReactNode } from "react"
import { Camera } from "lucide-react"
import QuaggaComponent from "./components/quagga/QuaggaComponent";
import ZbarComponent from "./components/zbar/ZbarComponent";
import ZXingComponent from "./components/zxing/ZxingComponent";
import Html5Component from "./components/html5/Html5Component";
import DynamsoftComponent from "./components/dynamsoft/DynamsoftComponent";

interface BarcodeLibrary {
  id: string
  name: string
  component: ReactNode
  scannedData: string | null
}

function App() {
  const [scannedDataZxing, setScannedDataZxing] = useState<string | null>(null)
  const [scannedDataQuagga, setScannedDataQuagga] = useState<string | null>(null)
  const [scannedDataZbar, setScannedDataZbar] = useState<string | null>(null)
  const [scannedDataHtml5, setScannedDataHtml5] = useState<string | null>(null)
  const [scannedDataDynamsoft, setScannedDataDynamsoft] = useState<string | null>(null)

  const ScannedData = (data: string) => {
    console.log(data)
    switch(selectedLib) {
      case "zxing":
        setScannedDataZxing(data)
        break
      case "quagga":
        setScannedDataQuagga(data)
        break
      case "zbar.wasm":
        setScannedDataZbar(data)
        break
      case "html5-qrcode":
        setScannedDataHtml5(data)
        break
      case "dynamsoft":
        setScannedDataDynamsoft(data)
        break
      default:
        setScannedDataZxing(data)
        break
    }
  }

  const barcodeLibraries: BarcodeLibrary[] = [
    {
      id: "zxing",
      name: "ZXing",
      component: <ZXingComponent setScannedData={ScannedData} />,
      scannedData: scannedDataZxing,
    },
    {
      id: "quagga",
      name: "QuaggaJS",
      component: <QuaggaComponent />,
      scannedData: scannedDataQuagga,
    },
    {
      id: "zbar.wasm",
      name: "Zbar.wasm",
      component: <ZbarComponent />,
      scannedData: scannedDataZbar,
    },
    {
      id: "html5-qrcode",
      name: "html5-qrcode",
      component: <Html5Component />,
      scannedData: scannedDataHtml5,
    },
    {/*
      id: "dynamsoft",
      name: "Dynamsoft",
      component: <DynamsoftComponent />,
      scannedData: scannedDataDynamsoft,
      */
    },
    // Para adicionar uma nova biblioteca, basta adicionar um novo objeto aqui:
    // {
    //   id: "nova-lib",
    //   name: "Nova Biblioteca",
    //   component: <NovaLibComponent />
    // },
  ]

  const [selectedLib, setSelectedLib] = useState<string | null>(null)

  const selectedLibrary = barcodeLibraries.find((lib) => lib.id === selectedLib)

  return (
    <div className="container">
      <h1 className="title">Selecione uma biblioteca de leitura de código de barras</h1>

      <div className="library-buttons">
        {barcodeLibraries.map((lib) => (
          <button
            key={lib.id}
            className={`library-button ${selectedLib === lib.id ? "selected" : ""}`}
            onClick={() => {
              setSelectedLib(lib.id);
            }}
          >
            <Camera size={24} />
            <span className="library-name">{lib.name}</span>
          </button>
        ))}
      </div>

      {selectedLibrary && (
        <div className="component-container">
          <h2 className="component-title">Componente de {selectedLibrary.name}</h2>

          {selectedLibrary.component}
          <p>{selectedLibrary.scannedData}</p>
        </div>
      )}
    </div>
  );
}

export default App;
