import React from 'react';

/*
 * Official SGX symbols from the design system (SGX Symbols group). Never
 * redraw, rotate or deform them; the vector files also live in /public/brand.
 */

const BOLT_PATH = 'M1665 62 L121 1265 L763 1266 L382 1987 L1925 784 L1284 782 Z';

export const SgxBolt: React.FC<{ size?: number; className?: string; title?: string }> = ({ size = 24, className, title }) => (
  <svg
    viewBox="0 0 2048 2048"
    width={size}
    height={size}
    className={className}
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
    aria-label={title}
  >
    <path fill="#fdcc0d" fillRule="evenodd" d={BOLT_PATH} />
  </svg>
);

export const SgxGear: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <img src="/brand/sgx-gear.svg" width={size} height={size} className={className} alt="" aria-hidden="true" draggable={false} />
);
