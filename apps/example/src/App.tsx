import { useState } from "react";
import { BarcodeScanner } from "./components/BarcodeScanner";
import "./App.css";

export function App() {
  let [lastScan, setLastScan] = useState("No result");

  return (
    <>
      <h1>Barcode Scanner</h1>
      <div className="card">
        <BarcodeScanner
          onScan={(text) => {
            setLastScan(text);
          }}
        />
        <p>{lastScan}</p>
      </div>
    </>
  );
}
