# Implementation Plan - Multi-Product Sales Cart

## User Requirement
Enable selecting more than one product for a client during a sale transaction.

## Proposed Changes

### 1. Sales Page (`src/pages/Sales.tsx`)
- Update the sale creation workflow to support a multi-item cart state.
- Allow adding multiple iPhones, Consoles, and Accessories/Gifts into the cart before finalizing.
- Display cart items with quantities, individual prices, and subtotal/total calculations.
- Support removing items from the cart or adjusting quantities.
- Save the multi-item cart array into the sale record so invoices and guarantee notes correctly display all purchased products.

### 2. Guarantee Notes & Invoices (`src/pages/GuaranteeNote.tsx`, `src/pages/Invoices.tsx`)
- Update invoice and guarantee note rendering to iterate over cart items when a sale contains multiple products.

## Verification Plan
- Compile applet with `compile_applet`.
- Lint with `lint_applet`.
