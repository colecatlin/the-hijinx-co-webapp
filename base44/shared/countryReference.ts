/**
 * countryReference.ts — the platform's ONE country and region list.
 *
 * Every country-facing surface reads this module and nothing else:
 *   - the workbook's Ref · Countries and Ref · States tabs, which are generated
 *     from it and whose dropdowns are built from it;
 *   - the import, which accepts only a country and region this list holds;
 *   - the app's own country and region pickers, and the flags rendered beside
 *     a stored country.
 *
 * A country therefore has exactly one spelling on the platform: the `name`.
 * The two-letter code is its identity for flags and for the workbook's named
 * ranges, and historical spellings ('USA', 'UK', 'Czech Republic') resolve
 * through the alias table rather than becoming a second name.
 *
 * Regions are supplied only for the countries the platform actually holds
 * region data for. A country without regions accepts any region text — it is
 * never blocked for want of data we do not have.
 */

export type Country = { name: string; code: string };
export type Region = { name: string; code?: string };

function c(name: string, code: string): Country {
  return { name: name, code: code };
}

/**
 * The full country list. The United States, Canada and Mexico lead it — this is
 * a North American motorsports platform — and the rest follow alphabetically.
 */
export const COUNTRIES: Country[] = [
  c('United States', 'US'),
  c('Canada', 'CA'),
  c('Mexico', 'MX'),
  c('Afghanistan', 'AF'),
  c('Albania', 'AL'),
  c('Algeria', 'DZ'),
  c('Andorra', 'AD'),
  c('Angola', 'AO'),
  c('Antigua and Barbuda', 'AG'),
  c('Argentina', 'AR'),
  c('Armenia', 'AM'),
  c('Australia', 'AU'),
  c('Austria', 'AT'),
  c('Azerbaijan', 'AZ'),
  c('Bahamas', 'BS'),
  c('Bahrain', 'BH'),
  c('Bangladesh', 'BD'),
  c('Barbados', 'BB'),
  c('Belarus', 'BY'),
  c('Belgium', 'BE'),
  c('Belize', 'BZ'),
  c('Benin', 'BJ'),
  c('Bhutan', 'BT'),
  c('Bolivia', 'BO'),
  c('Bosnia and Herzegovina', 'BA'),
  c('Botswana', 'BW'),
  c('Brazil', 'BR'),
  c('Brunei', 'BN'),
  c('Bulgaria', 'BG'),
  c('Burkina Faso', 'BF'),
  c('Burundi', 'BI'),
  c('Cabo Verde', 'CV'),
  c('Cambodia', 'KH'),
  c('Cameroon', 'CM'),
  c('Central African Republic', 'CF'),
  c('Chad', 'TD'),
  c('Chile', 'CL'),
  c('China', 'CN'),
  c('Colombia', 'CO'),
  c('Comoros', 'KM'),
  c('Congo', 'CG'),
  c('Costa Rica', 'CR'),
  c('Croatia', 'HR'),
  c('Cuba', 'CU'),
  c('Cyprus', 'CY'),
  c('Czechia', 'CZ'),
  c('Democratic Republic of the Congo', 'CD'),
  c('Denmark', 'DK'),
  c('Djibouti', 'DJ'),
  c('Dominica', 'DM'),
  c('Dominican Republic', 'DO'),
  c('Ecuador', 'EC'),
  c('Egypt', 'EG'),
  c('El Salvador', 'SV'),
  c('Equatorial Guinea', 'GQ'),
  c('Eritrea', 'ER'),
  c('Estonia', 'EE'),
  c('Eswatini', 'SZ'),
  c('Ethiopia', 'ET'),
  c('Fiji', 'FJ'),
  c('Finland', 'FI'),
  c('France', 'FR'),
  c('Gabon', 'GA'),
  c('Gambia', 'GM'),
  c('Georgia', 'GE'),
  c('Germany', 'DE'),
  c('Ghana', 'GH'),
  c('Greece', 'GR'),
  c('Grenada', 'GD'),
  c('Guatemala', 'GT'),
  c('Guinea', 'GN'),
  c('Guinea-Bissau', 'GW'),
  c('Guyana', 'GY'),
  c('Haiti', 'HT'),
  c('Honduras', 'HN'),
  c('Hong Kong', 'HK'),
  c('Hungary', 'HU'),
  c('Iceland', 'IS'),
  c('India', 'IN'),
  c('Indonesia', 'ID'),
  c('Iran', 'IR'),
  c('Iraq', 'IQ'),
  c('Ireland', 'IE'),
  c('Israel', 'IL'),
  c('Italy', 'IT'),
  c('Ivory Coast', 'CI'),
  c('Jamaica', 'JM'),
  c('Japan', 'JP'),
  c('Jordan', 'JO'),
  c('Kazakhstan', 'KZ'),
  c('Kenya', 'KE'),
  c('Kiribati', 'KI'),
  c('Kosovo', 'XK'),
  c('Kuwait', 'KW'),
  c('Kyrgyzstan', 'KG'),
  c('Laos', 'LA'),
  c('Latvia', 'LV'),
  c('Lebanon', 'LB'),
  c('Lesotho', 'LS'),
  c('Liberia', 'LR'),
  c('Libya', 'LY'),
  c('Liechtenstein', 'LI'),
  c('Lithuania', 'LT'),
  c('Luxembourg', 'LU'),
  c('Macau', 'MO'),
  c('Madagascar', 'MG'),
  c('Malawi', 'MW'),
  c('Malaysia', 'MY'),
  c('Maldives', 'MV'),
  c('Mali', 'ML'),
  c('Malta', 'MT'),
  c('Marshall Islands', 'MH'),
  c('Mauritania', 'MR'),
  c('Mauritius', 'MU'),
  c('Micronesia', 'FM'),
  c('Moldova', 'MD'),
  c('Monaco', 'MC'),
  c('Mongolia', 'MN'),
  c('Montenegro', 'ME'),
  c('Morocco', 'MA'),
  c('Mozambique', 'MZ'),
  c('Myanmar', 'MM'),
  c('Namibia', 'NA'),
  c('Nauru', 'NR'),
  c('Nepal', 'NP'),
  c('Netherlands', 'NL'),
  c('New Zealand', 'NZ'),
  c('Nicaragua', 'NI'),
  c('Niger', 'NE'),
  c('Nigeria', 'NG'),
  c('North Korea', 'KP'),
  c('North Macedonia', 'MK'),
  c('Norway', 'NO'),
  c('Oman', 'OM'),
  c('Pakistan', 'PK'),
  c('Palau', 'PW'),
  c('Palestine', 'PS'),
  c('Panama', 'PA'),
  c('Papua New Guinea', 'PG'),
  c('Paraguay', 'PY'),
  c('Peru', 'PE'),
  c('Philippines', 'PH'),
  c('Poland', 'PL'),
  c('Portugal', 'PT'),
  c('Puerto Rico', 'PR'),
  c('Qatar', 'QA'),
  c('Romania', 'RO'),
  c('Russia', 'RU'),
  c('Rwanda', 'RW'),
  c('Saint Kitts and Nevis', 'KN'),
  c('Saint Lucia', 'LC'),
  c('Saint Vincent and the Grenadines', 'VC'),
  c('Samoa', 'WS'),
  c('San Marino', 'SM'),
  c('Sao Tome and Principe', 'ST'),
  c('Saudi Arabia', 'SA'),
  c('Senegal', 'SN'),
  c('Serbia', 'RS'),
  c('Seychelles', 'SC'),
  c('Sierra Leone', 'SL'),
  c('Singapore', 'SG'),
  c('Slovakia', 'SK'),
  c('Slovenia', 'SI'),
  c('Solomon Islands', 'SB'),
  c('Somalia', 'SO'),
  c('South Africa', 'ZA'),
  c('South Korea', 'KR'),
  c('South Sudan', 'SS'),
  c('Spain', 'ES'),
  c('Sri Lanka', 'LK'),
  c('Sudan', 'SD'),
  c('Suriname', 'SR'),
  c('Sweden', 'SE'),
  c('Switzerland', 'CH'),
  c('Syria', 'SY'),
  c('Taiwan', 'TW'),
  c('Tajikistan', 'TJ'),
  c('Tanzania', 'TZ'),
  c('Thailand', 'TH'),
  c('Timor-Leste', 'TL'),
  c('Togo', 'TG'),
  c('Tonga', 'TO'),
  c('Trinidad and Tobago', 'TT'),
  c('Tunisia', 'TN'),
  c('Turkey', 'TR'),
  c('Turkmenistan', 'TM'),
  c('Tuvalu', 'TV'),
  c('Uganda', 'UG'),
  c('Ukraine', 'UA'),
  c('United Arab Emirates', 'AE'),
  c('United Kingdom', 'GB'),
  c('Uruguay', 'UY'),
  c('Uzbekistan', 'UZ'),
  c('Vanuatu', 'VU'),
  c('Vatican City', 'VA'),
  c('Venezuela', 'VE'),
  c('Vietnam', 'VN'),
  c('Yemen', 'YE'),
  c('Zambia', 'ZM'),
  c('Zimbabwe', 'ZW'),
];

/** US states carry their two-letter code: the app's own forms store that form. */
const US_REGIONS: Region[] = [
  { name: 'Alabama', code: 'AL' }, { name: 'Alaska', code: 'AK' },
  { name: 'Arizona', code: 'AZ' }, { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' }, { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' }, { name: 'Delaware', code: 'DE' },
  { name: 'District of Columbia', code: 'DC' }, { name: 'Florida', code: 'FL' },
  { name: 'Georgia', code: 'GA' }, { name: 'Hawaii', code: 'HI' },
  { name: 'Idaho', code: 'ID' }, { name: 'Illinois', code: 'IL' },
  { name: 'Indiana', code: 'IN' }, { name: 'Iowa', code: 'IA' },
  { name: 'Kansas', code: 'KS' }, { name: 'Kentucky', code: 'KY' },
  { name: 'Louisiana', code: 'LA' }, { name: 'Maine', code: 'ME' },
  { name: 'Maryland', code: 'MD' }, { name: 'Massachusetts', code: 'MA' },
  { name: 'Michigan', code: 'MI' }, { name: 'Minnesota', code: 'MN' },
  { name: 'Mississippi', code: 'MS' }, { name: 'Missouri', code: 'MO' },
  { name: 'Montana', code: 'MT' }, { name: 'Nebraska', code: 'NE' },
  { name: 'Nevada', code: 'NV' }, { name: 'New Hampshire', code: 'NH' },
  { name: 'New Jersey', code: 'NJ' }, { name: 'New Mexico', code: 'NM' },
  { name: 'New York', code: 'NY' }, { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota', code: 'ND' }, { name: 'Ohio', code: 'OH' },
  { name: 'Oklahoma', code: 'OK' }, { name: 'Oregon', code: 'OR' },
  { name: 'Pennsylvania', code: 'PA' }, { name: 'Rhode Island', code: 'RI' },
  { name: 'South Carolina', code: 'SC' }, { name: 'South Dakota', code: 'SD' },
  { name: 'Tennessee', code: 'TN' }, { name: 'Texas', code: 'TX' },
  { name: 'Utah', code: 'UT' }, { name: 'Vermont', code: 'VT' },
  { name: 'Virginia', code: 'VA' }, { name: 'Washington', code: 'WA' },
  { name: 'West Virginia', code: 'WV' }, { name: 'Wisconsin', code: 'WI' },
  { name: 'Wyoming', code: 'WY' },
];

function r(...names: string[]): Region[] {
  return names.map(function (name) { return { name: name }; });
}

/**
 * Regions, keyed by the country's canonical name. Only countries the platform
 * holds region data for appear here — the band row of the workbook's States tab
 * and the app's guided region lists are both built from this map.
 */
export const REGIONS_BY_COUNTRY: Record<string, Region[]> = {
  'United States': US_REGIONS,
  'Canada': r('Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'),
  'Mexico': r('Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Mexico City', 'Mexico State', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'),
  'United Kingdom': r('England', 'Scotland', 'Wales', 'Northern Ireland'),
  'Australia': r('New South Wales', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia', 'Australian Capital Territory', 'Northern Territory'),
  'Brazil': r('Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'),
  'France': r('Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany', 'Centre-Val de Loire', 'Corsica', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandy', 'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur'),
  'Germany': r('Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'),
  'Italy': r('Abruzzo', 'Aosta Valley', 'Apulia', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardy', 'Marche', 'Molise', 'Piedmont', 'Sardinia', 'Sicily', 'Tuscany', 'Trentino-Alto Adige', 'Umbria', 'Veneto'),
  'Spain': r('Andalusia', 'Aragon', 'Asturias', 'Balearic Islands', 'Basque Country', 'Canary Islands', 'Cantabria', 'Castile and León', 'Castile-La Mancha', 'Catalonia', 'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia', 'Navarre', 'Valencia'),
  'Japan': r('Aichi', 'Akita', 'Aomori', 'Chiba', 'Ehime', 'Fukui', 'Fukuoka', 'Fukushima', 'Gifu', 'Gunma', 'Hiroshima', 'Hokkaido', 'Hyogo', 'Ibaraki', 'Ishikawa', 'Iwate', 'Kagawa', 'Kagoshima', 'Kanagawa', 'Kochi', 'Kumamoto', 'Kyoto', 'Mie', 'Miyagi', 'Miyazaki', 'Nagano', 'Nagasaki', 'Nara', 'Niigata', 'Okinawa', 'Osaka', 'Saga', 'Saitama', 'Shiga', 'Shimane', 'Shizuoka', 'Tochigi', 'Tokushima', 'Tokyo', 'Tottori', 'Toyama', 'Wakayama', 'Yamagata', 'Yamaguchi', 'Yamanashi'),
  'China': r('Anhui', 'Beijing', 'Chongqing', 'Fujian', 'Gansu', 'Guangdong', 'Guangxi', 'Guizhou', 'Hainan', 'Hebei', 'Heilongjiang', 'Henan', 'Hong Kong', 'Hubei', 'Hunan', 'Inner Mongolia', 'Jiangsu', 'Jiangxi', 'Jilin', 'Liaoning', 'Macao', 'Ningxia', 'Qinghai', 'Shaanxi', 'Shandong', 'Shanghai', 'Shanxi', 'Sichuan', 'Taiwan', 'Tianjin', 'Tibet', 'Xinjiang', 'Yunnan', 'Zhejiang'),
  'India': r('Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'),
  'Russia': r('Adygea', 'Altai', 'Amur', 'Arkhangelsk', 'Astrakhan', 'Bashkortostan', 'Belgorod', 'Bryansk', 'Buryatia', 'Chechnya', 'Chelyabinsk', 'Chukotka', 'Chuvashia', 'Dagestan', 'Irkutsk', 'Ivanovo', 'Jewish Autonomous Oblast', 'Kabardino-Balkaria', 'Kaliningrad', 'Kalmykia', 'Kaluga', 'Kamchatka', 'Karachay-Cherkessia', 'Karelia', 'Kemerovo', 'Khabarovsk', 'Khakassia', 'Khanty-Mansiysk', 'Kirov', 'Komi', 'Kostroma', 'Krasnodar', 'Krasnoyarsk', 'Kurgan', 'Kursk', 'Leningrad', 'Lipetsk', 'Magadan', 'Mariy El', 'Mordovia', 'Moscow', 'Moscow Oblast', 'Murmansk', 'Nenets', 'Nizhny Novgorod', 'Novgorod', 'Novosibirsk', 'Omsk', 'Orel', 'Orenburg', 'Penza', 'Perm', 'Primorsky', 'Pskov', 'Ryazan', 'Saint Petersburg', 'Sakha', 'Sakhalin', 'Samara', 'Saratov', 'Smolensk', 'Stavropol', 'Sverdlovsk', 'Tambov', 'Tatarstan', 'Tula', 'Tuva', 'Tver', 'Tyumen', 'Udmurtia', 'Ulyanovsk', 'Vladimir', 'Volgograd', 'Vologda', 'Voronezh', 'Yaroslavl', 'Zabaykalsky'),
  'Sweden': r('Blekinge', 'Dalarna', 'Gävleborg', 'Gotland', 'Halland', 'Jämtland', 'Jönköping', 'Kalmar', 'Kronoberg', 'Norrbotten', 'Örebro', 'Östergötland', 'Skåne', 'Södermanland', 'Stockholm', 'Uppsala', 'Värmland', 'Västerbotten', 'Västernorrland', 'Västmanland', 'Västra Götaland'),
  'Norway': r('Akershus', 'Aust-Agder', 'Buskerud', 'Finnmark', 'Hedmark', 'Hordaland', 'Møre og Romsdal', 'Nordland', 'Nord-Trøndelag', 'Oppland', 'Oslo', 'Rogaland', 'Sogn og Fjordane', 'Sør-Trøndelag', 'Telemark', 'Troms', 'Vest-Agder', 'Vestfold'),
  'Finland': r('Åland Islands', 'Central Finland', 'Central Ostrobothnia', 'Häme', 'Kainuu', 'Kymenlaakso', 'Lapland', 'North Karelia', 'Northern Ostrobothnia', 'Northern Savonia', 'Ostrobothnia', 'Päijät-Häme', 'Pirkanmaa', 'Satakunta', 'South Karelia', 'Southern Ostrobothnia', 'Southern Savonia', 'Tavastia Proper', 'Uusimaa'),
  'Netherlands': r('Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limbourg', 'North Brabant', 'North Holland', 'Overijssel', 'South Holland', 'Utrecht'),
  'Belgium': r('Antwerp', 'Brussels', 'East Flanders', 'Flemish Brabant', 'Hainaut', 'Liège', 'Limburg', 'Luxembourg', 'Namur', 'Walloon Brabant', 'West Flanders'),
  'Austria': r('Burgenland', 'Carinthia', 'Lower Austria', 'Salzburg', 'Styria', 'Tirol', 'Upper Austria', 'Vienna', 'Vorarlberg'),
  'Switzerland': r('Aargau', 'Appenzell Ausserrhoden', 'Appenzell Innerrhoden', 'Basel-Landschaft', 'Basel-Stadt', 'Bern', 'Fribourg', 'Geneva', 'Glarus', 'Graubünden', 'Jura', 'Lucerne', 'Neuchâtel', 'Nidwalden', 'Obwalden', 'St. Gallen', 'Schaffhausen', 'Schwyz', 'Solothurn', 'Thurgau', 'Ticino', 'Uri', 'Valais', 'Vaud', 'Zug', 'Zurich'),
  'Denmark': r('Capital Region', 'Central Denmark', 'North Denmark', 'Southern Denmark', 'Zealand'),
  'Poland': r('Greater Poland', 'Holy Cross', 'Kuyavian-Pomeranian', 'Lesser Poland', 'Lodz', 'Lower Silesian', 'Masovian', 'Opole', 'Podlaskie', 'Pomeranian', 'Silesian', 'Subcarpathian', 'Warm-Masurian', 'West Pomeranian'),
  'Argentina': r('Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'),
  'Chile': r('Arica and Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso', 'Metropolitan', 'O\'Higgins', 'Maule', 'Ñuble', 'Biobío', 'Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'),
  'New Zealand': r('Auckland', 'Bay of Plenty', 'Canterbury', 'Gisborne', 'Hawke\'s Bay', 'Manawatu-Wanganui', 'Marlborough', 'Nelson', 'Northland', 'Otago', 'Southland', 'Taranaki', 'Tasman', 'Waikato', 'Wairarapa', 'Wellington', 'West Coast'),
  'South Africa': r('Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'),
};

/** Spellings that mean a country the list already holds. Never a second name. */
export const COUNTRY_ALIASES: Record<string, string> = {
  'usa': 'US', 'us': 'US', 'u.s.': 'US', 'u.s.a.': 'US', 'united states of america': 'US', 'america': 'US',
  'uk': 'GB', 'u.k.': 'GB', 'great britain': 'GB', 'britain': 'GB',
  'uae': 'AE', 'emirates': 'AE',
  'holland': 'NL', 'the netherlands': 'NL',
  'czech republic': 'CZ',
  'cote d\'ivoire': 'CI', 'côte d\'ivoire': 'CI',
  'türkiye': 'TR',
  'korea': 'KR', 'republic of korea': 'KR',
  'russian federation': 'RU',
  'macedonia': 'MK',
  'burma': 'MM',
  'swaziland': 'SZ',
  'cape verde': 'CV',
  'vatican': 'VA', 'holy see': 'VA',
  'drc': 'CD', 'dr congo': 'CD', 'congo kinshasa': 'CD',
  'republic of the congo': 'CG', 'congo brazzaville': 'CG',
  'sao tome': 'ST',
  'east timor': 'TL',
  'bolivia (plurinational state of)': 'BO',
  'venezuela (bolivarian republic of)': 'VE',
  'united mexican states': 'MX',
  'deutschland': 'DE',
  'espana': 'ES', 'españa': 'ES',
  'brasil': 'BR',
  'great britain and northern ireland': 'GB',
};

// ════════════════════════════════════════════════════════════════════
// Derived lookups
// ════════════════════════════════════════════════════════════════════

const BY_CODE: Record<string, Country> = {};
const BY_NAME: Record<string, Country> = {};
COUNTRIES.forEach(function (country) {
  BY_CODE[country.code] = country;
  BY_NAME[country.name.toLowerCase()] = country;
});

/** Every country name, in dropdown order. */
export const COUNTRY_NAMES: string[] = COUNTRIES.map(function (country) { return country.name; });

/** The countries holding regions, in the workbook band's order. */
export const REGION_COUNTRY_NAMES: string[] = COUNTRY_NAMES.filter(function (name) {
  return REGIONS_BY_COUNTRY[name] !== undefined;
});

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Resolve any accepted spelling to the country record, or null. */
export function resolveCountry(value: unknown): Country | null {
  const raw = text(value);
  if (!raw) return null;
  const byName = BY_NAME[raw.toLowerCase()];
  if (byName) return byName;
  const byCode = BY_CODE[raw.toUpperCase()];
  if (byCode) return byCode;
  const aliasCode = COUNTRY_ALIASES[raw.toLowerCase()];
  if (aliasCode) return BY_CODE[aliasCode] || null;
  return null;
}

/** The one spelling of a country. Null when the list does not hold it. */
export function canonicalCountryName(value: unknown): string | null {
  const country = resolveCountry(value);
  return country ? country.name : null;
}

/** Two-letter flag code, lowercase, for any accepted spelling. */
export function flagCode(value: unknown): string | null {
  const country = resolveCountry(value);
  return country ? country.code.toLowerCase() : null;
}

export function flagUrl(value: unknown, width?: number): string | null {
  const code = flagCode(value);
  if (!code) return null;
  return 'https://flagcdn.com/w' + (width || 160) + '/' + code + '.png';
}

/** The regions held for a country, or null when we hold none. */
export function regionsFor(value: unknown): Region[] | null {
  const country = resolveCountry(value);
  if (!country) return null;
  const regions = REGIONS_BY_COUNTRY[country.name];
  return regions && regions.length > 0 ? regions : null;
}

export function regionNames(value: unknown): string[] {
  const regions = regionsFor(value);
  return regions ? regions.map(function (region) { return region.name; }) : [];
}

/** The workbook's named range for one country's regions, e.g. states_US. */
export function statesRangeName(countryCode: string): string {
  return 'states_' + String(countryCode || '').toUpperCase();
}

/**
 * Judge one row's country/region pair. Returns the canonical spelling of both
 * plus the reason a row cannot be imported, if there is one:
 *   - a country the list does not hold;
 *   - a region that is not one of that country's regions.
 * A country we hold no regions for accepts any region text.
 */
export function checkLocationPair(countryValue: unknown, stateValue: unknown): {
  ok: boolean; country: string; state: string; reason: string; field: 'country' | 'state' | '';
} {
  const rawCountry = text(countryValue);
  const rawState = text(stateValue);

  if (!rawCountry) return { ok: true, country: '', state: rawState, reason: '', field: '' };

  const country = resolveCountry(rawCountry);
  if (!country) {
    return {
      ok: false, country: rawCountry, state: rawState, field: 'country',
      reason: '"' + rawCountry + '" is not a country the platform holds.',
    };
  }

  const regions = regionsFor(country.name);
  if (!rawState || !regions) {
    return { ok: true, country: country.name, state: rawState, reason: '', field: '' };
  }

  const wanted = rawState.toLowerCase();
  const match = regions.find(function (region) {
    return region.name.toLowerCase() === wanted || (region.code || '').toLowerCase() === wanted;
  });
  if (!match) {
    return {
      ok: false, country: country.name, state: rawState, field: 'state',
      reason: '"' + rawState + '" is not a region of ' + country.name + '.',
    };
  }

  return { ok: true, country: country.name, state: match.name, reason: '', field: '' };
}