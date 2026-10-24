# Implementation Plan - Guarantee Note Modal & PDF Download Fix

## Problem Statement
When generating or viewing guarantee notes/invoices (`/guarantee/:id`), the note sometimes does not render completely or lacks reliable direct download/print functionality.

## Proposed Changes
1. **Enhance Guarantee Note Page (`/src/pages/GuaranteeNote.tsx`)**:
   - Ensure full responsive container with proper overflow scrolling and professional A4/Receipt layout.
   - Add clear, prominent action buttons: **"Baixar PDF / Imprimir"** (using html2canvas + jspdf or browser print with custom print media stylesheet) and **"Compartilhar WhatsApp"**.
   - Fix modal or full-screen view sizing so the entire document (header, product list, installments schedule, witness signatures, and terms) is fully visible without clipping.
2. **Add Print / PDF Export Utility (`src/lib/html2canvasUtils.ts` or direct window.print support)**:
   - Provide robust print & PDF download handlers ensuring high resolution capture of the note container.

## Verification Plan
1. Compile applet to verify TypeScript and build correctness.
2. Test Guarantee Note view in Sales and Invoices pages.
