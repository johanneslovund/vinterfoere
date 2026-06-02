import { GridPoint } from '../types/weather';

// ~70 hand-validated points covering Norwegian mainland and major islands.
// Filtered to exclude open ocean and Svalbard.
export const NORWAY_GRID: GridPoint[] = [
  // Sørlandet / Vest-Agder
  { lat: 58.2, lon: 7.0, name: 'Farsund' },
  { lat: 58.2, lon: 8.1, name: 'Kristiansand' },
  { lat: 58.5, lon: 9.0, name: 'Arendal' },
  { lat: 59.1, lon: 10.0, name: 'Larvik' },

  // Østlandet
  { lat: 59.7, lon: 10.7, name: 'Oslo' },
  { lat: 59.9, lon: 11.0, name: 'Lillestrøm' },
  { lat: 60.2, lon: 11.1, name: 'Eidsvoll' },
  { lat: 60.8, lon: 11.0, name: 'Hamar' },
  { lat: 61.1, lon: 10.5, name: 'Gjøvik' },
  { lat: 60.6, lon: 8.8, name: 'Numedal' },
  { lat: 59.4, lon: 10.5, name: 'Moss' },
  { lat: 59.7, lon: 9.6, name: 'Kongsberg' },
  { lat: 60.1, lon: 9.6, name: 'Numedal nord' },
  { lat: 61.1, lon: 11.5, name: 'Elverum' },
  { lat: 61.5, lon: 11.0, name: 'Rena' },
  { lat: 62.0, lon: 10.7, name: 'Trysil' },

  // Telemark / Grenland
  { lat: 59.2, lon: 9.6, name: 'Notodden' },
  { lat: 59.4, lon: 8.7, name: 'Kviteseid' },

  // Vestfold
  { lat: 59.3, lon: 10.4, name: 'Tønsberg' },
  { lat: 59.1, lon: 10.2, name: 'Sandefjord' },

  // Vestland / Hordaland
  { lat: 60.4, lon: 5.3, name: 'Bergen' },
  { lat: 60.6, lon: 6.3, name: 'Voss' },
  { lat: 60.1, lon: 6.0, name: 'Odda' },
  { lat: 61.2, lon: 5.8, name: 'Sogndal' },
  { lat: 61.5, lon: 6.5, name: 'Skjolden' },
  { lat: 61.9, lon: 5.5, name: 'Florø' },
  { lat: 61.6, lon: 7.5, name: 'Stryn' },

  // Møre og Romsdal
  { lat: 62.5, lon: 6.1, name: 'Ålesund' },
  { lat: 62.7, lon: 7.7, name: 'Åndalsnes' },
  { lat: 62.9, lon: 8.5, name: 'Sunndalsøra' },
  { lat: 63.1, lon: 7.0, name: 'Molde' },

  // Rogaland
  { lat: 58.9, lon: 5.7, name: 'Stavanger' },
  { lat: 59.3, lon: 6.5, name: 'Sauda' },
  { lat: 59.6, lon: 6.3, name: 'Sand' },

  // Innlandet / fjellheimen
  { lat: 61.9, lon: 8.5, name: 'Lom' },
  { lat: 61.5, lon: 8.7, name: 'Jotunheimen' },
  { lat: 62.4, lon: 9.5, name: 'Oppdal' },
  { lat: 61.9, lon: 10.0, name: 'Folldal' },
  { lat: 62.6, lon: 10.7, name: 'Røros' },
  { lat: 61.4, lon: 9.5, name: 'Vinstra' },

  // Trøndelag
  { lat: 63.4, lon: 10.4, name: 'Trondheim' },
  { lat: 63.1, lon: 10.3, name: 'Melhus' },
  { lat: 63.8, lon: 11.5, name: 'Stjørdal' },
  { lat: 64.5, lon: 11.5, name: 'Steinkjer' },
  { lat: 64.0, lon: 13.5, name: 'Røyrvik' },
  { lat: 63.5, lon: 13.0, name: 'Meråker' },

  // Nordland
  { lat: 65.5, lon: 13.5, name: 'Mosjøen' },
  { lat: 66.3, lon: 14.2, name: 'Mo i Rana' },
  { lat: 67.3, lon: 14.5, name: 'Bodø' },
  { lat: 68.1, lon: 14.2, name: 'Fauske' },
  { lat: 68.4, lon: 17.4, name: 'Narvik' },
  { lat: 65.9, lon: 12.2, name: 'Brønnøysund' },
  { lat: 66.9, lon: 13.6, name: 'Korgen' },

  // Troms
  { lat: 69.7, lon: 18.9, name: 'Tromsø' },
  { lat: 69.2, lon: 18.0, name: 'Sørreisa' },
  { lat: 69.5, lon: 20.5, name: 'Nordreisa' },
  { lat: 68.8, lon: 16.5, name: 'Evenes' },

  // Finnmark
  { lat: 70.0, lon: 25.0, name: 'Alta' },
  { lat: 70.7, lon: 28.9, name: 'Vadsø' },
  { lat: 71.0, lon: 28.0, name: 'Lakselv' },
  { lat: 70.5, lon: 22.0, name: 'Lyngen' },
  { lat: 69.9, lon: 27.0, name: 'Tana' },
  { lat: 70.4, lon: 31.0, name: 'Kirkenes' },

  // Lofoten / Vesterålen
  { lat: 68.2, lon: 14.0, name: 'Lofoten' },
  { lat: 68.6, lon: 15.5, name: 'Svolvær' },
  { lat: 68.9, lon: 15.5, name: 'Sortland' },
];
