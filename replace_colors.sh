#!/bin/bash

# Define the replacements
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | xargs -0 sed -i \
  -e 's/\[#00FFFF\]/\[var(--sgx-neon)\]/g' \
  -e 's/text-[#00FFFF]/text-[var(--sgx-neon)]/g' \
  -e 's/bg-[#00FFFF]/bg-[var(--sgx-neon)]/g' \
  -e 's/border-[#00FFFF]/border-[var(--sgx-neon)]/g' \
  -e 's/\[#FDCC0D\]/\[var(--sgx-accent)\]/g' \
  -e 's/\[#32527B\]/\[var(--sgx-secondary)\]/g' \
  -e 's/\[#1A1A1A\]/\[var(--sgx-bg)\]/g' \
  -e 's/\[#121927\]/\[var(--sgx-card-bg)\]/g' \
  -e 's/\[#070B13\]/\[var(--sgx-bg)\]/g' \
  -e 's/\[#0B0F17\]/\[var(--sgx-bg)\]/g' \
  -e 's/text-[#1A1A1A]/text-[var(--sgx-bg)]/g'

# For index.css
sed -i \
  -e 's/#00FFFF/var(--sgx-neon)/g' \
  -e 's/rgba(0, 255, 255/rgba(var(--sgx-neon-rgb)/g' \
  -e 's/#FDCC0D/var(--sgx-accent)/g' \
  -e 's/rgba(253, 204, 13/rgba(var(--sgx-accent-rgb)/g' \
  -e 's/#32527B/var(--sgx-secondary)/g' \
  -e 's/rgba(50, 82, 123/rgba(var(--sgx-secondary-rgb)/g' \
  -e 's/rgba(26, 26, 26/rgba(var(--sgx-bg-rgb)/g' \
  -e 's/rgba(18, 25, 39/rgba(var(--sgx-card-bg-rgb)/g' \
  -e 's/#121212/var(--sgx-bg)/g' \
  src/index.css

echo "Done"
