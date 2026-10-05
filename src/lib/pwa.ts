export function installCaptureScript(): string {
  return `(function(){try{
    window.__slInstall=null;
    addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__slInstall=e;dispatchEvent(new Event('sl-install-ready'));});
    addEventListener('appinstalled',function(){window.__slInstall=null;dispatchEvent(new Event('sl-installed'));});
  }catch(e){}})();`;
}
