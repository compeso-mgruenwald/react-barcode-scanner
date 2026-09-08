# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.1] - 2026-09-08

### Fixed

- Cleanup now stops the ZXing scan loop. `doScan` off, unmount, and a constraint change used to leave decode running after the camera was gone.
- Each `MultiFormatReader: non-ReaderException` warning goes to the console once per started stream. Repeats wait for the next stream.

## [4.0.0] - 2026-09-08

### Breaking

- The package is ESM-only. Import with `import { BarcodeScanner } from '@thewirv/react-barcode-scanner'`. `require()` no longer works.
- `main`, `module`, and CJS/`require` entry points are gone.
- `development` / `production` export conditions and the minified artifacts they pointed at are gone.

### Changed

- `@zxing/browser` is now `^0.2.1` (was `^0.1.5`). `@zxing/library` is now `^0.23.0` (was `^0.21.3`).
- `engines.node` is gone, as this is not a Node package (`>= 18` in 3.4.0).
- The repo now builds with Vite+ in a bun workspace, and the library has tests.

### Fixed

- The camera session no longer restarts when parent callback identities change.
- The stream now stops when `doScan` is `false`, on unmount, and when constraints change by value with `deepEqual`.
- The README default camera is `{ facingMode: "environment" }`. 3.4.0's README said `user`. That was a docs typo. Runtime default did not change.

## [3.4.0] - 2025-06-17

### Changed

- Updated dependencies.

### Fixed

- Fixed type imports.

## [3.3.5] - 2024-05-31

### Removed

- Removed a few default `video` props.

## [3.3.4] - 2024-05-31

### Added

- Added `videoProps` prop to override/extend the props that are passed to the underlying `video` element.

## [3.3.3] - 2024-05-24

### Added

- Added `default` export to `package.json`.

## [3.3.2] - 2024-05-24

### Fixed

- Fixed module resolution issues.

## [3.3.1] - 2024-05-24

### Changed

- Barcodes are scanned only once now. If you want to scan again, you have to "toggle" the `doScan` prop.

### Fixed

- Fixed functionality.

### Removed

- Removed source maps.

## [3.3.0] - 2024-05-22

### Changed

- Updated dependencies.

## [3.2.3] - 2023-03-02

### Fixed

- Publish package with code actually this time.

## [3.2.2] - 2023-03-02

### Changed

- Renamed `ViewFinder` to `Viewfinder` because viewfinder is not two words.

## [3.2.1] - 2023-02-28

### Fixed

- Fixed "Scanner continues scanning after unmount" bug.

## [3.2.0] - 2023-02-27

### Added

- Supports multiple formats of 1D and 2D barcodes.
- Has automatic "camera not (yet) available" image.
- Added `onLoad` function.
- Added `doScan` prop to control scanning.

### Changed

- Big relaunch with improved features.

Earlier git tags exist (`v2.2.0` through `v1.1.0`, plus `1.2.0`) and have no GitHub Release notes.

[4.0.1]: https://github.com/compeso-mgruenwald/react-barcode-scanner/compare/v4.0.0...v4.0.1
[4.0.0]: https://github.com/compeso-mgruenwald/react-barcode-scanner/compare/v3.4.0...v4.0.0
[3.4.0]: https://github.com/compeso-mgruenwald/react-barcode-scanner/compare/v3.3.5...v3.4.0
[3.3.5]: https://github.com/compeso-mgruenwald/react-barcode-scanner/compare/v3.3.4...v3.3.5
[3.3.4]: https://github.com/compeso-mgruenwald/react-barcode-scanner/compare/v3.3.3...v3.3.4
[3.3.3]: https://github.com/compeso-mgruenwald/react-barcode-scanner/compare/v3.3.2...v3.3.3
[3.3.2]: https://github.com/compeso-mgruenwald/react-barcode-scanner/compare/v3.3.1...v3.3.2
[3.3.1]: https://github.com/compeso-mgruenwald/react-barcode-scanner/compare/v3.3.0...v3.3.1
[3.3.0]: https://github.com/compeso-mgruenwald/react-barcode-scanner/compare/v3.2.3...v3.3.0
[3.2.3]: https://github.com/compeso-mgruenwald/react-barcode-scanner/compare/v3.2.2...v3.2.3
[3.2.2]: https://github.com/compeso-mgruenwald/react-barcode-scanner/compare/v3.2.1...v3.2.2
[3.2.1]: https://github.com/compeso-mgruenwald/react-barcode-scanner/compare/v3.2.0...v3.2.1
[3.2.0]: https://github.com/compeso-mgruenwald/react-barcode-scanner/releases/tag/v3.2.0
