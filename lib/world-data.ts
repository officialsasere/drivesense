// lib/world-data.ts
// Scalable world routes database
// Add more countries/states/routes as needed

export interface Route {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  type: 'urban' | 'highway' | 'rural' | 'roundabout' | 'motorway';
  speedLimit: number; // km/h
  durationMin: number; // estimated minutes
  distanceKm: number;
  landmarks: string[];
  coordinates: { lat: number; lng: number }; // start point
  mapZoom: number;
  trafficSide: 'left' | 'right'; // which side traffic drives on
}

export interface State {
  id: string;
  name: string;
  routes: Route[];
}

export interface Country {
  id: string;
  name: string;
  flag: string;
  trafficSide: 'left' | 'right';
  speedUnit: 'kmh' | 'mph';
  states: State[];
}

export const WORLD_DATA: Country[] = [
  {
    id: 'ng',
    name: 'Nigeria',
    flag: '🇳🇬',
    trafficSide: 'right',
    speedUnit: 'kmh',
    states: [
      {
        id: 'ng-la',
        name: 'Lagos',
        routes: [
          {
            id: 'ng-la-lekki',
            name: 'Lekki-Epe Expressway',
            description: 'Dual carriageway from Victoria Island through Lekki to Epe. High-speed expressway with toll gates.',
            difficulty: 'intermediate',
            type: 'highway',
            speedLimit: 100,
            durationMin: 45,
            distanceKm: 52,
            landmarks: ['Lekki Toll Gate', 'Chevron Roundabout', 'Abraham Adesanya Roundabout', 'Ajah Bridge'],
            coordinates: { lat: 6.4281, lng: 3.4219 },
            mapZoom: 13,
            trafficSide: 'right',
          },
          {
            id: 'ng-la-3rd',
            name: '3rd Mainland Bridge',
            description: 'Iconic bridge connecting Lagos Island to the mainland over Lagos Lagoon.',
            difficulty: 'beginner',
            type: 'highway',
            speedLimit: 80,
            durationMin: 20,
            distanceKm: 11.8,
            landmarks: ['Lagos Island Approach', 'Mid-bridge View', 'Mainland Junction'],
            coordinates: { lat: 6.4698, lng: 3.4004 },
            mapZoom: 13,
            trafficSide: 'right',
          },
          {
            id: 'ng-la-vi',
            name: 'Victoria Island Drive',
            description: 'Urban driving through Lagos business district with roundabouts and traffic lights.',
            difficulty: 'advanced',
            type: 'urban',
            speedLimit: 50,
            durationMin: 30,
            distanceKm: 8,
            landmarks: ['Ozumba Mbadiwe', 'Adeola Odeku', 'Ahmadu Bello Way', 'Bar Beach'],
            coordinates: { lat: 6.4281, lng: 3.4219 },
            mapZoom: 14,
            trafficSide: 'right',
          },
        ],
      },
      {
        id: 'ng-ab',
        name: 'Abuja',
        routes: [
          {
            id: 'ng-ab-airport',
            name: 'Airport Road',
            description: 'Dual carriageway from city centre to Nnamdi Azikiwe International Airport.',
            difficulty: 'beginner',
            type: 'highway',
            speedLimit: 100,
            durationMin: 25,
            distanceKm: 30,
            landmarks: ['Airport Roundabout', 'Murtala Square', 'Eagle Square'],
            coordinates: { lat: 9.0765, lng: 7.3986 },
            mapZoom: 13,
            trafficSide: 'right',
          },
          {
            id: 'ng-ab-kubwa',
            name: 'Kubwa Expressway',
            description: 'Busy expressway connecting Kubwa satellite town to CBD.',
            difficulty: 'intermediate',
            type: 'highway',
            speedLimit: 100,
            durationMin: 35,
            distanceKm: 25,
            landmarks: ['Games Village', 'Gwarinpa', 'Phase 2 Junction'],
            coordinates: { lat: 9.1167, lng: 7.3667 },
            mapZoom: 13,
            trafficSide: 'right',
          },
        ],
      },
      {
        id: 'ng-ri',
        name: 'Rivers',
        routes: [
          {
            id: 'ng-ri-ph',
            name: 'Port Harcourt Ring Road',
            description: 'Urban ring road circling Port Harcourt city with multiple junctions.',
            difficulty: 'intermediate',
            type: 'urban',
            speedLimit: 60,
            durationMin: 40,
            distanceKm: 18,
            landmarks: ['Rumuola Roundabout', 'GRA Junction', 'Mile 1 Market Area'],
            coordinates: { lat: 4.8156, lng: 7.0498 },
            mapZoom: 13,
            trafficSide: 'right',
          },
        ],
      },
    ],
  },
  {
    id: 'gb',
    name: 'United Kingdom',
    flag: '🇬🇧',
    trafficSide: 'left',
    speedUnit: 'mph',
    states: [
      {
        id: 'gb-eng-lon',
        name: 'London',
        routes: [
          {
            id: 'gb-lon-m25',
            name: 'M25 Motorway',
            description: 'London Orbital Motorway — one of busiest in Europe. Multi-lane high-speed driving.',
            difficulty: 'advanced',
            type: 'motorway',
            speedLimit: 70,
            durationMin: 120,
            distanceKm: 188,
            landmarks: ['Dartford Crossing', 'Heathrow Junction', 'M1 Interchange'],
            coordinates: { lat: 51.4545, lng: -0.3782 },
            mapZoom: 11,
            trafficSide: 'left',
          },
          {
            id: 'gb-lon-roundabout',
            name: "Kelly's Kitchen Spiral Roundabout",
            description: 'Multi-lane spiral roundabout — master lane discipline and exit timing.',
            difficulty: 'advanced',
            type: 'roundabout',
            speedLimit: 40,
            durationMin: 10,
            distanceKm: 2,
            landmarks: ['3rd Exit City Centre', 'A4146 Junction', 'Inner Lane Merge'],
            coordinates: { lat: 51.8860, lng: -0.4057 },
            mapZoom: 16,
            trafficSide: 'left',
          },
        ],
      },
      {
        id: 'gb-eng-man',
        name: 'Manchester',
        routes: [
          {
            id: 'gb-man-ring',
            name: 'Manchester Ring Road (A57M)',
            description: 'Urban ring road through Manchester city centre.',
            difficulty: 'intermediate',
            type: 'urban',
            speedLimit: 50,
            durationMin: 30,
            distanceKm: 12,
            landmarks: ['Mancunian Way', 'Princess Parkway', 'Chorlton Flyover'],
            coordinates: { lat: 53.4808, lng: -2.2426 },
            mapZoom: 13,
            trafficSide: 'left',
          },
        ],
      },
    ],
  },
  {
    id: 'us',
    name: 'United States',
    flag: '🇺🇸',
    trafficSide: 'right',
    speedUnit: 'mph',
    states: [
      {
        id: 'us-ca',
        name: 'California',
        routes: [
          {
            id: 'us-ca-101',
            name: 'US-101 Freeway (SF)',
            description: 'San Francisco Bay Area freeway driving with merges and lane changes.',
            difficulty: 'intermediate',
            type: 'highway',
            speedLimit: 65,
            durationMin: 45,
            distanceKm: 50,
            landmarks: ['Golden Gate Bridge', 'Lombard Exit', 'Downtown SF'],
            coordinates: { lat: 37.7749, lng: -122.4194 },
            mapZoom: 12,
            trafficSide: 'right',
          },
          {
            id: 'us-ca-pch',
            name: 'Pacific Coast Highway (PCH)',
            description: 'Scenic coastal highway through Malibu with curves and ocean views.',
            difficulty: 'beginner',
            type: 'highway',
            speedLimit: 55,
            durationMin: 60,
            distanceKm: 65,
            landmarks: ['Malibu Pier', 'Point Dume', 'Santa Monica'],
            coordinates: { lat: 34.0195, lng: -118.4912 },
            mapZoom: 12,
            trafficSide: 'right',
          },
        ],
      },
      {
        id: 'us-ny',
        name: 'New York',
        routes: [
          {
            id: 'us-ny-fdr',
            name: 'FDR Drive Manhattan',
            description: 'Fast-moving highway along East River through Manhattan.',
            difficulty: 'advanced',
            type: 'highway',
            speedLimit: 50,
            durationMin: 30,
            distanceKm: 18,
            landmarks: ['Brooklyn Bridge', '42nd St Exit', 'Harlem River Drive'],
            coordinates: { lat: 40.7128, lng: -74.006 },
            mapZoom: 13,
            trafficSide: 'right',
          },
        ],
      },
      {
        id: 'us-tx',
        name: 'Texas',
        routes: [
          {
            id: 'us-tx-635',
            name: 'LBJ Freeway I-635',
            description: 'Major Dallas highway interchange driving with managed lanes.',
            difficulty: 'intermediate',
            type: 'highway',
            speedLimit: 70,
            durationMin: 40,
            distanceKm: 45,
            landmarks: ['High Five Interchange', 'Preston Rd Exit', 'Galleria Junction'],
            coordinates: { lat: 32.7767, lng: -96.797 },
            mapZoom: 12,
            trafficSide: 'right',
          },
        ],
      },
    ],
  },
  {
    id: 'gh',
    name: 'Ghana',
    flag: '🇬🇭',
    trafficSide: 'right',
    speedUnit: 'kmh',
    states: [
      {
        id: 'gh-ga',
        name: 'Greater Accra',
        routes: [
          {
            id: 'gh-ga-ring',
            name: 'Accra Ring Road Central',
            description: 'Accra\'s main ring road passing through Kwame Nkrumah Circle.',
            difficulty: 'intermediate',
            type: 'urban',
            speedLimit: 60,
            durationMin: 35,
            distanceKm: 15,
            landmarks: ['Kwame Nkrumah Circle', 'Danquah Circle', 'Nima Highway'],
            coordinates: { lat: 5.6037, lng: -0.187 },
            mapZoom: 13,
            trafficSide: 'right',
          },
        ],
      },
    ],
  },
  {
    id: 'za',
    name: 'South Africa',
    flag: '🇿🇦',
    trafficSide: 'left',
    speedUnit: 'kmh',
    states: [
      {
        id: 'za-gp',
        name: 'Gauteng',
        routes: [
          {
            id: 'za-gp-n1',
            name: 'N1 Freeway Johannesburg',
            description: 'Major freeway through Johannesburg with e-toll gantries.',
            difficulty: 'intermediate',
            type: 'motorway',
            speedLimit: 120,
            durationMin: 35,
            distanceKm: 40,
            landmarks: ['Buccleuch Interchange', 'Marlboro Drive', 'Grayston Off-ramp'],
            coordinates: { lat: -26.2041, lng: 28.0473 },
            mapZoom: 12,
            trafficSide: 'left',
          },
        ],
      },
      {
        id: 'za-wc',
        name: 'Western Cape',
        routes: [
          {
            id: 'za-wc-n2',
            name: 'N2 Cape Town to Gordon\'s Bay',
            description: 'Scenic coastal highway with mountain views and gentle curves.',
            difficulty: 'beginner',
            type: 'highway',
            speedLimit: 120,
            durationMin: 40,
            distanceKm: 50,
            landmarks: ['Sir Lowry\'s Pass', 'Strand Beach', 'False Bay View'],
            coordinates: { lat: -34.0522, lng: 18.4735 },
            mapZoom: 12,
            trafficSide: 'left',
          },
        ],
      },
    ],
  },
  {
    id: 'ke',
    name: 'Kenya',
    flag: '🇰🇪',
    trafficSide: 'left',
    speedUnit: 'kmh',
    states: [
      {
        id: 'ke-na',
        name: 'Nairobi',
        routes: [
          {
            id: 'ke-na-thika',
            name: 'Thika Superhighway',
            description: 'Modern 8-lane expressway from Nairobi to Thika town.',
            difficulty: 'intermediate',
            type: 'highway',
            speedLimit: 100,
            durationMin: 45,
            distanceKm: 42,
            landmarks: ['Westlands Interchange', 'Muthaiga Junction', 'Safari Park'],
            coordinates: { lat: -1.2921, lng: 36.8219 },
            mapZoom: 13,
            trafficSide: 'left',
          },
        ],
      },
    ],
  },
  {
    id: 'au',
    name: 'Australia',
    flag: '🇦🇺',
    trafficSide: 'left',
    speedUnit: 'kmh',
    states: [
      {
        id: 'au-nsw',
        name: 'New South Wales',
        routes: [
          {
            id: 'au-nsw-m4',
            name: 'M4 Western Motorway',
            description: 'Sydney\'s main western motorway connecting city to Blue Mountains.',
            difficulty: 'beginner',
            type: 'motorway',
            speedLimit: 110,
            durationMin: 50,
            distanceKm: 60,
            landmarks: ['Parramatta Junction', 'Penrith', 'Blue Mountains Turnoff'],
            coordinates: { lat: -33.8688, lng: 151.2093 },
            mapZoom: 12,
            trafficSide: 'left',
          },
        ],
      },
    ],
  },
  {
    id: 'de',
    name: 'Germany',
    flag: '🇩🇪',
    trafficSide: 'right',
    speedUnit: 'kmh',
    states: [
      {
        id: 'de-by',
        name: 'Bavaria',
        routes: [
          {
            id: 'de-by-autobahn',
            name: 'A9 Autobahn Munich',
            description: 'Famous German motorway with unrestricted speed zones north of Munich.',
            difficulty: 'advanced',
            type: 'motorway',
            speedLimit: 999, // no limit
            durationMin: 60,
            distanceKm: 80,
            landmarks: ['Munich North', 'Ingolstadt Junction', 'Nuremberg Approach'],
            coordinates: { lat: 48.1351, lng: 11.582 },
            mapZoom: 12,
            trafficSide: 'right',
          },
        ],
      },
    ],
  },
];

export function getCountries(): Country[] {
  return WORLD_DATA;
}

export function getCountry(id: string): Country | undefined {
  return WORLD_DATA.find(c => c.id === id);
}

export function getState(countryId: string, stateId: string): State | undefined {
  return getCountry(countryId)?.states.find(s => s.id === stateId);
}

export function getRoute(countryId: string, stateId: string, routeId: string): Route | undefined {
  return getState(countryId, stateId)?.routes.find(r => r.id === routeId);
}

export const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Beginner',     color: 'text-ds-green',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
  intermediate: { label: 'Intermediate', color: 'text-ds-amber',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30' },
  advanced:     { label: 'Advanced',     color: 'text-ds-red',    bg: 'bg-red-500/10',    border: 'border-red-500/30'   },
};

export const TYPE_CONFIG = {
  urban:       { label: 'Urban',       icon: '🏙️' },
  highway:     { label: 'Highway',     icon: '🛣️' },
  rural:       { label: 'Rural',       icon: '🌿' },
  roundabout:  { label: 'Roundabout',  icon: '🔄' },
  motorway:    { label: 'Motorway',    icon: '⚡' },
};
