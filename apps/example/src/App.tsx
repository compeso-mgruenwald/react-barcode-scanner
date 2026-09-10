import { useState } from "react";
import { BarcodeScanner } from "./components/BarcodeScanner";

const DEFAULT_LAST_SCAN_MESSAGE = "No result";

export function App() {
  let [lastScan, setLastScan] = useState(DEFAULT_LAST_SCAN_MESSAGE);

  return (
    <main className="flex flex-col items-center text-center">
      <section>
        <h1 className="text-[3.2em] leading-tight">Barcode Scanner</h1>
        <div className="mt-6 px-4">
          <BarcodeScanner
            onScan={(text) => {
              if (text) {
                setLastScan(text);
              } else {
                setLastScan(DEFAULT_LAST_SCAN_MESSAGE);
              }
            }}
          />
          <p
            className={`mt-2 ${lastScan === DEFAULT_LAST_SCAN_MESSAGE ? "font-bold" : "font-normal"}`}
          >
            {lastScan}
          </p>
        </div>
      </section>
    </main>
  );
}
