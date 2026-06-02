export interface MountainPass {
  name: string;
  road: string;
  lat: number;
  lon: number;
  altitude: number; // metres
}

export const MOUNTAIN_PASSES: MountainPass[] = [
  { name: 'Dovregubbe',         road: 'E6',    lat: 62.32, lon: 9.56,  altitude: 1026 },
  { name: 'Filefjell',          road: 'E16',   lat: 61.12, lon: 8.15,  altitude: 1038 },
  { name: 'Hemsedalsfjellet',   road: 'Rv52',  lat: 60.87, lon: 8.47,  altitude: 1434 },
  { name: 'Sognefjellet',       road: 'Rv55',  lat: 61.58, lon: 7.93,  altitude: 1434 },
  { name: 'Aurlandsfjellet',    road: 'Rv243', lat: 60.89, lon: 7.47,  altitude: 1306 },
  { name: 'Valdresflye',        road: 'Rv51',  lat: 61.45, lon: 8.92,  altitude: 1389 },
  { name: 'Hardangervidda',     road: 'Rv7',   lat: 60.35, lon: 7.52,  altitude: 1200 },
  { name: 'Haukelifjellet',     road: 'E134',  lat: 59.85, lon: 7.21,  altitude:  988 },
  { name: 'Imingfjell',         road: 'Rv40',  lat: 60.22, lon: 8.63,  altitude: 1036 },
  { name: 'Strynefjellet',      road: 'Rv15',  lat: 61.88, lon: 7.51,  altitude: 1139 },
  { name: 'Gaularfjellet',      road: 'Rv13',  lat: 61.35, lon: 6.25,  altitude:  655 },
  { name: 'Saltfjellet',        road: 'E6',    lat: 66.65, lon: 15.43, altitude:  686 },
  { name: 'Bjørnfjell',         road: 'E10',   lat: 68.43, lon: 17.65, altitude:  521 },
  { name: 'Kvænangsfjellet',    road: 'E6',    lat: 69.93, lon: 21.55, altitude:  402 },
  { name: 'Sennalandet',        road: 'E6',    lat: 69.98, lon: 24.25, altitude:  380 },
  { name: 'Ifjordfjellet',      road: 'E6',    lat: 70.38, lon: 27.08, altitude:  307 },
  { name: 'Kjølifjellet',       road: 'Rv705', lat: 63.02, lon: 11.45, altitude:  663 },
  { name: 'Varanger',           road: 'E75',   lat: 70.12, lon: 29.05, altitude:  340 },
  { name: 'Vikafjell',          road: 'Rv13',  lat: 60.55, lon: 6.55,  altitude:  692 },
  { name: 'Grotli',             road: 'Rv15',  lat: 61.96, lon: 7.65,  altitude:  870 },
];

export const PASS_VISIBILITY_ALTITUDE = 300; // show passes above this height
