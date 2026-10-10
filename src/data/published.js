// Every figure in this file is copied from a published source listed in SOURCES.
// Nothing here is generated or simulated. Where an operator has not published a
// figure, the value is null and the UI shows "Not published".

export const SOURCES = {
  dgMetro2L: {
    title: 'Ahmedabad Metro Crosses 2 Lakh Daily Ridership Mark on Routine Days',
    publisher: 'DeshGujarat (GMRC data)',
    date: '2026-08-14',
    url: 'https://deshgujarat.com/2026/08/14/ahmedabad-metro-ridership-touches-2-lakh-daily-mark/',
  },
  gsMetro4yr: {
    title: 'From 35,000 to 2 Lakh Daily Passengers: Ahmedabad Metro Records 15.86 Crore Passengers in 4 Years',
    publisher: 'Gujarat Samachar',
    date: '2026-10',
    url: 'https://english.gujaratsamachar.com/news/ahmedabad/from-35000-to-2-lakh-daily-passengersahmedabad-metro-records-1586-crore-passengers-in-4-years-wiht-37811832505',
  },
  printMetro: {
    title: "Ahmedabad-Gandhinagar metro's average daily ridership crosses 1.53 lakh",
    publisher: 'ThePrint (PTI)',
    date: '2026-06-10',
    url: 'https://theprint.in/india/ahmedabad-gandhinagar-metros-average-daily-ridership-crosses-1-53-lakh/2956389/',
  },
  dgAmts: {
    title: 'Ahmedabad AMTS Buses Hit Record 6.31 Lakh Ridership, Highest-Ever Daily Revenue',
    publisher: 'DeshGujarat (IANS)',
    date: '2026-08-12',
    url: 'https://deshgujarat.com/2026/08/12/ahmedabad-amts-buses-hit-record-6-31-lakh-ridership-highest-ever-daily-revenue/',
  },
  janmarg: {
    title: 'BRTS in Numbers',
    publisher: 'Ahmedabad Janmarg Ltd (official)',
    date: 'undated',
    url: 'https://janmarg.in/index.php?file=moredetail_brtsinnumbers',
  },
  wikiBrts: {
    title: 'Ahmedabad Bus Rapid Transit System (infobox: ridership March 2025)',
    publisher: 'Wikipedia',
    date: '2025-03',
    url: 'https://en.wikipedia.org/wiki/Ahmedabad_Bus_Rapid_Transit_System',
  },
  gsTiranga: {
    title: 'Tiranga Yatra to Affect Ahmedabad Bus Services; 19 AMTS, 5 BRTS Routes Shortened',
    publisher: 'Gujarat Samachar',
    date: '2026-08-12',
    url: 'https://english.gujaratsamachar.com/news/ahmedabad/tiranga-yatra-to-affect-ahmedabad-bus-services-19-amts-5-brts-routes-shortened-63491850900',
  },
  openMeteo: {
    title: 'Open-Meteo Historical Weather API (ERA5 reanalysis), Ahmedabad 23.02N 72.57E',
    publisher: 'Open-Meteo',
    date: 'live',
    url: 'https://open-meteo.com/en/docs/historical-weather-api',
  },
}

// Reference day: the most recent date for which BOTH Metro and AMTS published
// a day-level figure (Monday, 10 August 2026).
export const REFERENCE_DATE = '2026-08-10'

export const METRO = {
  name: 'Ahmedabad–Gandhinagar Metro (GMRC)',
  // Day-wise passenger journeys published by GMRC via DeshGujarat.
  dailySeries: [
    { date: '2026-07-23', riders: 195522 },
    { date: '2026-07-28', riders: 195210 },
    { date: '2026-07-29', riders: 198162 },
    { date: '2026-07-30', riders: 194904 },
    { date: '2026-08-03', riders: 199789 },
    { date: '2026-08-04', riders: 198131 },
    { date: '2026-08-05', riders: 196561 },
    { date: '2026-08-06', riders: 199339 },
    { date: '2026-08-07', riders: 200436 },
    { date: '2026-08-10', riders: 203215 },
  ],
  dailySeriesSource: 'dgMetro2L',
  // Year-wise totals (Oct–Sep), Gujarat Samachar four-year report.
  yearly: [
    { period: 'FY Oct22–Sep23', passengersLakh: 230.13, revenueCr: 29.31 },
    { period: 'FY Oct23–Sep24', passengersLakh: 362.48, revenueCr: 43.32 },
    { period: 'FY Oct24–Sep25', passengersLakh: 468.91, revenueCr: 57.58 },
    { period: 'FY Oct25–Sep26', passengersLakh: 525.36, revenueCr: 64.71 },
  ],
  august2026: { passengersLakh: 54.29, revenueCr: 6.81 },
  september2026: { passengersLakh: 53.06 },
  punctualityPct: 99.98,
  peakHeadwayMin: 6,
  yearlySource: 'gsMetro4yr',
  networkKm: 68.28,
  stations: 54,
  avgDailyByYear: [
    { year: '2023', riders: 69000 },
    { year: '2024', riders: 101000 },
    { year: '2025', riders: 133000 },
    { year: 'May 2026', riders: 153000 },
  ],
  eventPeaks: [
    { date: '2026-04-30', label: 'IPL match, Narendra Modi Stadium', riders: 226000, approx: 'over' },
    { date: '2026-05-21', label: 'IPL match', riders: 222000, approx: '' },
    { date: '2026-02-18', label: 'World Cup match', riders: 221000, approx: 'over' },
  ],
  networkSource: 'printMetro',
}

export const AMTS = {
  name: 'AMTS (Ahmedabad Municipal Transport Service)',
  referenceDay: {
    date: '2026-08-10',
    riders: 631761,
    revenueRs: 3977935,
    busesOperated: 970,
    note: 'Highest-ever working-day ridership; highest single-day collection in more than a decade',
  },
  electricBusesOrdered: 1150,
  source: 'dgAmts',
}

export const BRTS = {
  name: 'Janmarg BRTS (Ahmedabad Janmarg Ltd)',
  // Janmarg does not publish day-level ridership. These are the latest published averages.
  officialAvgDaily: 150000,
  officialSource: 'janmarg',
  wikiDaily: { riders: 165000, asOf: 'March 2025', source: 'wikiBrts' },
  corridorKm: 101,
  buses: 250,
  routes: 15,
  stations: 163,
  electricBuses: 50,
  hours: '6 AM – 11 PM',
}

// Real, dated, published service disruptions.
export const INCIDENTS = [
  {
    date: '2026-08-12',
    operators: ['AMTS', 'BRTS'],
    severity: 'high',
    title: 'Tiranga Yatra (Raipur Darwaja → Sarangpur Darwaja), from 2 PM',
    detail:
      'AMTS: 19 routes shortened, 38 diverted. BRTS: RTO Circular cut to RTO Circle–Govt Litho Press; Sanand Circle–Sarangpur, Narol–Sarangpur, Odhav–ISKCON and Odhav–LD Engg routes shortened; Kalupur Ghee Bazaar, Kalupur Rly Stn, Sarangpur Darwaja, Karnamukteshwar Mahadev and Raipur Darwaja stations closed.',
    source: 'gsTiranga',
  },
]

// Snapshot of the Open-Meteo archive response for Ahmedabad, fetched 2026-10-10.
// Used only when the network is unavailable; the app fetches this live when online.
export const WEATHER_SNAPSHOT = {
  fetchedAt: '2026-10-10',
  daily: {
    time: ['2026-07-20','2026-07-21','2026-07-22','2026-07-23','2026-07-24','2026-07-25','2026-07-26','2026-07-27','2026-07-28','2026-07-29','2026-07-30','2026-07-31','2026-08-01','2026-08-02','2026-08-03','2026-08-04','2026-08-05','2026-08-06','2026-08-07','2026-08-08','2026-08-09','2026-08-10','2026-08-11','2026-08-12'],
    precipitation_sum: [4.7,3.6,4.8,78.7,100.7,30.5,15.6,26.2,0.1,1.1,1.4,35.3,49.1,2.7,2.8,0.8,1.8,0.9,1.3,0.3,2.2,7.3,7.1,11.4],
    temperature_2m_max: [33.4,32.6,31.2,27.4,26.9,29.4,31.9,31.1,32.7,32.2,32.5,32.5,28.1,32.6,31.5,33.0,33.1,33.6,33.5,33.3,33.6,29.1,30.1,29.5],
  },
}
