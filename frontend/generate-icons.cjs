#!/usr/bin/env node

/**
 * Script para generar iconos PWA
 *
 * Este script genera iconos simples en formato SVG que luego se pueden
 * convertir a PNG usando herramientas online o del navegador.
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, 'public');

// SVG base template
const generateSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1E3A8A;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background with rounded corners -->
  <rect width="${size}" height="${size}" fill="url(#bgGradient)" rx="${size * 0.2}"/>

  <!-- Map Icon -->
  <g transform="translate(${size/2}, ${size/2})">
    ${generateMapIcon(size)}
  </g>
</svg>`;

const generateMapIcon = (size) => {
  const scale = size / 512;
  const iconSize = size * 0.4;

  return `
    <!-- Left section -->
    <path d="M ${-iconSize * 0.45},${-iconSize * 0.5}
             L ${-iconSize * 0.45},${iconSize * 0.5}
             L ${-iconSize * 0.125},${iconSize * 0.375}
             L ${-iconSize * 0.125},${-iconSize * 0.375} Z"
          fill="rgba(255, 255, 255, 0.2)"
          stroke="white"
          stroke-width="${4 * scale}"
          stroke-linejoin="round"
          stroke-linecap="round"/>

    <!-- Middle section -->
    <path d="M ${-iconSize * 0.125},${-iconSize * 0.375}
             L ${-iconSize * 0.125},${iconSize * 0.375}
             L ${iconSize * 0.2},${iconSize * 0.5}
             L ${iconSize * 0.2},${-iconSize * 0.5} Z"
          fill="rgba(255, 255, 255, 0.2)"
          stroke="white"
          stroke-width="${4 * scale}"
          stroke-linejoin="round"
          stroke-linecap="round"/>

    <!-- Right section -->
    <path d="M ${iconSize * 0.2},${-iconSize * 0.5}
             L ${iconSize * 0.2},${iconSize * 0.5}
             L ${iconSize * 0.45},${iconSize * 0.375}
             L ${iconSize * 0.45},${-iconSize * 0.375} Z"
          fill="rgba(255, 255, 255, 0.2)"
          stroke="white"
          stroke-width="${4 * scale}"
          stroke-linejoin="round"
          stroke-linecap="round"/>
  `;
};

console.log('🎨 Generando iconos SVG para PWA...\n');

// Generar SVGs
sizes.forEach(size => {
  const svg = generateSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(publicDir, filename);

  fs.writeFileSync(filepath, svg);
  console.log(`✅ Generado: ${filename}`);
});

console.log('\n📝 Iconos SVG generados exitosamente!');
console.log('\n⚠️  IMPORTANTE: Los iconos están en formato SVG.');
console.log('Para convertirlos a PNG, tienes 2 opciones:\n');
console.log('Opción 1 (Recomendada): Usa el generador web');
console.log('  → Abre: http://localhost:5173/generate-icons.html');
console.log('  → Descarga todos los iconos PNG\n');
console.log('Opción 2: Usa una herramienta online');
console.log('  → https://cloudconvert.com/svg-to-png');
console.log('  → Sube los archivos SVG generados');
console.log('  → Descarga como PNG con los mismos nombres\n');
