import { useEffect, useState } from "react";
import { setDevtoolsBlocked } from "../utils/devtoolsGuard";

// Simple, best-effort DevTools detector.
// Lưu ý: không thể chặn DevTools 100%, chỉ hạn chế các trường hợp phổ biến.

export function useDevtoolsDetector() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const threshold = 160; // px chênh lệch khi DevTools docked

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

    const handleKeydown = event => {
      if (typeof window === "undefined") return;

      const key = event.key?.toLowerCase();

      // Một số phím tắt phổ biến mở DevTools
      if (key === "f12" || (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key))) {
        setDevtoolsBlocked();
        setIsOpen(true);
      }
    };

    // Kiểm tra ngay khi load (bao gồm TH1: DevTools đã mở sẵn trước khi vào trang)
    checkDevtools();

    const handleResize = () => {
      // debounce nhẹ để bớt nháy
      window.requestAnimationFrame(checkDevtools);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeydown);

    // Một số trình duyệt mở DevTools mà không resize -> kiểm tra định kỳ nhẹ
    const intervalId = window.setInterval(checkDevtools, 1000);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeydown);
      window.clearInterval(intervalId);
    };
  }, []);

  return isOpen;
}
