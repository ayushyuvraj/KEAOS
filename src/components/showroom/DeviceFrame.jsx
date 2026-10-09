import React from 'react';

/**
 * Apple-Grade Device Hardware Chassis
 * Renders authentic, interactive MacBook Pro, iPhone 16 Pro, and iPad Pro hardware frames
 * with realistic bezels, Dynamic Island, and glass specular highlights.
 */
export default function DeviceFrame({ 
  device = 'none', // 'none' | 'macbook' | 'iphone' | 'ipad'
  children,
  theme,
  isDarkMode = true,
  scale = 1
}) {
  if (device === 'none') {
    return (
      <div 
        className="w-full transition-transform origin-top flex flex-col items-center"
        style={{ transform: scale !== 1 ? `scale(${scale})` : undefined }}
      >
        {children}
      </div>
    );
  }

  // --- 1. iPhone 16 Pro Chassis ---
  if (device === 'iphone') {
    return (
      <div 
        className="transition-transform origin-top my-4 flex flex-col items-center select-none"
        style={{ transform: scale !== 1 ? `scale(${scale})` : undefined }}
      >
        {/* Outer Titanium Frame */}
        <div 
          className="relative w-[390px] rounded-[52px] p-[10px] shadow-2xl transition-all"
          style={{
            backgroundColor: isDarkMode ? '#1E2129' : '#D1D5DB',
            boxShadow: '0 30px 70px -10px rgba(0, 0, 0, 0.5), inset 0 0 4px rgba(255, 255, 255, 0.2)'
          }}
        >
          {/* Inner Bezel */}
          <div className="relative w-full rounded-[42px] overflow-hidden bg-black flex flex-col">
            {/* Dynamic Island Status Area */}
            <div className="h-10 w-full bg-black relative flex items-center justify-between px-7 shrink-0 z-30">
              {/* Status Time */}
              <span className="text-[11px] font-semibold text-white tracking-tight">9:41</span>

              {/* Dynamic Island Pill */}
              <div className="absolute left-1/2 -translate-x-1/2 top-2 w-24 h-6 bg-black rounded-full flex items-center justify-between px-2.5 border border-white/10 shadow-inner">
                <span className="w-2.5 h-2.5 rounded-full bg-[#111319] border border-white/20" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
              </div>

              {/* Battery & Signal */}
              <div className="flex items-center gap-1.5 text-white">
                <div className="w-3.5 h-2 border border-white rounded-xs relative">
                  <div className="w-2 h-1 bg-white absolute top-0.5 left-0.5" />
                </div>
              </div>
            </div>

            {/* Interactive Screen Scrollport */}
            <div className="w-full max-h-[720px] overflow-y-auto no-scrollbar">
              {children}
            </div>

            {/* Home Bar Indicator */}
            <div className="h-6 w-full bg-transparent flex items-center justify-center shrink-0 z-30">
              <div className="w-32 h-1 bg-white/40 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. iPad Pro Chassis ---
  if (device === 'ipad') {
    return (
      <div 
        className="transition-transform origin-top my-4 flex flex-col items-center select-none"
        style={{ transform: scale !== 1 ? `scale(${scale})` : undefined }}
      >
        <div 
          className="relative w-[780px] rounded-[38px] p-[12px] shadow-2xl transition-all"
          style={{
            backgroundColor: isDarkMode ? '#1A1D24' : '#D1D5DB',
            boxShadow: '0 30px 80px -10px rgba(0, 0, 0, 0.45), inset 0 0 4px rgba(255, 255, 255, 0.2)'
          }}
        >
          {/* Inner Screen */}
          <div className="relative w-full rounded-[26px] overflow-hidden bg-black flex flex-col">
            {/* iPad Top Bezel Dot */}
            <div className="h-5 w-full bg-black flex items-center justify-center shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#20242D] border border-white/15" />
            </div>

            <div className="w-full max-h-[780px] overflow-y-auto no-scrollbar">
              {children}
            </div>

            {/* iPad Bottom Home Bar */}
            <div className="h-5 w-full bg-black flex items-center justify-center shrink-0">
              <div className="w-36 h-1 bg-white/30 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. MacBook Pro Chassis ---
  if (device === 'macbook') {
    return (
      <div 
        className="transition-transform origin-top my-4 flex flex-col items-center select-none"
        style={{ transform: scale !== 1 ? `scale(${scale})` : undefined }}
      >
        {/* Top Display Lid */}
        <div 
          className="relative w-[920px] rounded-t-[20px] p-[10px] pb-0 shadow-2xl transition-all"
          style={{
            backgroundColor: isDarkMode ? '#1E2129' : '#D1D5DB',
            boxShadow: '0 30px 80px -10px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Bezel */}
          <div className="relative w-full rounded-t-[12px] overflow-hidden bg-black flex flex-col">
            {/* Top Menu Bar & Notch */}
            <div className="h-7 w-full bg-[#121318] flex items-center justify-between px-4 shrink-0 border-b border-white/10 z-20">
              {/* Traffic Lights */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
              </div>

              {/* Camera Notch */}
              <div className="w-32 h-4.5 bg-black rounded-b-lg flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-[#1E2028] border border-white/15" />
              </div>

              <div className="text-[10px] font-mono text-slate-400">
                100% Battery
              </div>
            </div>

            {/* Interactive Content Window */}
            <div className="w-full max-h-[720px] overflow-y-auto no-scrollbar">
              {children}
            </div>
          </div>
        </div>

        {/* MacBook Lower Aluminum Chassis & Notch */}
        <div 
          className="relative w-[1020px] h-[14px] rounded-b-[14px] flex items-center justify-center"
          style={{
            backgroundColor: isDarkMode ? '#282C37' : '#9CA3AF',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="w-28 h-1.5 bg-[#171920] rounded-b-md" />
        </div>
      </div>
    );
  }

  return children;
}
