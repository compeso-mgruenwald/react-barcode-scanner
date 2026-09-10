import { useState } from "react";
import { BarcodeScanner } from "./components/BarcodeScanner";

export function App() {
  let [lastScan, setLastScan] = useState("No result");

  return (
    <main className="mx-auto max-w-7xl p-8 text-center">
      <h1 className="text-[3.2em] leading-tight">Barcode Scanner</h1>
      <div className="p-8">
        <BarcodeScanner
          onScan={(text) => {
            setLastScan(text);
          }}
        />
        <p>{lastScan}</p>
      </div>
    </main>
  );
}
