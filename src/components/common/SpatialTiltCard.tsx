import React, { useState, useRef, useCallback } from 'react';

interface SpatialTiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max tilt degrees (default 7)
  perspective?: number; // perspective in px (default 1000)
  glareOpacity?: number; // max opacity of specular holographic sheen (default 0.25)
  showCornerBrackets?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const SpatialTiltCard: React.FC<SpatialTiltCardProps> = ({
  children,
  className = '',
  maxTilt = 7,
  perspective = 1000,
  glareOpacity = 0.22,
  showCornerBrackets = false,
  onClick,
  style = {},
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  const [glarePos, setGlarePos] = useState<{ x: number; y: number; active: boolean }>({ x: 50, y: 50, active: false });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const percentX = (x - centerX) / centerX;
    const percentY = (y - centerY) / centerY;

    // Calculate rotation: moving up tilts X negative, moving down tilts X positive
    const rotateX = -percentY * maxTilt;
    const rotateY = percentX * maxTilt;

    setTransform(`perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      active: true,
    });
  }, [maxTilt, perspective]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransform(`perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`);
    setGlarePos((prev) => ({ ...prev, active: false }));
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative group transition-[transform,box-shadow] duration-200 ease-out will-change-transform ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        transform,
        boxShadow: isHovered
          ? '0 18px 36px -8px rgba(0, 0, 0, 0.75), 0 0 24px var(--sgx-glow, rgba(253, 204, 13, 0.18)), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          : '0 8px 20px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        ...style,
      }}
    >
      {/* Specular Holographic Glare Layer */}
      <div
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: glarePos.active ? glareOpacity : 0,
          background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.45) 0%, rgba(253, 204, 13, 0.15) 30%, transparent 65%)`,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Cyber Corner Brackets (Optional Accent) */}
      {showCornerBrackets && (
        <>
          <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[var(--sgx-primary)] z-20 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[var(--sgx-primary)] z-20 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />
          <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[var(--sgx-primary)] z-20 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-[var(--sgx-primary)] z-20 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />
        </>
      )}

      {/* Card Content with 3D Depth Separation */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
