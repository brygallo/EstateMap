import { useState, useRef, useEffect } from 'react';

const RangeSlider = ({ min, max, step = 1, minValue, maxValue, onChange, formatValue = (v) => v, theme = 'light' }) => {
  const [isDraggingMin, setIsDraggingMin] = useState(false);
  const [isDraggingMax, setIsDraggingMax] = useState(false);
  const sliderRef = useRef(null);

  const getPercentage = (value) => {
    return ((value - min) / (max - min)) * 100;
  };

  const getValueFromPosition = (clientX) => {
    if (!sliderRef.current) return min;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const rawValue = min + (percentage / 100) * (max - min);
    return Math.round(rawValue / step) * step;
  };

  const handleMouseDown = (isMin) => (e) => {
    e.preventDefault();
    if (isMin) {
      setIsDraggingMin(true);
    } else {
      setIsDraggingMax(true);
    }
  };

  const handleTouchStart = (isMin) => (e) => {
    if (isMin) {
      setIsDraggingMin(true);
    } else {
      setIsDraggingMax(true);
    }
  };

  useEffect(() => {
    const handleMove = (clientX) => {
      const newValue = getValueFromPosition(clientX);

      if (isDraggingMin) {
        const newMin = Math.min(newValue, maxValue - step);
        onChange(Math.max(min, newMin), maxValue);
      } else if (isDraggingMax) {
        const newMax = Math.max(newValue, minValue + step);
        onChange(minValue, Math.min(max, newMax));
      }
    };

    const handleMouseMove = (e) => {
      if (isDraggingMin || isDraggingMax) {
        handleMove(e.clientX);
      }
    };

    const handleTouchMove = (e) => {
      if (isDraggingMin || isDraggingMax) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      setIsDraggingMin(false);
      setIsDraggingMax(false);
    };

    if (isDraggingMin || isDraggingMax) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDraggingMin, isDraggingMax, minValue, maxValue, min, max, step, onChange]);

  const minPercentage = getPercentage(minValue);
  const maxPercentage = getPercentage(maxValue);

  // Theme-based styles
  const isDark = theme === 'dark';
  const valueBoxClass = isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700';
  const separatorClass = isDark ? 'text-white/40' : 'text-gray-400';
  const trackBgClass = isDark ? 'bg-white/20' : 'bg-gray-200';

  return (
    <div className="w-full">
      {/* Values Display */}
      <div className="flex items-center justify-between mb-1.5 text-[10px] font-semibold">
        <span className={`${valueBoxClass} px-1.5 py-0.5 rounded text-[10px]`}>{formatValue(minValue)}</span>
        <span className={separatorClass}>-</span>
        <span className={`${valueBoxClass} px-1.5 py-0.5 rounded text-[10px]`}>{formatValue(maxValue)}</span>
      </div>

      {/* Slider */}
      <div className="relative pt-1 pb-3">
        {/* Track Background */}
        <div
          ref={sliderRef}
          className={`relative h-1 ${trackBgClass} rounded-full cursor-pointer`}
          onClick={(e) => {
            const newValue = getValueFromPosition(e.clientX);
            const distToMin = Math.abs(newValue - minValue);
            const distToMax = Math.abs(newValue - maxValue);

            if (distToMin < distToMax) {
              onChange(Math.min(newValue, maxValue - step), maxValue);
            } else {
              onChange(minValue, Math.max(newValue, minValue + step));
            }
          }}
        >
          {/* Active Range */}
          <div
            className="absolute h-full bg-gradient-to-r from-primary to-secondary rounded-full"
            style={{
              left: `${minPercentage}%`,
              right: `${100 - maxPercentage}%`,
            }}
          />

          {/* Min Handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
            style={{ left: `${minPercentage}%` }}
            onMouseDown={handleMouseDown(true)}
            onTouchStart={handleTouchStart(true)}
          >
            <div className={`w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md transition-transform ${
              isDraggingMin ? 'scale-125' : 'hover:scale-110'
            }`} />
          </div>

          {/* Max Handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
            style={{ left: `${maxPercentage}%` }}
            onMouseDown={handleMouseDown(false)}
            onTouchStart={handleTouchStart(false)}
          >
            <div className={`w-4 h-4 bg-white border-2 border-secondary rounded-full shadow-md transition-transform ${
              isDraggingMax ? 'scale-125' : 'hover:scale-110'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RangeSlider;
