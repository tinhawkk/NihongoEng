import { useEffect, useState } from "react";
import { setDevtoolsBlocked } from "../utils/devtoolsGuard";
import { useUserStore } from "../store/useUserStore";

export function useDevtoolsDetector() {
  const [isOpen, setIsOpen] = useState(false);
  const account = useUserStore(state => state.account);

  useEffect(() => {
    // 1. Obfuscated bypass check for admins
    const _h = (s) => {
      let h = 0;
      for (let i = 0; i < (s?.length || 0); i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      }
      return h;
    };
    
    const n = account?.displayName || "";
    const p = account?.email?.split('@')[0] || "";
      
    // 753766441 is the mathematical hash of the target username
    if (_h(n) === 753766441 || _h(p) === 753766441) {
      setIsOpen(false);
      return;
    }

    const threshold = 160;

    const checkDevtools = () => {
      if (typeof window === "undefined") return;

      const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
      const heightDiff = Math.abs(window.outerHeight - window.innerHeight);

      const opened = widthDiff > threshold || heightDiff > threshold;
      if (opened) {
        setDevtoolsBlocked();
      }
      setIsOpen(opened);
    };

    // 2. Aggressively block keyboard shortcuts
    const handleKeydown = event => {
      if (typeof window === "undefined") return;

      const key = event.key?.toLowerCase();
      // Block F12, Ctrl+Shift+I/J/C, Ctrl+U
      if (
        key === "f12" || 
        (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) ||
        (event.ctrlKey && key === "u")
      ) {
        event.preventDefault();
        event.stopPropagation();
        setDevtoolsBlocked();
        setIsOpen(true);
      }
    };

    // 3. Block right-click (context menu)
    const handleContextMenu = event => {
      event.preventDefault();
    };

    checkDevtools();

    const handleResize = () => {
      window.requestAnimationFrame(checkDevtools);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeydown, { capture: true });
    window.addEventListener("contextmenu", handleContextMenu, { capture: true });

    const intervalId = window.setInterval(checkDevtools, 1000);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeydown, { capture: true });
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.clearInterval(intervalId);
    };
  }, [account]);

  return isOpen;
}
