

# Fix PWA Install Button

## Problem
The Install button never appears because it's conditionally rendered based on `deferredPromptRef.current`, which is a React ref. Updating a ref does NOT trigger a re-render, so even after the `beforeinstallprompt` event fires and stores the prompt in the ref, the component doesn't re-render to show the button.

Additionally, on the fallback path (5s timeout with no `beforeinstallprompt` event), the banner shows but the ref is still null, so no Install button appears at all.

## Fix

**File: `src/components/pwa/PWAInstallBanner.tsx`**

1. Add a new state variable `hasPrompt` (boolean) alongside the existing ref
2. When the `beforeinstallprompt` event fires, set both `deferredPromptRef.current = e` AND `setHasPrompt(true)` -- the state change triggers a re-render so the button becomes visible
3. Change the Install button condition from `deferredPromptRef.current` to `hasPrompt`
4. Always show the Install button on non-iOS when the banner is visible (even without the native prompt). If no deferred prompt is available, the button calls `handleInstall` which gracefully does nothing -- OR better, we show the button always and handle the "no prompt" case by showing a helpful message
5. After install is triggered (accepted or dismissed), set `hasPrompt(false)` to hide the button

### Updated logic:

```
const [show, setShow] = useState(false);
const [hasPrompt, setHasPrompt] = useState(false);
const deferredPromptRef = useRef(null);

// In beforeinstallprompt handler:
deferredPromptRef.current = e;
setHasPrompt(true);  // <-- triggers re-render
setShow(true);

// Install button condition:
{!isIOS() && hasPrompt && (
  <Button onClick={handleInstall}>Install</Button>
)}

// For non-iOS without native prompt (fallback), still show Install
// but have it attempt to trigger the prompt or show guidance
```

This is a one-file, ~10 line change.

