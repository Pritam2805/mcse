"use client";

import { useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useLiveStocks } from "@/lib/useLiveStocks";

export default function TickerTape() {
  // Pull all 57 live stocks from the API (polled every 15s).
  const { stocks } = useLiveStocks();
  const items = Array.from(stocks.values());
  // Duplicate the list so the CSS scroll animation wraps seamlessly.
  const scrollItems = [...items, ...items];

  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const hasDragged = useRef(false);
  const startX = useRef(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const pauseAnimation = useCallback(() => {
    if (trackRef.current) trackRef.current.style.animationPlayState = "paused";
  }, []);

  const resumeAnimation = useCallback(() => {
    if (trackRef.current) trackRef.current.style.animationPlayState = "running";
  }, []);

  const scheduleResume = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(resumeAnimation, 3000);
  }, [resumeAnimation]);

  const onDown = useCallback((clientX: number) => {
    dragging.current = true;
    hasDragged.current = false;
    startX.current = clientX;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const onMove = useCallback((clientX: number) => {
    if (!dragging.current || !trackRef.current) return;
    const delta = clientX - startX.current;
    if (!hasDragged.current && Math.abs(delta) > 5) {
      hasDragged.current = true;
      pauseAnimation();
    }
    if (!hasDragged.current) return;
    startX.current = clientX;
    const style = getComputedStyle(trackRef.current);
    const matrix = new DOMMatrix(style.transform);
    const currentX = matrix.m41;
    const totalW = trackRef.current.scrollWidth / 2;
    let newX = currentX + delta;
    if (newX > 0) newX -= totalW;
    if (newX < -totalW) newX += totalW;
    trackRef.current.style.transform = `translateX(${newX}px)`;
  }, [pauseAnimation]);

  const onUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (hasDragged.current) scheduleResume();
  }, [scheduleResume]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const handleTouchStart = (e: TouchEvent) => onDown(e.touches[0].clientX);
    const handleTouchMove = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientX); };
    const handleTouchEnd = () => onUp();
    const handleMouseDown = (e: MouseEvent) => onDown(e.clientX);
    const handleMouseMove = (e: MouseEvent) => onMove(e.clientX);
    const handleMouseUp = () => onUp();

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [onDown, onMove, onUp]);

  // Empty state — tape still renders but with no scrolling content
  if (items.length === 0) {
    return <div className="ticker-wrap w-full h-8 bg-bg/95 backdrop-blur-md border-b border-white/8" />;
  }

  return (
    <div className="ticker-wrap w-full h-8 bg-bg/95 backdrop-blur-md border-b border-white/8 overflow-hidden select-none cursor-grab active:cursor-grabbing">
      <div ref={trackRef} className="flex items-center h-full animate-ticker whitespace-nowrap">
        {scrollItems.map((item, i) => (
          <Link
            key={`${item.ticker}-${i}`}
            href={`/stock/${item.ticker}`}
            draggable={false}
            className="flex items-center gap-2 px-3 md:px-6 cursor-pointer hover:bg-white/[0.04] transition-colors h-full"
          >
            <span className="text-[10px] font-[MonumentExtended] tracking-[0.1em] text-white/60">
              {item.ticker}
            </span>
            <span className="text-[10px] text-white/80">
              {"\u20B9"}{item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-[10px] font-medium ${item.changePct >= 0 ? "text-up" : "text-down"}`}>
              {item.changePct >= 0 ? "+" : ""}{item.changePct.toFixed(2)}%
            </span>
            {i < scrollItems.length - 1 && (
              <span className="text-white/15 ml-2">{"\u00B7"}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
