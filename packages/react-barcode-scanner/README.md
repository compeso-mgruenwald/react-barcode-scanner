# React Barcode Scanner [![npm version](https://badge.fury.io/js/@thewirv%2Freact-barcode-scanner.svg)](https://badge.fury.io/js/@thewirv%2Freact-barcode-scanner) [![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT) [![Known Vulnerabilities](https://snyk.io/test/github/compeso-mgruenwald/react-barcode-scanner/badge.svg)](https://snyk.io/test/github/compeso-mgruenwald/react-barcode-scanner)

React component for scanning barcodes from a camera.

## Table of contents

- [Use Case](#use-case)
- [Compatibility](#compatibility)
- [Installation](#installation)
  - [bun](#bun)
  - [pnpm](#pnpm)
  - [yarn](#yarn)
  - [npm](#npm)
- [Upgrading to 5.0](#upgrading-to-50)
- [Upgrading to 4.0](#upgrading-to-40)
- [Example Usage](#example-usage)
- [BarcodeScanner API](#component-api)
- [Browser support](#browser-support)
- [Issues](#issues)
- [Contributing](#contributing)
- [License](#license)

## Use Case

You need a component for scanning QR codes or other barcodes from a web browser based app.

## Compatibility

This component has been tested in the following browsers:

- Chrome Mac OS & Android
- Firefox Mac OS & Android
- Safari Mac OS & iOS

Since this library does internal use of hooks you need `React >= 16.8.0`.

This library utilizes the [ZXing library](https://github.com/zxing-js/browser) and therefore supports all their [supported formats](https://github.com/zxing-js/library#supported-formats) of 1D and 2D barcodes.

## Installation

You can install this library via bun, pnpm, yarn, or npm.

### bun

```bash
bun add @thewirv/react-barcode-scanner
```

### pnpm

```bash
pnpm add @thewirv/react-barcode-scanner
```

### yarn

```bash
yarn add @thewirv/react-barcode-scanner
```

### npm

```bash
npm i --save @thewirv/react-barcode-scanner
```

## Upgrading to 5.0

5.0 defaults the camera to a square preview: `{ facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 }, aspectRatio: { ideal: 1 } }`. Passing `constraints` replaces that whole default.

`Viewfinder` is a component or `null`. A React element no longer works. Omit it for the built-in overlay, or pass `null` to hide it.

Layout is CSS (`dist/style.css`), imported from the package JS. `doScan={false}` or a camera error unmounts the video and shows camera-off. A retry needs `doScan` toggled, different constraint values, or a remount.

Full notes are in [CHANGELOG.md](https://github.com/compeso-mgruenwald/react-barcode-scanner/blob/master/CHANGELOG.md).

<details>
<summary>Upgrading to 4.0</summary>

## Upgrading to 4.0

4.0 is ESM-only. Use `import { BarcodeScanner } from '@thewirv/react-barcode-scanner'`. `require()` does not work, and the 3.x `development` / `production` export conditions are gone.

`@zxing/browser` is `^0.2.1` (was `^0.1.5`). `@zxing/library` is `^0.23.0` (was `^0.21.3`).

The camera session no longer restarts when parent callback identities change. The stream stops on unmount, `doScan={false}`, and constraint changes compared by value.

Full notes are in [CHANGELOG.md](https://github.com/compeso-mgruenwald/react-barcode-scanner/blob/master/CHANGELOG.md).
</details>

## Example Usage

The preview is square and fills the parent width. Layout defaults ship as CSS (`dist/style.css`) in `@layer react-barcode-scanner`, imported from the package JS. Name that layer in your own `@layer` order so later layers override these rules. `doScan={false}` or a camera error swaps in the idle camera view. Until the stream has `HAVE_ENOUGH_DATA`, a dimmed loader sits on the video.

```typescript
import { useState } from "react";
import { BarcodeScanner } from "@thewirv/react-barcode-scanner";

function Test(props: Props) {
  let [data, setData] = useState("No result");

  return (
    <>
      <BarcodeScanner
        onSuccess={(text) => setData(text)}
        onError={(error) => {
          if (error) {
            console.error(error.message);
          }
        }}
        onLoad={() => console.log("Video feed has loaded!")}
        containerStyle={{ width: "100%" }}
      />
      <p>{data}</p>
    </>
  );
}
```

For a fuller host that stops after a hit or error and starts again by taking `doScan` false then true, see [`apps/example`](../../apps/example).

## Component API

The `BarcodeScanner` component has the following props:

Scan runs only while `doScan` and the library gate are both true. A failure withdraws the library gate, unmounts the video, and leaves camera-off up if `doScan` remains `true`. A later attempt needs `doScan` `false` then `true`, constraint values that `deepEqual` treats as different, or a remount. A new `constraints` object with the same values does not retry.

| Properties                   | Types                                                                                                                                                              | Default Value                                                                                             | Required | Description                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `doScan`                     | `boolean`                                                                                                                                                          | `true`                                                                                                    | ☐        | Host half of the scan gate. `false` unmounts `<video>` and shows camera-off. After a failure this can stay `true` while camera-off stays up                   |
| `constraints`                | [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints)                                                                    | `{ facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 }, aspectRatio: { ideal: 1 } }` | ☐        | Camera passed to `getUserMedia`. `ideal` so a camera without a square mode still opens. This prop replaces the whole default                                  |
| `onSuccess`                  | `(text: string) => void`                                                                                                                                           | none                                                                                                      | 🗹        | Callback for retrieving the result                                                                                                                            |
| `onError`                    | `(e?: Error) => void`                                                                                                                                              | none                                                                                                      | 🗹        | Called on failure. Withdraws the library gate, unmounts the video, stops the stream, and shows camera-off                                                     |
| `onLoad`                     | `() => void`                                                                                                                                                       | none                                                                                                      | ☐        | Called when the preview has `HAVE_ENOUGH_DATA`. The loader is then removed                                                                                    |
| `Viewfinder`                 | `React.ComponentType<{ className?: string }> \| null`                                                                                                              | built-in overlay                                                                                          | ☐        | Rendered over the `<video>` after `HAVE_ENOUGH_DATA`. Pass `null` to hide it. The default overlay joins `rbs:viewfinder` with `viewfinderClassName`           |
| `containerStyle`             | `React.CSSProperties`                                                                                                                                              | none                                                                                                      | ☐        | Applied on the `<section>` after the `rbs:container` class. A set `height` drops the ratio. Pass `aspectRatio` to change it. Inline styles override the class |
| `containerClassName`         | `string`                                                                                                                                                           | none                                                                                                      | ☐        | Appended after `rbs:container`. Does not replace the default class                                                                                            |
| `videoContainerStyle`        | `React.CSSProperties`                                                                                                                                              | none                                                                                                      | ☐        | Applied on the video wrapper after the `rbs:video-container` class. Inline styles override the class                                                          |
| `videoContainerClassName`    | `string`                                                                                                                                                           | none                                                                                                      | ☐        | Appended after `rbs:video-container`. Does not replace the default class                                                                                      |
| `videoStyle`                 | `React.CSSProperties`                                                                                                                                              | none                                                                                                      | ☐        | Merged over the `rbs:video` class when `videoProps` is omitted or is a function. An object `videoProps` ignores this. Inline styles override the class        |
| `videoClassName`             | `string`                                                                                                                                                           | none                                                                                                      | ☐        | Appended after `rbs:video` before `videoProps` runs. An object `videoProps` replaces `className`                                                              |
| `cameraLoadingClassName`     | `string`                                                                                                                                                           | none                                                                                                      | ☐        | Appended after `rbs:camera-loading`. Does not replace the default class                                                                                       |
| `cameraLoadingIconClassName` | `string`                                                                                                                                                           | none                                                                                                      | ☐        | Appended after `rbs:camera-loading-icon`. Does not replace the default class                                                                                  |
| `cameraOffClassName`         | `string`                                                                                                                                                           | none                                                                                                      | ☐        | Appended after `rbs:camera-off`. Does not replace the default class                                                                                           |
| `cameraOffIconClassName`     | `string`                                                                                                                                                           | none                                                                                                      | ☐        | Appended after `rbs:camera-off-icon`. Does not replace the default class                                                                                      |
| `viewfinderClassName`        | `string`                                                                                                                                                           | none                                                                                                      | ☐        | Passed to `Viewfinder` as `className`. The default overlay appends it after `rbs:viewfinder`                                                                  |
| `videoProps`                 | Either object of type `React.VideoHTMLAttributes<HTMLVideoElement>` or function that returns such an object and gets passed the default values set by this package | Check `defaultVideoProps` inside `src/index.tsx`                                                          | ☐        | Object replaces default video attributes, including style and `className`. Loaded-data handling stays with the library so the loader can clear                |

## Maintainers (latest to earliest)

- Currently maintained by [@compeso-mgruenwald](https://github.com/compeso-mgruenwald).
- Improved by [@TheWirv](https://github.com/TheWirv).
- Created by [@JodusNodus](https://github.com/JodusNodus).
- Revived thanks to [@JonatanSalas](https://github.com/JonatanSalas) and his company [@BlackBoxVision](https://github.com/BlackBoxVision).

## Browser Support

If you need to support older browsers, checkout [this guide](https://github.com/zxing-js/library#browser-support) in how to make it compatible with legacy ones

## Issues

Please, open an [issue](https://github.com/compeso-mgruenwald/react-barcode-scanner/issues) following one of the issues templates. We will do our best to fix them.

## Contributing

We build this with [pnpm](https://pnpm.io) 12 and [Vite+](https://viteplus.dev). The published library is in `packages/react-barcode-scanner`. `apps/example` is a Vite+ app for trying the scanner in a browser. Install pnpm yourself (`pnpm self-update` or the standalone installer). Shared fmt and lint settings are in the root `vite.config.ts`.

```bash
pnpm install
pnpm fmt
pnpm lint:fix
pnpm check
pnpm dev
```

`pnpm check` runs Vite+ check (fmt + lint + types) over the workspace, packs the library, runs tests, then builds the example. `pnpm dev` starts the example app. Use [Conventional Commits](https://www.conventionalcommits.org/). Other scripts are in the root `package.json`.

## License

Distributed under the **MIT license**. See [LICENSE](https://github.com/compeso-mgruenwald/react-barcode-scanner/blob/master/LICENSE) for more information.
