/**
 * Blocking script injected into <head>, executed before first paint so the
 * correct theme class is present with zero flash. It never touches React —
 * it mutates <html> directly, which is why layout.tsx doesn't also set a
 * theme class via JSX (that would create a hydration mismatch).
 *
 * Resolution order mirrors the required fallback chain exactly:
 *   manual choice (localStorage) > IP region day/night (sd_auto_theme
 *   cookie, set by middleware from Vercel geo headers) > browser timezone
 *   (local clock hour) > OS theme (prefers-color-scheme) > light.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var KEY='sd_theme_mode';
var root=document.documentElement;
var mode=localStorage.getItem(KEY);
if(mode!=='light'&&mode!=='dark'&&mode!=='auto'){mode='auto';}
var resolved=null;
if(mode==='light'||mode==='dark'){
  resolved=mode;
}else{
  var m=document.cookie.match(/(?:^|; )sd_auto_theme=(light|dark)/);
  if(m){resolved=m[1];}
  if(!resolved){
    try{
      var hour=new Date().getHours();
      resolved=(hour>=6&&hour<18)?'light':'dark';
    }catch(e){}
  }
  if(!resolved){
    try{
      resolved=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
    }catch(e){}
  }
  if(!resolved){resolved='light';}
}
root.classList.remove('light','dark');
root.classList.add(resolved);
root.setAttribute('data-theme',resolved);
root.setAttribute('data-theme-mode',mode);
root.style.colorScheme=resolved;
}catch(e){}})();`;
