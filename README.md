# React Barcode Scanner [![npm version](https://badge.fury.io/js/@thewirv%2Freact-barcode-scanner.svg)](https://badge.fury.io/js/@thewirv%2Freact-barcode-scanner) [![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT) [![Known Vulnerabilities](https://snyk.io/test/github/compeso-mgruenwald/react-barcode-scanner/badge.svg)](https://snyk.io/test/github/compeso-mgruenwald/react-barcode-scanner)

React component for scanning barcodes from a camera.

## Compatibility

Works in modern browsers.

Needs React 16.8+.

Uses the [ZXing library](https://github.com/zxing-js/browser) and the same [1D and 2D formats](https://github.com/zxing-js/library#supported-formats). Older browsers need [ZXing's compatibility notes](https://github.com/zxing-js/library#browser-support).

File bugs at [GitHub Issues](https://github.com/compeso-mgruenwald/react-barcode-scanner/issues).

## Installation

```bash
bun add @thewirv/react-barcode-scanner
pnpm add @thewirv/react-barcode-scanner
yarn add @thewirv/react-barcode-scanner
npm i @thewirv/react-barcode-scanner
```

`react-icons` 4.9 or later is a peer. Install it if the app does not already have it.

## Example usage

The preview is square and fills the parent width. The package JS imports `dist/style.css`. Those rules live in `@layer react-barcode-scanner`.

`doScan={false}` or a camera error swaps the video for the idle camera view. Until the stream has `HAVE_ENOUGH_DATA`, a loader covers the video.

```tsx
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
      />
      <p>{data}</p>
    </>
  );
}
```

See [`apps/example`](apps/example) for a more complete integration than this snippet.

## Theming

Set `--rbs-*` on any ancestor, or on `.rbs:container` through `containerClassName`.

Name `react-barcode-scanner` in your `@layer` list so later layers override the shipped rules. See [disabling Preflight](https://tailwindcss.com/docs/preflight#disabling-preflight) if using Tailwind CSS.

`--rbs-aspect-ratio` changes the layout box only. Default camera `constraints` stay square. `object-fit: cover` then crops a non-square frame. Set `--rbs-video-object-fit` if you want the whole frame.

Setting `height` on the container drops the ratio, because width is already filled. A user-facing camera also gets `rbs:video-mirrored` (`scale: -1 1`).

```css
:root {
  --rbs-viewfinder-stroke: lime;
  --rbs-camera-off-border-color: #4f46e5;
}
```

| Custom property                   | Default                         | Applied on                      |
| --------------------------------- | ------------------------------- | ------------------------------- |
| `--rbs-aspect-ratio`              | `1`                             | `.rbs:container`                |
| `--rbs-width`                     | `100%`                          | `.rbs:container`                |
| `--rbs-border-radius`             | `0`                             | `.rbs:container`                |
| `--rbs-video-object-fit`          | `cover`                         | `.rbs:video`                    |
| `--rbs-viewfinder-stroke`         | `rgba(255, 0, 0, 0.5)`          | `.rbs:viewfinder`               |
| `--rbs-viewfinder-stroke-width`   | `3`                             | `.rbs:viewfinder`               |
| `--rbs-viewfinder-overlay`        | `rgba(0, 0, 0, 0.3)`            | `.rbs:viewfinder-mask`          |
| `--rbs-camera-loading-background` | `rgba(0, 0, 0, 0.45)`           | `.rbs:camera-loading`           |
| `--rbs-camera-loading-icon-color` | `#fff`                          | `.rbs:camera-loading-icon`      |
| `--rbs-camera-loading-icon-size`  | `72px`                          | `.rbs:camera-loading-icon`      |
| `--rbs-camera-off-border-width`   | `8px`                           | `.rbs:camera-off`               |
| `--rbs-camera-off-border-color`   | `#eee`                          | `.rbs:camera-off`               |
| `--rbs-camera-off-border-radius`  | `var(--rbs-border-radius, 5px)` | `.rbs:camera-off`               |
| `--rbs-camera-off-icon-size`      | `65%`                           | `.rbs:camera-off-icon`          |
| `--rbs-camera-off-icon-opacity`   | `0.2`                           | `.rbs:camera-off-icon`          |
| `--rbs-camera-off-icon-color`     | `currentColor`                  | `.rbs:camera-off-icon`          |
| `--rbs-flashlight-icon`           | `#000`                          | `.rbs:flashlight-toggle-button` |
| `--rbs-flashlight-background`     | `#fff`                          | `.rbs:flashlight-toggle-button` |

Off, `--rbs-flashlight-icon` colors the icon and `--rbs-flashlight-background` colors the button. On, those two swap, and the button gets a box-shadow in the background color.

## Component API

Scanning runs while `doScan` is true and no error has fired. After an error, set `doScan` false then true, pass constraint values that differ, or remount. A new `constraints` object with the same values does not retry.

| Prop                           | Type                                                                                            | Default                                                                                                   | Description                                                                                                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `doScan`                       | `boolean`                                                                                       | `true`                                                                                                    | `false` unmounts `<video>` and shows camera-off                                                                                                                                                                    |
| `constraints`                  | [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) | `{ facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 }, aspectRatio: { ideal: 1 } }` | Passed to `getUserMedia`. `ideal` so a camera without a square mode still opens. This prop replaces the whole default                                                                                              |
| `onSuccess`                    | `(text: string) => void`                                                                        |                                                                                                           | **Required.** Called with the decoded text                                                                                                                                                                         |
| `onError`                      | `(e?: Error) => void`                                                                           |                                                                                                           | **Required.** Unmounts the video, stops the stream, and shows camera-off                                                                                                                                           |
| `onLoad`                       | `() => void`                                                                                    |                                                                                                           | Called when the preview has `HAVE_ENOUGH_DATA`. The loader is then removed                                                                                                                                         |
| `Viewfinder`                   | `React.ComponentType<{ className?: string; withCrosshairs: boolean }> \| null`                  | built-in overlay                                                                                          | Rendered over the video after `HAVE_ENOUGH_DATA`. Pass `null` to hide it. The default overlay joins `rbs:viewfinder` with `viewfinderClassName` and draws crosshairs unless `viewfinderCrosshairsDisabled` is true |
| `containerClassName`           | `string`                                                                                        |                                                                                                           | Appended after `rbs:container`                                                                                                                                                                                     |
| `videoContainerClassName`      | `string`                                                                                        |                                                                                                           | Appended after `rbs:video-container`                                                                                                                                                                               |
| `videoClassName`               | `string`                                                                                        |                                                                                                           | Appended after `rbs:video`                                                                                                                                                                                         |
| `cameraLoadingClassName`       | `string`                                                                                        |                                                                                                           | Appended after `rbs:camera-loading`                                                                                                                                                                                |
| `cameraLoadingIconClassName`   | `string`                                                                                        |                                                                                                           | Appended after `rbs:camera-loading-icon`                                                                                                                                                                           |
| `cameraOffClassName`           | `string`                                                                                        |                                                                                                           | Appended after `rbs:camera-off`                                                                                                                                                                                    |
| `cameraOffIconClassName`       | `string`                                                                                        |                                                                                                           | Appended after `rbs:camera-off-icon`                                                                                                                                                                               |
| `viewfinderClassName`          | `string`                                                                                        |                                                                                                           | Passed to `Viewfinder` as `className`. The default overlay appends it after `rbs:viewfinder`                                                                                                                       |
| `viewfinderCrosshairsDisabled` | `boolean`                                                                                       |                                                                                                           | Passed to `Viewfinder` as `withCrosshairs={!viewfinderCrosshairsDisabled}`. The default overlay draws center crosshairs. `true` hides them. A custom component may use `withCrosshairs` or ignore it               |
| `videoProps`                   | `VideoHTMLAttributes<HTMLVideoElement>` or a function that receives those defaults              | `{ playsInline: true, muted: true, disablePictureInPicture: true }`                                       | An object replaces the default video attributes. A function can extend them. Loaded-data handling stays with the library so the loader can clear                                                                   |
| `flashlight`                   | `boolean \| FlashlightOptions`                                                                  |                                                                                                           | Omit or `false`: no control. `true`: default button. An object sets class name, ARIA labels, and `onError`. Does not turn the lamp on. The button shows only when the track reports torch support                  |

`FlashlightOptions` fields are `className`, `turnOnLabel` (default "Turn flashlight on"), `turnOffLabel` (default "Turn flashlight off"), and `onError`. Off uses `turnOnLabel`. On uses `turnOffLabel`. The button also sets `aria-pressed`.

`FlashlightOptions.onError` receives a `FlashlightError` when the track has no usable torch, and when both `applyConstraints` shapes fail on a click or on a re-apply to a new stream. Import the codes from the package.

A click tries `{ advanced: [{ torch }] }` then `{ torch }`. The last on-toggle is kept across streams and re-applied to the next camera. The lamp turns off on stop, unmount, a constraint change, a decode error, and when `flashlight` is removed.

| Code                        | Meaning                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NO_TRACK`                  | No video track was available when the library asked the camera about torch                                                                        |
| `NO_GET_CAPABILITIES`       | The track has no `getCapabilities` method, so torch cannot be queried                                                                             |
| `TORCH_MISSING`             | `getCapabilities()` returned no torch field                                                                                                       |
| `TORCH_FALSE`               | `getCapabilities()` reported torch as false. This camera cannot turn a lamp on                                                                    |
| `TORCH_SEQUENCE_INCOMPLETE` | `getCapabilities()` reported a torch list that is not both true and false                                                                         |
| `CONSTRAINT_APPLY_FAILED`   | Both `applyConstraints` shapes failed on a click or on a re-apply to a new stream. The library tried `{ advanced: [{ torch }] }` then `{ torch }` |

## Migration

### Upgrade to 7.0

7.0 draws center crosshairs on the built-in viewfinder. Pass `viewfinderCrosshairsDisabled` to hide them. The cutout is 15% inset so the corner marks sit on the edge. A custom `Viewfinder` receives `withCrosshairs`.

`react-icons` 4.9 or later is required.

`flashlight` is opt-in. The button appears only when the camera reports torch support.

Full notes are in the [7.0.0 changelog](CHANGELOG.md#700---2026-09-12).

<details>
<summary>Upgrade to 6.0</summary>

### Upgrade to 6.0

6.0 drops `containerStyle`, `videoContainerStyle`, and `videoStyle`. Use `*ClassName` and `--rbs-*`.

Layout CSS is `@layer react-barcode-scanner`. `rbs:video` and `videoClassName` stay on the element even when `videoProps` is an object. `videoProps.className` is ignored.

A user-facing camera gets `rbs:video-mirrored` instead of an inline transform.

Full notes are in the [6.0.0 changelog](CHANGELOG.md#600---2026-09-10).
</details>

<details>
<summary>Upgrade to 5.0</summary>

### Upgrade to 5.0

5.0 defaults the camera to a square preview: `{ facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 }, aspectRatio: { ideal: 1 } }`. Passing `constraints` replaces that whole default.

`Viewfinder` is a component or `null`. A React element no longer works. Omit it for the built-in overlay, or pass `null` to hide it.

Layout is CSS (`dist/style.css`), imported from the package JS. `doScan={false}` or a camera error unmounts the video and shows camera-off. A retry needs `doScan` toggled, different constraint values, or a remount.

Full notes are in the [5.0.0 changelog](CHANGELOG.md#500---2026-09-09).
</details>

<details>
<summary>Upgrade to 4.0</summary>

### Upgrade to 4.0

4.0 is ESM-only. Use `import { BarcodeScanner } from '@thewirv/react-barcode-scanner'`. `require()` does not work, and the 3.x `development` / `production` export conditions are gone.

`@zxing/browser` is `^0.2.1` (was `^0.1.5`). `@zxing/library` is `^0.23.0` (was `^0.21.3`).

The camera session no longer restarts when parent callback identities change. The stream stops on unmount, `doScan={false}`, and constraint changes compared by value.

Full notes are in the [4.0.0 changelog](CHANGELOG.md#400---2026-09-08).
</details>

## Contributing

We build this with [pnpm](https://pnpm.io) 12 and [Vite+](https://viteplus.dev). The published library is in `packages/react-barcode-scanner`. `apps/example` is a Vite+ app for trying the scanner in a browser. Install pnpm yourself. `pnpm self-update` or the standalone installer both work. Shared fmt and lint settings are in the root `vite.config.ts`.

```bash
pnpm install
pnpm fmt
pnpm lint:fix
pnpm check
pnpm dev
```

`pnpm check` runs Vite+ check (fmt + lint + types) over the workspace, packs the library, runs tests, then builds the example. `pnpm dev` starts the example app. Use [Conventional Commits](https://www.conventionalcommits.org/). Other scripts are in the root `package.json`.

## Maintainers

- [@compeso-mgruenwald](https://github.com/compeso-mgruenwald) maintains it now.
- [@TheWirv](https://github.com/TheWirv) improved it.
- [@JodusNodus](https://github.com/JodusNodus) created it.
- [@JonatanSalas](https://github.com/JonatanSalas) and [@BlackBoxVision](https://github.com/BlackBoxVision) revived it.

## License

Distributed under the MIT license. See [LICENSE](LICENSE).
