# Koshary and Couscous

A minimal, data-first North Africa information platform with a mature stock-market and company-intelligence product at its core.

The platform currently covers **Egypt, Morocco, Tunisia and Algeria** for market/company data, with the broader North Africa platform architecture prepared for **Libya** and additional sections such as history, economy, travel, culture, geography, people, data, maps, methodology and sources.

## Product

### Stock Market

The stock-market experience is the primary mature product and is available from `/markets`.

It provides:

- Market-cap rankings
- Country/market selection
- Company search and filtering
- Sector and exchange filtering
- Company detail pages
- Historical price charts
- Historical market-cap charts
- Exact chart-point interaction/tooltips
- Multiple historical ranges: 1D, 1W, 1M, 3M, 6M, 1Y, 3Y, 5Y and MAX
- Local-currency and USD views where verified FX data is available
- Company logos with safe initials fallback
- Quote metadata such as previous close, open, high, low and volume when supplied by the provider
- Financial statements, valuation and profitability metrics when verified provider data is available

## Company intelligence

Company pages use a shared, country-aware intelligence architecture rather than separate implementations for each market.

The company experience supports:

- Current local-currency price
- Current USD price
- Local-currency market capitalization
- USD market capitalization
- Historical price data
- Historical market-cap calculations
- Local/USD chart scaling
- Historical FX conversion
- Company identifiers and provider tickers
- Company logos
- Provider/source and retrieval-status disclosure
- Verified financial statements and fundamental metrics when available

### Historical USD conversion

Historical USD values are calculated using the FX rate corresponding to the historical observation rather than applying today's exchange rate to the entire historical series.

Conceptually:

`Historical USD Price(t) = Historical Local Price(t) / Historical Local-Currency-per-USD FX(t)`

Historical market capitalization follows the same point-in-time FX principle.

Configured FX symbols include:

- Egypt: `EGP=X`
- Morocco: `MAD=X`
- Tunisia: `TND=X`
- Algeria: `DZD=X`

If a verified historical FX observation is unavailable, the application does **not** fabricate a USD value.

### Historical market capitalization

Where the connected free dataset does not provide historical shares outstanding, historical market capitalization is transparently calculated as:

`Historical Market Cap(t) = Historical Share Price(t) × Current Shares Outstanding`

This is an estimate of historical market capitalization and does not attempt to reconstruct historical share-count changes that are unavailable from the connected dataset.

### Financial data

Company fundamentals use **Alpha Vantage** as the optional primary fundamental-data provider when `ALPHA_VANTAGE_API_KEY` is configured, with the existing free Yahoo Finance path retained as a fallback.

Alpha Vantage data can include:

- Annual and quarterly income statements
- Balance sheets
- Cash-flow statements
- Company overview/fundamental fields
- Valuation inputs
- Profitability inputs
- Shareholder data

The application normalizes provider data into the internal financial model and calculates only transparent derived metrics when the required provider inputs exist. Missing fields remain unavailable.

`ALPHA_VANTAGE_API_KEY` is server-side only and must be configured in Vercel Environment Variables if Alpha Vantage fundamentals are desired.

urlAlpha Vantage API documentationhttps://www.alphavantage.co/documentation/  
urlAlpha Vantage support / free API limitshttps://www.alphavantage.co/support/

## Supported markets

| Market | Code | Currency | Yahoo symbol convention | Historical FX |
|---|---|---|---|---|
| Egypt | `EG` | EGP | `.CA` | `EGP=X` |
| Morocco | `MA` | MAD | `.CS` | `MAD=X` |
| Tunisia | `TN` | TND | `.TN` | `TND=X` |
| Algeria | `DZ` | DZD | Provider/search dependent | `DZD=X` |

Provider availability varies by exchange. A missing provider field is displayed as unavailable rather than replaced with an estimated or fabricated value.

## North Africa platform

The application has a centralized country/section architecture designed to expand beyond the stock-market product.

### Countries

- Egypt
- Libya
- Tunisia
- Algeria
- Morocco

### Planned/active sections

- History
- Stock Market
- Economy
- Companies
- Travel
- Culture
- Geography
- People
- Government
- North Africa Data
- Interactive Map
- About
- Methodology
- Sources

The shared navigation supports:

- Persistent desktop sidebar
- Collapsed sidebar
- Mobile navigation drawer
- Custom navigation ordering
- Drag-and-drop navigation reordering
- Keyboard up/down reordering
- Local-storage persistence
- Reset-to-default navigation
- Centralized navigation configuration
- Country-aware routes
- Breadcrumbs
- Loading, empty, error and coming-soon states

The homepage is now the platform's minimal identity layer, while the stock-market product is accessed through `/markets` and the other sections can be expanded independently without duplicating country/page architecture.

## Architecture

```text
Country configuration
        ↓
Market registry
        ↓
MarketDataProvider
        ↓
Provider ticker resolution
        ↓
Historical price + quote data
        ↓
Historical FX data
        ↓
Company intelligence normalization
        ↓
Charts / rankings / financial intelligence
        ↓
Next.js UI
```

The architecture is designed so market-specific differences such as ticker conventions, currencies, exchanges, time zones and provider availability are handled through configuration and provider adapters rather than duplicated UI code.

## Data integrity rules

Koshary and Couscous follows a strict no-fabrication policy:

- Never fabricate prices.
- Never fabricate market capitalization.
- Never fabricate shares outstanding.
- Never fabricate historical prices.
- Never fabricate FX rates.
- Never fabricate financial statements.
- Never imply delayed data is real-time.
- Derived metrics must use verified provider inputs.
- Calculated values are explicitly identified where appropriate.
- Unsupported or unavailable metrics remain unavailable.
- Historical USD conversion must use historical FX data when available.

## Data providers

The application currently uses free/provider-accessible market and financial data sources, including Yahoo Finance market-data endpoints and optional Alpha Vantage fundamentals.

Provider data can be delayed, incomplete or unavailable for individual exchanges. The UI exposes source/status information rather than hiding provider limitations.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Optional fundamentals configuration:

```env
ALPHA_VANTAGE_API_KEY=""
```

The application can continue without an Alpha Vantage key by using its existing fallback data paths.

## Routes

### Core market routes

- `/` — minimal Koshary and Couscous platform homepage
- `/company/[ticker]` — legacy-compatible company detail route
- `/company/[country]/[ticker]` — country-aware company detail route
- `/markets` — stock-market experience
- `/markets/[country]` — country market route

### North Africa platform routes

- `/history`
- `/markets`
- `/economy`
- `/companies`
- `/travel`
- `/culture`
- `/geography`
- `/people`
- `/government`
- `/data`
- `/map`
- `/about`
- `/methodology`
- `/sources`

Country section pages follow the reusable pattern:

`/[section]/[country]`

Unsupported or not-yet-connected datasets are explicitly presented as coming soon rather than populated with invented information.

## Performance and UX

The application is built with the Next.js App Router and emphasizes:

- Server-side data retrieval where appropriate
- Cached provider requests
- Reusable components
- Scoped styles
- Responsive desktop/mobile layouts
- Accessible navigation controls
- Reduced-motion support
- Exact historical chart interaction
- No unnecessary client-side data fabrication

Historical chart data can be downsampled for rendering performance while retaining the complete underlying observations for exact tooltip interaction.

## Quality assurance

Before considering a change production-ready:

1. TypeScript must pass.
2. The production Next.js build must pass.
3. Existing stock-market routes must remain functional.
4. Country switching must remain functional.
5. Company pages must work across supported markets.
6. Missing provider data must degrade safely to `—`/unavailable states.
7. Historical USD values must not silently fall back to today's FX rate.
8. No fake company, price, FX or financial values may be introduced.
9. Desktop and mobile navigation must remain usable.
10. New deployments must be verified before being described as production-ready.

## Deployment

The repository is connected to Vercel and deploys from the `main` branch.

Production builds use the standard Next.js build pipeline:

```bash
npm run build
```

Do not consider a GitHub commit production-ready until the corresponding Vercel deployment has completed successfully.

## Project philosophy

**Koshary and Couscous** is intended to become a reliable, structured information layer for North Africa — beginning with public markets and expanding into broader economic, historical, geographic, cultural and company intelligence.

The guiding principle is simple:

> **Verified data first. Clear presentation second. Scale without duplication.**
