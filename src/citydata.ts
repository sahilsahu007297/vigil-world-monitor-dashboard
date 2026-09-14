// Major cities and regions with strategic importance
export type CityMarker = {
  name: string;
  country: string;
  lon: number;
  lat: number;
  population: string;
  significance: string;
};

export const majorCities: CityMarker[] = [
  // United States
  { name: "New York", country: "United States", lon: -74.01, lat: 40.71, population: "8.3M", significance: "Financial hub, media center" },
  { name: "Los Angeles", country: "United States", lon: -118.24, lat: 34.05, population: "3.9M", significance: "Entertainment, ports" },
  { name: "Chicago", country: "United States", lon: -87.63, lat: 41.88, population: "2.7M", significance: "Transport hub" },
  { name: "Houston", country: "United States", lon: -95.37, lat: 29.76, population: "2.3M", significance: "Energy center" },
  { name: "Washington D.C.", country: "United States", lon: -77.04, lat: 38.91, population: "0.7M", significance: "Political capital" },
  { name: "San Francisco", country: "United States", lon: -122.42, lat: 37.77, population: "0.9M", significance: "Tech hub" },
  { name: "Seattle", country: "United States", lon: -122.33, lat: 47.61, population: "0.7M", significance: "Tech/ports" },
  { name: "Miami", country: "United States", lon: -80.19, lat: 25.76, population: "0.5M", significance: "Gateway to Americas" },

  // India
  { name: "Delhi", country: "India", lon: 77.23, lat: 28.61, population: "32M", significance: "Capital, political center" },
  { name: "Mumbai", country: "India", lon: 72.88, lat: 19.08, population: "20M", significance: "Financial hub, ports" },
  { name: "Bangalore", country: "India", lon: 77.59, lat: 12.97, population: "8.4M", significance: "Tech hub" },
  { name: "Kolkata", country: "India", lon: 88.37, lat: 22.57, population: "14M", significance: "Eastern hub" },
  { name: "Chennai", country: "India", lon: 80.28, lat: 13.05, population: "7M", significance: "Southern port" },
  { name: "Hyderabad", country: "India", lon: 78.48, lat: 17.39, population: "7M", significance: "Tech center" },
  { name: "Pune", country: "India", lon: 73.85, lat: 18.52, population: "6.4M", significance: "Industrial hub" },
  { name: "Ahmedabad", country: "India", lon: 72.63, lat: 23.03, population: "8.5M", significance: "Western hub" },

  // China
  { name: "Beijing", country: "China", lon: 116.41, lat: 39.90, population: "21M", significance: "Political capital" },
  { name: "Shanghai", country: "China", lon: 121.47, lat: 31.23, population: "27M", significance: "Financial hub, ports" },
  { name: "Shenzhen", country: "China", lon: 114.07, lat: 22.54, population: "12M", significance: "Tech hub, ports" },
  { name: "Guangzhou", country: "China", lon: 113.26, lat: 23.13, population: "15M", significance: "Trade center" },
  { name: "Chongqing", country: "China", lon: 106.55, lat: 29.56, population: "32M", significance: "Interior hub" },
  { name: "Xi'an", country: "China", lon: 108.95, lat: 34.27, population: "13M", significance: "Central hub" },
  { name: "Hangzhou", country: "China", lon: 120.16, lat: 30.27, population: "12M", significance: "Tech center" },
  { name: "Nanjing", country: "China", lon: 118.80, lat: 32.06, population: "8.3M", significance: "Eastern hub" },

  // Europe
  { name: "London", country: "United Kingdom", lon: -0.13, lat: 51.51, population: "9M", significance: "Financial hub" },
  { name: "Paris", country: "France", lon: 2.35, lat: 48.86, population: "2.2M", significance: "Political/cultural center" },
  { name: "Berlin", country: "Germany", lon: 13.41, lat: 52.52, population: "3.6M", significance: "Political capital" },
  { name: "Moscow", country: "Russia", lon: 37.62, lat: 55.75, population: "12M", significance: "Political capital" },
  { name: "Rome", country: "Italy", lon: 12.50, lat: 41.90, population: "2.9M", significance: "Historical center" },
  { name: "Madrid", country: "Spain", lon: -3.70, lat: 40.42, population: "3.3M", significance: "Political capital" },
  { name: "Amsterdam", country: "Netherlands", lon: 4.90, lat: 52.37, population: "2.4M", significance: "Trade hub" },
  { name: "Brussels", country: "Belgium", lon: 4.36, lat: 50.85, population: "1.2M", significance: "EU hub" },

  // Middle East
  { name: "Dubai", country: "UAE", lon: 55.27, lat: 25.20, population: "3.6M", significance: "Trade & finance" },
  { name: "Tehran", country: "Iran", lon: 51.39, lat: 35.69, population: "8.7M", significance: "Political capital" },
  { name: "Baghdad", country: "Iraq", lon: 44.36, lat: 33.31, population: "7.6M", significance: "Political capital" },
  { name: "Damascus", country: "Syria", lon: 36.28, lat: 33.51, population: "2M", significance: "Political capital" },
  { name: "Jerusalem", country: "Israel", lon: 35.23, lat: 31.77, population: "1M", significance: "Political capital" },
  { name: "Cairo", country: "Egypt", lon: 31.25, lat: 30.04, population: "20M", significance: "Largest city, hub" },
  { name: "Istanbul", country: "Turkey", lon: 28.98, lat: 41.01, population: "15M", significance: "Bridge between continents" },

  // Africa
  { name: "Johannesburg", country: "South Africa", lon: 28.04, lat: -26.20, population: "5.7M", significance: "Economic hub" },
  { name: "Lagos", country: "Nigeria", lon: 3.34, lat: 6.45, population: "14M", significance: "West Africa hub" },
  { name: "Nairobi", country: "Kenya", lon: 36.82, lat: -1.29, population: "4.4M", significance: "East Africa hub" },
  { name: "Addis Ababa", country: "Ethiopia", lon: 38.75, lat: 9.03, population: "4.1M", significance: "Regional center" },
  { name: "Khartoum", country: "Sudan", lon: 32.53, lat: 15.50, population: "5M", significance: "Political capital" },

  // South America
  { name: "São Paulo", country: "Brazil", lon: -46.62, lat: -23.55, population: "12M", significance: "Economic center" },
  { name: "Rio de Janeiro", country: "Brazil", lon: -43.17, lat: -22.91, population: "6.7M", significance: "Major port" },
  { name: "Buenos Aires", country: "Argentina", lon: -58.38, lat: -34.61, population: "15M", significance: "Political capital" },
  { name: "Lima", country: "Peru", lon: -77.04, lat: -12.05, population: "9.7M", significance: "Political capital" },
  { name: "Bogotá", country: "Colombia", lon: -74.08, lat: 4.71, population: "8M", significance: "Andean center" },

  // Asia-Pacific
  { name: "Tokyo", country: "Japan", lon: 139.69, lat: 35.68, population: "37M", significance: "Political/economic hub" },
  { name: "Seoul", country: "South Korea", lon: 126.98, lat: 37.57, population: "25M", significance: "Political capital" },
  { name: "Singapore", country: "Singapore", lon: 103.85, lat: 1.35, population: "5.7M", significance: "Trade hub" },
  { name: "Bangkok", country: "Thailand", lon: 100.50, lat: 13.73, population: "10M", significance: "Regional hub" },
  { name: "Manila", country: "Philippines", lon: 121.03, lat: 14.60, population: "1.9M", significance: "Political capital" },
  { name: "Ho Chi Minh City", country: "Vietnam", lon: 106.70, lat: 10.77, population: "9M", significance: "Economic hub" },
  { name: "Sydney", country: "Australia", lon: 151.21, lat: -33.87, population: "5.3M", significance: "Major port" },
  { name: "Melbourne", country: "Australia", lon: 144.96, lat: -37.81, population: "4.9M", significance: "Economic hub" },
];

// Country centers for zoom functionality
export const countryInfo: Record<string, { center: [number, number]; radius: number; cities: string[] }> = {
  "United States": {
    center: [-95.7129, 37.0902],
    radius: 25,
    cities: ["New York", "Los Angeles", "Chicago", "Washington D.C.", "San Francisco"],
  },
  India: {
    center: [78.9629, 20.5937],
    radius: 20,
    cities: ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata"],
  },
  China: {
    center: [104.1954, 35.8617],
    radius: 22,
    cities: ["Beijing", "Shanghai", "Shenzhen", "Chongqing", "Xi'an"],
  },
  "United Kingdom": {
    center: [-2.5, 55.5],
    radius: 8,
    cities: ["London"],
  },
  France: {
    center: [2.2137, 46.2276],
    radius: 10,
    cities: ["Paris"],
  },
  Germany: {
    center: [10.4515, 51.1657],
    radius: 10,
    cities: ["Berlin"],
  },
  Russia: {
    center: [105.3188, 61.524],
    radius: 50,
    cities: ["Moscow"],
  },
  Japan: {
    center: [138.2529, 36.2048],
    radius: 12,
    cities: ["Tokyo"],
  },
  "South Korea": {
    center: [127.7669, 35.9078],
    radius: 8,
    cities: ["Seoul"],
  },
  Brazil: {
    center: [-51.9253, -14.2350],
    radius: 20,
    cities: ["São Paulo", "Rio de Janeiro"],
  },
};
