import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * ScrollManager: Handles scroll restoration (going back) and scroll-to-top (new navigation).
 */
export const ScrollManager = () => {
  const { pathname, search } = useLocation();
  const navType = useNavigationType();
  const cacheKey = `scroll_pos_${pathname}${search}`;

  useEffect(() => {
    // 1. Restore scroll position if it's a "POP" navigation (Back/Forward buttons)
    if (navType === "POP") {
      const savedPos = sessionStorage.getItem(cacheKey);
      if (savedPos) {
        let attempts = 0;
        const maxAttempts = 10;
        const targetScrollY = parseInt(savedPos, 10);
        
        const tryScroll = () => {
          // Check if the current document height is sufficient for the target scroll
          const currentHeight = document.documentElement.scrollHeight;
          if (currentHeight >= targetScrollY || attempts >= maxAttempts) {
            window.scrollTo({
              top: targetScrollY,
              behavior: "instant"
            });
          } else {
            attempts++;
            setTimeout(tryScroll, 100);
          }
        };
        
        tryScroll();
      }
    } else {
      // 2. Always scroll to top for new navigations (PUSH/REPLACE)
      window.scrollTo(0, 0);
    }
  }, [pathname, search, navType, cacheKey]);

  useEffect(() => {
    // 3. Save scroll position whenever user scrolls
    let timeoutId;
    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // We only save if the navigation type is NOT currently a "POP" restore
        // to avoid saving mid-animation or mid-restore positions
        sessionStorage.setItem(cacheKey, window.scrollY.toString());
      }, 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [cacheKey]);

  return null;
};
