export type Team = {
  name: string
  /** ISO 3166-1 alpha-2 code, lowercase — used for the flag image */
  code: string
}

export type Match = {
  id: string
  home: Team
  away: Team
  /** e.g. "20th June" */
  date: string
  /** e.g. "19:00" */
  time: string
  venue: string
}

// The next Mundial 2026 fixtures. Add or edit matches here.
export const matches: Match[] = [
  {
    id: 'ned-swe',
    home: { name: 'Netherlands', code: 'nl' },
    away: { name: 'Sweden', code: 'se' },
    date: '20th June',
    time: '19:00',
    venue: 'Houston',
  },
  {
    id: 'ger-civ',
    home: { name: 'Germany', code: 'de' },
    away: { name: 'Ivory Coast', code: 'ci' },
    date: '20th June',
    time: '22:00',
    venue: 'Toronto',
  },
  {
    id: 'ecu-cuw',
    home: { name: 'Ecuador', code: 'ec' },
    away: { name: 'Curaçao', code: 'cw' },
    date: '21st June',
    time: '02:00',
    venue: 'Kansas City',
  },
  {
    id: 'tun-jpn',
    home: { name: 'Tunisia', code: 'tn' },
    away: { name: 'Japan', code: 'jp' },
    date: '21st June',
    time: '06:00',
    venue: 'Monterrey (Guadalupe)',
  },
  {
    id: 'esp-ksa',
    home: { name: 'Spain', code: 'es' },
    away: { name: 'Saudi Arabia', code: 'sa' },
    date: '21st June',
    time: '18:00',
    venue: 'Atlanta',
  },
  {
    id: 'bel-irn',
    home: { name: 'Belgium', code: 'be' },
    away: { name: 'Iran', code: 'ir' },
    date: '21st June',
    time: '21:00',
    venue: 'Los Angeles (Inglewood)',
  },
]
