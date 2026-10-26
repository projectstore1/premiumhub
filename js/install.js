// PWA Registration and Dual Install Popup Controller

(function () {
  const isAdmin = window.location.pathname.includes('/admin');
  const appName = isAdmin ? 'PHAdmin' : 'Premiumhub';
  const basePath = isAdmin ? '..' : '.';
  const iconSrc = isAdmin ? `${basePath}/assets/icons/phadmin-192.png` : `${basePath}/assets/icons/premiumhub-192.png`;
  const swFile = isAdmin ? `${basePath}/pwa/admin-sw.js` : `${basePath}/pwa/main-sw.js`;
  const swScope = './';
  const storageKey = isAdmin ? 'phadmin_install_dismissed' : 'premiumhub_install_dismissed';

  // 1. Register Service Worker
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swFile, { scope: swScope })
        .then((reg) => {
          console.log(`[PWA] ${appName} service worker registered with scope:`, reg.scope);
        })
        .catch((err) => {
          console.warn(`[PWA] ${appName} service worker registration skipped:`, err);
        });
    });
  }

  // 2. Check if already installed in standalone mode
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    return;
  }

  // 3. Check dismissal cooldown (24 hours)
  const lastDismissed = localStorage.getItem(storageKey);
  const now = Date.now();
  if (lastDismissed && now - parseInt(lastDismissed, 10) < 24 * 60 * 60 * 1000) {
    // Dismissed recently
  }

  let deferredPrompt = null;
  const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    if (!lastDismissed || now - parseInt(lastDismissed, 10) >= 24 * 60 * 60 * 1000) {
      showInstallPopup();
    }
  });

  function showInstallPopup() {
    if (document.getElementById('pwa-install-popup')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-popup';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="pwa-banner-header">
        <div class="pwa-banner-app">
          <img src="${iconSrc}" alt="${appName}" class="pwa-banner-icon">
          <div>
            <div class="pwa-banner-title">Install ${appName}</div>
            <div class="pwa-banner-sub">Add to home screen for faster access & offline support</div>
          </div>
        </div>
        <button class="pwa-banner-close" id="pwa-btn-close" aria-label="Close">&times;</button>
      </div>
      <div class="pwa-banner-actions">
        <button class="pwa-btn-later" id="pwa-btn-later">Maybe Later</button>
        <button class="pwa-btn-install" id="pwa-btn-confirm">Install Now</button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('pwa-btn-close')?.addEventListener('click', () => {
      dismissPrompt();
    });

    document.getElementById('pwa-btn-later')?.addEventListener('click', () => {
      dismissPrompt();
    });

    document.getElementById('pwa-btn-confirm')?.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          console.log(`[PWA] ${appName} installed`);
        }
        deferredPrompt = null;
        dismissPrompt();
      } else if (isIOS) {
        showIOSGuide();
      } else {
        alert(`To install ${appName}, tap the browser menu (⋮) and select "Add to Home Screen" or "Install App".`);
        dismissPrompt();
      }
    });
  }

  function dismissPrompt() {
    const el = document.getElementById('pwa-install-popup');
    if (el) el.remove();
    localStorage.setItem(storageKey, Date.now().toString());
  }

  function showIOSGuide() {
    dismissPrompt();
    const guide = document.createElement('div');
    guide.className = 'ios-guide-modal';
    guide.innerHTML = `
      <div class="ios-guide-box">
        <img src="${iconSrc}" alt="${appName}" class="ios-guide-icon">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:8px;">Install ${appName} on iOS</h3>
        <p style="font-size:0.85rem;color:#77718A;margin-bottom:12px;">Install directly to your iPhone or iPad home screen in 2 quick steps:</p>
        <div class="ios-step">
          <span>1.</span>
          <span>Tap the <strong>Share button</strong> (square with arrow up) at bottom of Safari</span>
        </div>
        <div class="ios-step">
          <span>2.</span>
          <span>Scroll down and select <strong>"Add to Home Screen"</strong></span>
        </div>
        <button id="close-ios-guide" style="margin-top:16px;width:100%;padding:10px;background:#6C3BFF;color:#fff;border-radius:10px;font-weight:600;border:none;cursor:pointer;">Got it</button>
      </div>
    `;
    document.body.appendChild(guide);
    document.getElementById('close-ios-guide')?.addEventListener('click', () => {
      guide.remove();
    });
  }

  window.triggerPWAInstall = function () {
    if (deferredPrompt) {
      deferredPrompt.prompt();
    } else if (isIOS) {
      showIOSGuide();
    } else {
      showInstallPopup();
    }
  };
})();
