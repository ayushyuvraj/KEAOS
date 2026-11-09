import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * AgentVisorEyes — Expressive living robot visor for KEAOS autonomous agents.
 * 
 * Provides an organic, pet-like personality:
 * - Natural autonomous blinking (single and double blinks)
 * - Curious side-to-side and pensive upward glances
 * - Interactive mouse-hover eye-contact tracking
 * - Analytical scanning mode during execution/thinking
 * - Celebratory wink upon task completion
 * - Cozy sleeping horizontal slits with breathing pulse when deactivated
 * - Playful interactive wink on click/tap
 * 
 * Uses hardware-accelerated CSS transforms for silky 60 FPS motion with zero frame drops.
 */
export default function AgentVisorEyes({
  size = 'md', // 'sm' (header/drawer compact) or 'md' (canvas node standard)
  isExecuting = false,
  isDeactivated = false,
  hasModel = true,
  status = null, // optional override status ('active', 'idle', 'error')
  showStatusLed = true,
  className = '',
  onClick = null
}) {
  const isSm = size === 'sm';

  // Eye gaze offsets (in pixels)
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isWinking, setIsWinking] = useState(false);
  const [isHappyWink, setIsHappyWink] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // References for scheduling timers and tracking state transitions
  const blinkTimerRef = useRef(null);
  const gazeTimerRef = useRef(null);
  const prevExecutingRef = useRef(isExecuting);
  const visorRef = useRef(null);

  // Maximum eye travel based on visor size
  const maxTravelX = isSm ? 3 : 5.5;
  const maxTravelY = isSm ? 1.5 : 2.5;

  // -------------------------------------------------------------
  // 1. Natural Autonomous Blinking Loop (Single & Double Blinks)
  // -------------------------------------------------------------
  useEffect(() => {
    if (isDeactivated) {
      setIsBlinking(false);
      return;
    }

    let isMounted = true;

    const scheduleNextBlink = () => {
      // Random interval between 2.6s and 5.4s (natural blink rhythm)
      const nextDelay = 2600 + Math.random() * 2800;
      blinkTimerRef.current = setTimeout(() => {
        if (!isMounted || isDeactivated) return;

        // Perform blink
        setIsBlinking(true);

        // Eyes shut for 120ms
        setTimeout(() => {
          if (!isMounted) return;
          setIsBlinking(false);

          // 25% chance of a quick natural double-blink (like a curious creature)
          if (Math.random() < 0.25) {
            setTimeout(() => {
              if (!isMounted || isDeactivated) return;
              setIsBlinking(true);
              setTimeout(() => {
                if (!isMounted) return;
                setIsBlinking(false);
                scheduleNextBlink();
              }, 110);
            }, 120);
          } else {
            scheduleNextBlink();
          }
        }, 120);
      }, nextDelay);
    };

    scheduleNextBlink();

    return () => {
      isMounted = false;
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, [isDeactivated]);

  // -------------------------------------------------------------
  // 2. Autonomous Idle Gaze Shift (Looking Sideways, Pensive, Center)
  // -------------------------------------------------------------
  useEffect(() => {
    if (isDeactivated || isExecuting || isHovered) {
      return;
    }

    let isMounted = true;

    const scheduleNextGaze = () => {
      // Shift gaze every 3.2s to 6.5s
      const delay = 3200 + Math.random() * 3300;
      gazeTimerRef.current = setTimeout(() => {
        if (!isMounted || isDeactivated || isExecuting || isHovered) return;

        const roll = Math.random();
        if (roll < 0.45) {
          // Look straight forward (attentive)
          setGaze({ x: 0, y: 0 });
        } else if (roll < 0.65) {
          // Glance left
          setGaze({ x: -maxTravelX, y: 0 });
        } else if (roll < 0.85) {
          // Glance right
          setGaze({ x: maxTravelX, y: 0 });
        } else if (roll < 0.93) {
          // Thoughtful glance up-right
          setGaze({ x: maxTravelX * 0.7, y: -maxTravelY });
        } else {
          // Thoughtful glance up-left
          setGaze({ x: -maxTravelX * 0.7, y: -maxTravelY });
        }

        scheduleNextGaze();
      }, delay);
    };

    scheduleNextGaze();

    return () => {
      isMounted = false;
      if (gazeTimerRef.current) clearTimeout(gazeTimerRef.current);
    };
  }, [isDeactivated, isExecuting, isHovered, maxTravelX, maxTravelY]);

  // -------------------------------------------------------------
  // 3. Execution State: Analytical Scanning & Completion Wink
  // -------------------------------------------------------------
  useEffect(() => {
    // Check if execution just finished -> show a celebratory happy wink
    if (prevExecutingRef.current && !isExecuting && !isDeactivated) {
      setIsHappyWink(true);
      const timer = setTimeout(() => {
        setIsHappyWink(false);
        setGaze({ x: 0, y: 0 });
      }, 900);
      return () => clearTimeout(timer);
    }
    prevExecutingRef.current = isExecuting;

    if (!isExecuting || isDeactivated) return;

    // During active execution, scan side to side with analytical curiosity
    let step = 0;
    const scanInterval = setInterval(() => {
      step = (step + 1) % 4;
      if (step === 0) setGaze({ x: -maxTravelX, y: 0 });
      else if (step === 1) setGaze({ x: 0, y: 0 });
      else if (step === 2) setGaze({ x: maxTravelX, y: 0 });
      else setGaze({ x: 0, y: 0 });
    }, 450);

    return () => clearInterval(scanInterval);
  }, [isExecuting, isDeactivated, maxTravelX]);

  // -------------------------------------------------------------
  // 4. Mouse Hover Eye-Contact (Gently Glance Toward Cursor)
  // -------------------------------------------------------------
  const handleMouseMove = useCallback((e) => {
    if (isDeactivated || isExecuting || isWinking) return;
    if (!visorRef.current) return;

    const rect = visorRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const relX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
    const relY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));

    setGaze({
      x: relX * maxTravelX,
      y: relY * maxTravelY
    });
  }, [isDeactivated, isExecuting, isWinking, maxTravelX, maxTravelY]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Smoothly settle back forward
    setGaze({ x: 0, y: 0 });
  };

  // -------------------------------------------------------------
  // 5. Interactive Playful Wink on Visor Click / Tap
  // -------------------------------------------------------------
  const handleVisorClick = (e) => {
    if (onClick) onClick(e);
    if (isDeactivated) return;

    setIsWinking(true);
    setTimeout(() => {
      setIsWinking(false);
    }, 480);
  };

  // -------------------------------------------------------------
  // 6. Dimensions & Transform Styling
  // -------------------------------------------------------------
  const visorHeight = isSm ? 'h-[28px]' : 'h-[38px]';
  const eyeWidth = isSm ? 'w-1.5' : 'w-2';
  const eyeHeight = isSm ? 'h-3' : 'h-4';
  const eyeGap = isSm ? 'gap-3.5' : 'gap-5';

  // Base eye color & glow
  let eyeColor = 'bg-[#0091DA] shadow-[0_0_10px_#0091DA]';
  if (isDeactivated) {
    eyeColor = 'bg-slate-600 shadow-none';
  } else if (isExecuting) {
    eyeColor = 'bg-[#38BDF8] shadow-[0_0_18px_#38BDF8]';
  }

  // Left & Right eye transform calculations
  const getEyeTransform = (isLeftEye) => {
    if (isDeactivated) {
      // Cozy sleeping horizontal dashes
      return 'scaleX(1.35) scaleY(0.12)';
    }

    if (isHappyWink) {
      if (isLeftEye) {
        // Happy arch squint (^_~)
        return `translate3d(${gaze.x}px, ${gaze.y - 1}px, 0) scaleX(1.2) scaleY(0.18)`;
      } else {
        // Joyful wink
        return `translate3d(${gaze.x}px, ${gaze.y}px, 0) scale(1.15)`;
      }
    }

    if (isWinking) {
      if (isLeftEye) {
        return `translate3d(${gaze.x}px, ${gaze.y}px, 0) scaleY(0.08)`;
      } else {
        return `translate3d(${gaze.x}px, ${gaze.y}px, 0) scale(1.15)`;
      }
    }

    if (isBlinking) {
      // Natural blink closure
      return `translate3d(${gaze.x}px, ${gaze.y}px, 0) scaleY(0.08)`;
    }

    if (isExecuting) {
      // Focused analytical squint
      return `translate3d(${gaze.x}px, ${gaze.y}px, 0) scaleX(1.15) scaleY(0.85)`;
    }

    // Standard awake gaze
    return `translate3d(${gaze.x}px, ${gaze.y}px, 0)`;
  };

  return (
    <div
      ref={visorRef}
      onClick={handleVisorClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full ${visorHeight} rounded-xl bg-[#0B0E14] border border-[#2B303C] flex items-center justify-center px-3 overflow-hidden shadow-inner cursor-pointer select-none transition-all ${className}`}
      title={isDeactivated ? 'Agent is sleeping (Deactivated)' : isExecuting ? 'Agent is thinking...' : 'KEAOS Agent Core (Click to interact)'}
    >
      {/* Scanning Beam Overlay during execution */}
      {isExecuting && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0091DA]/30 to-transparent animate-pulse pointer-events-none" />
      )}

      {/* Two Expressive Living Robot Eyes */}
      <div className={`flex items-center ${eyeGap} z-10 pointer-events-none`}>
        {/* Left Eye */}
        <div
          className={`${eyeWidth} ${eyeHeight} rounded-full transition-all duration-200 ease-out ${eyeColor} ${
            isDeactivated ? 'animate-pulse' : ''
          }`}
          style={{
            transform: getEyeTransform(true),
            transformOrigin: 'center center'
          }}
        />

        {/* Right Eye */}
        <div
          className={`${eyeWidth} ${eyeHeight} rounded-full transition-all duration-200 ease-out ${eyeColor} ${
            isDeactivated ? 'animate-pulse' : ''
          }`}
          style={{
            transform: getEyeTransform(false),
            transformOrigin: 'center center'
          }}
        />
      </div>

      {/* Digital CRT Scanline lines for retro-futuristic depth */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.08)_2px,rgba(255,255,255,0.08)_4px)]" />

      {/* Status indicator LED in top-right corner */}
      {showStatusLed && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 pointer-events-none">
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              isDeactivated
                ? 'bg-slate-500'
                : isExecuting
                  ? 'bg-[#0091DA] animate-ping'
                  : hasModel
                    ? 'bg-[#10B981] shadow-[0_0_6px_#10B981]'
                    : 'bg-amber-400'
            }`}
            title={
              isDeactivated
                ? 'Deactivated'
                : hasModel
                  ? 'Brain Active (Model Connected)'
                  : 'Idle (Model Disconnected)'
            }
          />
        </div>
      )}
    </div>
  );
}

