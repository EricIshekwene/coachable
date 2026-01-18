import React, { useState, useRef, useEffect } from 'react';

export default function TimeSlider({
  min = 0,
  max = 100,
  value = 50,
  step = 1,
  onChange = () => { },
  pinSize = '8px',
  trackWidth = '2px',
  pinColor = '#FF7A18',
  trackColor = '#9AA0A6',
  inactiveTrackColor,
  className = '',
}) {
  const [sliderValue, setSliderValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    setSliderValue(value);
  }, [value]);

  const getPercentage = () => {
    return ((sliderValue - min) / (max - min)) * 100;
  };

  const updateValue = (clientX) => {
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const rawValue = min + (percentage / 100) * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));

    setSliderValue(clampedValue);
    onChange(clampedValue);
  };

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    updateValue(e.clientX);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (isDraggingRef.current) {
      updateValue(e.clientX);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const percentage = getPercentage();

  return (
    <div className={`w-full relative ${className}`} style={{ cursor: 'pointer' }}>
      {/* Track background */}
      <div
        ref={trackRef}
        className="absolute top-1/2 left-0 w-full -translate-y-1/2 rounded-full"
        style={{
          height: trackWidth,
          backgroundColor: inactiveTrackColor || trackColor,
          cursor: 'pointer',
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Active track (filled portion) */}
        <div
          className="absolute top-0 left-0 h-full transition-all duration-100 rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: pinColor,
          }}
        />
      </div>

      {/* Pin/Thumb */}
      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-100"
        style={{
          left: `${percentage}%`,
          width: pinSize,
          height: pinSize,
          backgroundColor: pinColor,
          
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
