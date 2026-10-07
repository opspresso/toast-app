# Application Icons

Toast extracts macOS application icons for button previews and cloud sharing. The current
Electron 39 builds require macOS 12 or later. See [Electron's platform change](https://www.electronjs.org/blog/electron-38-0#removed-macos-11-support).
Windows and Linux display shared image URLs and built-in icons but do not run this extraction feature.

## Choose or Refresh an Icon

1. Edit a button and select **Application**, then browse to its `.app` bundle. The selected path is
   preserved, including apps under `/System/Applications` or your home directory.
2. With **Exec**, literal commands such as `open -a Mail`, `open -a "Visual Studio Code"`, and
   `open -a zoom.us --args ...` can supply an application name for icon lookup. Shell expressions
   are not evaluated to find an icon.
3. Use the reload button to force a fresh extraction. If conversion fails, the previous cached image
   remains available. Choose an emoji, catalog icon, or HTTPS image URL if extraction is unavailable.

Names are looked up in `/Applications`, `~/Applications`, `/System/Applications`,
`/System/Applications/Utilities`, and `/System/Library/CoreServices`. An explicit path selects that
bundle directly. Open actions can show a website favicon when their icon field is empty.

## Extraction and Cache

`src/main/utils/app-icon-extractor.js` owns extraction:

- `plutil` reads XML or binary `Info.plist` metadata. Declared resources must resolve inside the selected bundle.
- `iconutil` extracts ICNS representations, including Retina variants. ImageIO through `sips` can decode
  ICNS variants that `iconutil` cannot expand.
- Bundles without `CFBundleIconFile` use the OS-associated icon. The API uses the macOS-supported
  `normal` size and the available image scale factors; `large` is unsupported on macOS.
  See [`app.getFileIcon`](https://www.electronjs.org/docs/latest/api/app#appgetfileiconpath-options).
- PNG output is bounded to 512 pixels per dimension and 2,000,000 bytes. Smaller representations are
  kept at their native size.
- Native commands receive argv arrays with no shell interpretation. Filesystem work and conversion
  run asynchronously; each native command has a 15-second limit.
- A temporary directory isolates each conversion. A completed PNG atomically replaces the cache file;
  failures leave the old image intact and temporary files are cleaned up.

The default cache is `app.getPath('userData')/icons`. Its filenames include the application location
hash, so same-named apps in different locations do not overwrite one another. Existing files are
reused until force refresh or newer application metadata requires extraction. Concurrent requests
share the same work, and a forced request is never satisfied by an unchanged cached result.
Legacy cache files remain in place because buttons may still reference them.

## Cloud Sharing

The `extract-app-icon` IPC handler returns a local icon and, when upload succeeds, a `remoteUrl`.
The renderer prefers the remote URL. Authentication changes during extraction/upload discard the
old request's result instead of applying it to a different account.

`src/main/api/icons.js` posts PNG data to `/api/users/icons`. Automatic uploads accept only files
inside the managed extraction cache, including resolved symlink targets. Size and PNG signature
checks run before upload. A bounded URL cache and concurrent-request sharing belong to the current
login session; another account never receives the previous account's cached upload URL.

Toast Web resizes and stores the image in its configured icons bucket. The returned URLs are
public, so this feature is for non-sensitive application icons. Server storage must be configured
for sharing. Endpoint errors stop the current batch but do not suppress later retries after recovery.
The sync manager owns retry timing.

Before uploading settings, `normalizeLocalIcons` replaces local references with uploaded URLs.
It understands legacy `file://~/...` values and encoded absolute file URLs. References absent on the
current device remain unchanged; the original device must publish their image for cross-device use.
Failed uploads remain explicit sync errors and preserve local settings. Re-extract references outside
the managed cache, configure server icon storage, or choose an HTTPS/catalog/emoji icon before retrying.

## Verification

```bash
npm test -- --runInBand
npm run lint
```

Regression coverage includes complete application paths, name lookup, quoted names with trailing
arguments, cache collisions, forced-refresh preservation, concurrent work, bundle/cache symlink
boundaries, account changes, encoded file URLs, and recovery after upload outages. Native checks use
real macOS utilities and Electron IPC; mocked command tests alone do not prove platform API support.
