# Fatafat Brief — Unified Morning Brief for Ahmedabad Transit (PS-13)

Fatafat Brief gives Ahmedabad's transit leadership one two-minute morning brief across **Ahmedabad Metro (GMRC)**, **AMTS** and **Janmarg BRTS**, cross-checked against the weather. It reads the numbers, explains *why* they moved, and turns them into a dashboard, a full printable report, and ready-to-send WhatsApp messages.

It is built on **real published figures only**. Nothing is mocked or simulated. If an operator has not published a figure, the app says **Not published** rather than guessing.

### At a glance
- 📊 **One dashboard** for Metro, AMTS and BRTS ridership, revenue, punctuality and weather
- 🧠 **AI or rule-based brief** that explains *why* the numbers moved (Gemini by default; works offline)
- 📄 **Full report** with daily, monthly and yearly trends, a "What this means" box in every section, and Print / Save PDF
- 💬 **WhatsApp messages** for the Ministry (strategic) and the Ops team (exceptions only)
- 📅 **Any reporting day:** step back through every day that has data
- 📤 **Operator MIS upload** (CSV) to replace published figures with real daily numbers
- 🌐 **English, हिन्दी and ગુજરાતી**, including the AI brief, WhatsApp messages and report
- 🏷️ **Every number labelled** Published, Derived or Not published, with a source link

---

## What it can do

### 1. Morning dashboard
- **Pick any reporting day:** the date selector in the header lists every day that has data, newest first, and shows which operators reported that day (for example, "Mon, 10 Aug 2026 · Metro + AMTS"). Use **‹ ›** to step to the previous or next day. The dashboard, brief, WhatsApp messages and report all switch to that day. An operator with no figure for the chosen day shows **Not published** and is listed as a data gap. Figures from another day are never used.
- **System KPIs:** total ridership across all three operators, total revenue, and weather and reliability, each with a small trend chart.
- **Executive Synthesis:** a 120–170 word plain-language brief (in the chosen language) that links operators and weather (for example, "heavy rain barely dented Metro demand"). Good news, problems and weather warnings are colour-coded.
- **Operator cards:** riders, revenue, on-time performance, mode share and key facts (network size, fleet, riders per bus, revenue per rider) for each operator, with source links.
- **Metro ridership vs rainfall:** paired charts plus the Pearson correlation and the wettest-day comparison.
- **Published disruptions and data gaps:** dated service disruptions, and a list of which metrics each operator does not publish.

### 2. Full Report & Trends
Click **Full Report & Trends** to open a printable report (**Print / Save PDF**, A4) with:

| Section | Numbers | Insights ("What this means") |
|---|---|---|
| **Executive summary** | Brief, operator table with Published / Derived / Not published labels | Who carries the city, who earns more per trip, record days |
| **Daily trend** | Day-level ridership, change vs previous reported day, rainfall, event-day peaks | How steady demand is (± band), direction over the period, weekday coverage, rain sensitivity, event-day capacity |
| **Monthly trend** | Published month totals, average per day, averages of reported days | Whether a monthly drop is real or only fewer days in the month; weekday vs all-day demand |
| **Yearly trend** | FY trips and revenue, YoY growth, average fare, average daily ridership by year | Growth slowing or holding, compounded annual growth, whether revenue comes from fares or volume |
| **Disruptions & data gaps** | Incidents and missing metrics | How much of the picture is missing and which operator could close most of it |
| **Sources** | Every source with its full URL | |

Every insight is **calculated from the data on the page** (`insights()` in `src/lib/engine.js`). There is no fixed text, so when you upload new data the insights change, or are dropped if the data no longer supports them.

### 3. WhatsApp briefs
- **Ministry WhatsApp Brief:** system ridership, mode share, strategic signals, reporting gaps and today's weather, formatted for WhatsApp.
- **Ops Team Brief:** exceptions only (disruptions, ridership drops over 5%, heavy rain, high rain probability today, operators missing from the MIS).
- Each one has **Copy text** and **Open WhatsApp** buttons.

### 4. Load the operators' daily MIS
Click **Load daily MIS** and upload a CSV. **CSV template** downloads a blank one.

```
date,operator,riders,revenue_rs,on_time_pct,incident
2026-10-09,METRO,201000,2500000,99.9,
2026-10-09,AMTS,612000,3850000,,Bus breakdown on Route 45
2026-10-09,BRTS,155000,,,
```

- `operator` is `METRO`, `AMTS` or `BRTS`. Only `date`, `operator` and `riders` are required.
- Several days per operator build the daily trend, monthly averages and insights in the report.
- After upload, the latest day opens. Every uploaded day can be picked in the date selector.
- An operator missing on the chosen day is flagged and uses the published figure for that same day, if there is one. Otherwise it shows *Not published*.
- **Reset to published** switches back.

### 5. AI brief with offline fallback
- **Google Gemini** (`gemini-3.5-flash`) is the default. If Gemini is busy (429/500/503) it automatically tries `gemini-flash-latest`, then `gemini-2.5-flash`.
- **Anthropic Claude** (`claude-opus-5-5`) can be chosen under **Add AI key**.
- The AI only gets the numbers on the page and is told never to invent or round figures.
- **No key, no network, or an API error:** a rule-based generator writes the brief instantly from the same numbers. The badge shows which engine wrote it (Gemini / Claude / Rule engine / Offline / Fallback).
- **Simulate Network Drop** in the header lets you show offline mode during a demo.

### 6. Live weather
Rainfall and temperature for Ahmedabad come from **Open-Meteo** (ERA5 archive plus today's forecast). A real snapshot is bundled for offline use, and the dashboard shows whether it is using **Live API** or **Cached** data.

### 7. English, हिन्दी and ગુજરાતી
Use the **EN / हिं / ગુ** switch in the header. The choice is remembered in the browser, and everything changes language together:
- the dashboard, operator cards, badges and buttons
- the Executive Synthesis. The rule engine has its own Hindi and Gujarati text, and Gemini or Claude is told to write in the chosen language.
- both WhatsApp messages, ready to forward in that language
- the Full Report, including every insight, table heading and note
- dates (सोम, 10 अग॰ 2026 / સોમ, 10 ઑગસ્ટ, 2026) and amounts (₹39.78 लाख / ₹6.81 કરોડ)

Digits stay 0–9, the way Hindi and Gujarati newspapers print figures. Operator names AMTS, BRTS and GMRC stay in Latin letters. Source titles stay in the language they were published in. Text from an uploaded MIS (for example, incident notes) is shown exactly as the operator wrote it. All strings are in `src/i18n.js`.

---

## Quick start

**Windows (one click):** double-click `run.bat`. On first run it checks Node.js, installs dependencies, opens http://localhost:5173 and starts the app.

**Any OS:**
```
npm install
npm run dev
```

Other scripts: `npm run build` (production build into `dist/`), `npm run preview`, `npm run lint` (oxlint).

**AI key (optional):** put `VITE_GEMINI_API_KEY=...` in `.env.local` (git ignores it), or paste a key under **Add AI key**. Keys typed in the app are stored only in that browser's localStorage and take priority over `.env.local`.

> ⚠️ Vite copies `VITE_` variables into the built JavaScript, so anyone visiting a deployed copy can read the key. Use a restricted key for public deploys.

### Deploy on Vercel
1. Push the repo to GitHub.
2. On [vercel.com](https://vercel.com), choose **Add New → Project** and import the repo. Vercel detects Vite (build `npm run build`, output `dist`).
3. Click **Deploy**.

**Do not add `VITE_GEMINI_API_KEY` in Vercel's environment variables.** It would be copied into the public JavaScript, where anyone can read it. The deployed site uses the rule-based brief by default. To show the Gemini brief, click **Add AI key** on the live site and paste your key. It is stored only in that browser.

### Two-minute demo
1. Open the app. The dashboard shows **Mon, 10 Aug 2026**, the latest day with both Metro and AMTS figures.
2. Read the **Executive Synthesis**: AMTS's record day, Metro's highest day in the series, and the Tiranga Yatra disruption.
3. Click **‹** in the date selector to go back a day. AMTS switches to *Not published* and the brief says the total is incomplete.
4. Click **Full Report & Trends**. Scroll through the daily, monthly and yearly trends and their insights (for example, September looks down 2.3% but per day it is up 1.0%). Try **Print / Save PDF**.
5. Click **Generate Ministry WhatsApp Brief**, then **Copy text**.
6. Switch to **हिं** or **ગુ**. Everything, including the report and WhatsApp text, changes language.
7. Turn on **Simulate Network Drop**. The brief falls back to the rule engine instantly.
8. Click **CSV template**, fill in a few days, and use **Load daily MIS** to see the report rebuild from operator data.

---

## The data

### Data rules
- **Published (day):** an operator-published figure for that day.
- **Published avg:** an official average. BRTS does not publish day-level ridership.
- **Derived:** worked out from published figures, with the method shown. Example: Metro daily revenue = riders × the published Aug 2026 average fare (₹6.81 cr ÷ 54.29 lakh trips).
- **Not published:** shown as such and listed under *Data gaps*. It is never filled in.

### Sources
| Data | Source |
|---|---|
| Metro daily journeys (23 Jul–10 Aug 2026), FY totals, Aug/Sep 2026 totals, 99.98% punctuality | GMRC via DeshGujarat (14 Aug 2026); Gujarat Samachar 4-year report |
| Metro network 68.28 km / 54 stations, average daily ridership by year, event-day peaks | ThePrint/PTI (10 Jun 2026) |
| AMTS 10 Aug 2026: 6,31,761 riders, ₹39,77,935, 970 buses | DeshGujarat/IANS (12 Aug 2026) |
| BRTS 1,50,000/day avg, 101 km, 250 buses, 163 stations | janmarg.in "BRTS in Numbers" (official, undated) |
| Disruption: Tiranga Yatra route changes, 12 Aug 2026 | Gujarat Samachar |
| Rainfall / temperature, today's forecast | Open-Meteo API (live, with a cached snapshot) |

Full links are in `src/data/published.js`, on the dashboard, and at the end of the report.

### Known gaps in public data
- AMTS publishes one recent day (10 Aug 2026), with no daily series and no on-time performance.
- Janmarg BRTS publishes only an average, with no daily ridership, revenue or on-time performance.
- Metro monthly totals are available for Aug and Sep 2026 only.

These gaps are why the daily MIS upload exists. With operator CSVs, every section of the report fills in for all three operators.

---

## Project structure

```
src/
  App.jsx            Dashboard, modals, upload, AI/offline orchestration
  Report.jsx         Full Report & Trends page (print / PDF)
  ui.jsx             Shared UI pieces (cards, badges, chart tooltip, highlighted text), language context
  i18n.js            All English / Hindi / Gujarati strings
  lib/engine.js      Formatting, weather fetch, dataset build, CSV import,
                     analysis, trends, insights, rule-based brief, WhatsApp text
  lib/ai.js          Gemini / Claude calls, grounded prompt, model fallback chain
  data/published.js  Every published figure with its source
run.bat              One-click Windows launcher
```

## Tech stack
React 19 · Vite 8 · Tailwind CSS 4 · Recharts · lucide-react · oxlint

## Google products used
| Product | Where | What it does |
|---|---|---|
| **Gemini API** (`gemini-3.5-flash`, `@google/genai` SDK) | `src/lib/ai.js` | Default AI engine that writes the Executive Synthesis. Key from [Google AI Studio](https://aistudio.google.com/apikey). |
| **Google Fonts** (Inter, Noto Sans Devanagari, Noto Sans Gujarati) | `index.html`, `src/index.css` | UI typefaces for English, Hindi and Gujarati. Falls back to system fonts when offline. |

---

## Limitations
- **Thin public data:** see *Known gaps in public data* above. Most AMTS and BRTS trends need the operators' own MIS.
- **Translations:** the Hindi and Gujarati text has not yet been reviewed by a native speaker. Fixes are one-line edits in `src/i18n.js`.
- **AI brief in Hindi and Gujarati:** the prompt asks for the chosen language, but it has not been tested end-to-end with a live key yet. The rule-based brief is fully translated.
- **API key in the browser:** fine for a local demo, but not for a public deploy (see the warning in *Quick start*).
- **No automated tests yet,** and the production bundle is over 500 kB (Vite warns about this).

## Roadmap
### Automatic data pipeline
The CSV format above is the app's single input format. The next step is to fill it automatically:

1. **Adapters:** one per operator. Each reads that operator's raw export (Excel, CSV, email or API) and maps it to the CSV columns.
2. **Checks:** reject bad dates, negative or 10× jumps in riders, and missing operators. Flag them instead of publishing them.
3. **Output:** write `public/data/latest.csv`, which the app loads on startup, falling back to published figures.
4. **Schedule:** a daily job (for example, GitHub Actions at about 6 AM IST) builds and redeploys, so the brief is ready before leadership opens it.

### More features
- **Gemini MIS reader:** drop in an operator's PDF, Excel sheet or photo. Gemini extracts the figures, and nothing loads until a person approves each one.
- **Ask the data:** questions like "Why did Metro dip on 28 Jul?", answered by Gemini using only the figures on the page.
- **Firebase Hosting + Cloud Function:** a shareable link with the API key kept on the server.
- **Scheduled 7 AM brief:** Cloud Scheduler sends the brief by email or WhatsApp every morning.
- **Installable app (PWA):** opens offline on a phone with the last brief.
- **Compare two dates, custom alert thresholds, and a disruption map** (Google Maps).
- **Tests** for the engine's numbers and insights, and a smaller bundle by loading charts and AI code only when needed.
