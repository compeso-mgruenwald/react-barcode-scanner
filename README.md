# React Barcode Scanner [![npm version](https://badge.fury.io/js/@thewirv%2Freact-barcode-scanner.svg)](https://badge.fury.io/js/@thewirv%2Freact-barcode-scanner) [![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT) [![Known Vulnerabilities](https://snyk.io/test/github/compeso-mgruenwald/react-barcode-scanner/badge.svg)](https://snyk.io/test/github/compeso-mgruenwald/react-barcode-scanner)

:rocket: React Barcode Scanner component.

## Table of contents

- [Use Case](#use-case)
- [Compatibility](#compatibility)
- [Installation](#installation)
  - [bun](#bun)
  - [pnpm](#pnpm)
  - [yarn](#yarn)
  - [npm](#npm)
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

## Upgrading to 4.0

4.0 is ESM-only. Use `import { BarcodeScanner } from '@thewirv/react-barcode-scanner'`. `require()` does not work, and the 3.x `development` / `production` export conditions are gone.

`@zxing/browser` is `^0.2.1` (was `^0.1.5`). `@zxing/library` is `^0.23.0` (was `^0.21.3`).

The camera session no longer restarts when parent callback identities change. The stream stops on unmount, `doScan={false}`, and constraint changes compared by value.

Full notes are in [CHANGELOG.md](CHANGELOG.md).

## Example Usage

After reading and performing the previous steps, you should be able to import the library and use it like in this example:

```typescript
import {useState} from 'react';
import {BarcodeScanner} from '@thewirv/react-barcode-scanner';

function Test(props: Props) {
  const [data, setData] = useState('No result');

  return (
    <>
      <BarcodeScanner
        onSuccess={(text) => setData(text)}
        onError={(error) => {
          if (error) {
            console.error(error.message);
          }
        }}
        onLoad={() => console.log('Video feed has loaded!')}
        containerStyle={{width: '100%'}}
      />
      <p>{data}</p>
    </>
  );
}
```

## Component API

The `BarcodeScanner` component has the following props:

| Properties            | Types                                                                                                                                                        | Default Value                                                                                  | Required | Description                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| `doScan`              | `boolean`                                                                                                                                                    | `true`                                                                                         | ☐        | Controls whether the scanner should be scanning or not            |
| `constraints`         | [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints)                                                              | `{ facingMode: 'environment' }`                                                                | ☐        | Specify which camera should be used (if available)                |
| `onSuccess`           | `(text: string) => void`                                                                                                                                     | none                                                                                           | 🗹        | Callback for retrieving the result                                |
| `onError`             | `(e?: Error) => void`                                                                                                                                        | none                                                                                           | 🗹        | Callback for retrieving the error if one occurs                   |
| `onLoad`              | `() => void`                                                                                                                                                 | none                                                                                           | ☐        | Callback for when the camera feed has been loaded                 |
| `Viewfinder`          | `React.ReactElement`                                                                                                                                         | none                                                                                           | ☐        | Viewfinder component to render on top of the `video` element      |
| `containerStyle`      | `React.CSSProperties`                                                                                                                                        | none                                                                                           | ☐        | Style object for the whole component's wrapping `section` element |
| `videoContainerStyle` | `React.CSSProperties`                                                                                                                                        | none                                                                                           | ☐        | Style object for the video's container `div` element              |
| `videoStyle`          | `React.CSSProperties`                                                                                                                                        | none                                                                                           | ☐        | Style object for the `video` element                              |
| `videoProps`          | Either object of type `VideoHTMLAttributes<HTMLVideoElement>` or function that returns such an object and gets passed the default values set by this package | Check `defaultVideoProps` inside `packages/react-barcode-scanner/src/BarcodeScanner/index.tsx` | ☐        | Passed to the underlying `video` element                          |

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

We build this with [bun](https://bun.sh) and [Vite+](https://viteplus.dev). This repo is a bun workspace: the published library lives in `packages/react-barcode-scanner`, and `apps/example` is a Vite+ app for trying the scanner in a browser. The bun version is pinned under `devEngines` in the root `package.json`. Shared fmt and lint settings are in the root `vite.config.ts`.

```bash
bun install
bun run fmt
bun run lint:fix
bun run check
bun run dev
```

`bun run check` runs Vite+ check (fmt + lint + types) over the workspace, packs the library, runs tests, then builds the example. `bun run dev` starts the example app. Use [Conventional Commits](https://www.conventionalcommits.org/). Other scripts are in the root `package.json`.

## License

Distributed under the **MIT license**. See [LICENSE](https://github.com/compeso-mgruenwald/react-barcode-scanner/blob/master/LICENSE) for more information.
