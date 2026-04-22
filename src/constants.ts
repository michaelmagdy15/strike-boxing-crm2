export const PACKAGES = [
  { name: '10 Session PT', sessions: 10, price: 5700, expiryDays: 35 },
  { name: '20 Session PT', sessions: 20, price: 9700, expiryDays: 70 },
  { name: '10S GT Kids', sessions: 10, price: 2000, expiryDays: 35 },
  { name: '20S GT Kids', sessions: 20, price: 3150, expiryDays: 70 },
  { name: '30S GT Kids', sessions: 30, price: 3950, expiryDays: 90 },
  { name: '10 Session GT', sessions: 10, price: 2600, expiryDays: 35 },
  { name: '20 Session GT', sessions: 20, price: 4150, expiryDays: 70 },
  { name: '30 Session GT', sessions: 30, price: 5600, expiryDays: 90 },
];

export const SALES_MEMBERS = [
  'Atef Strike',
  'Youssef Emad',
  'Hassan Tarek',
  'Maison Mohamed',
  'Mustafa Mahmoud',
  'Omar Ehab'
];

export const SALES_NAME_MAPPING: Record<string, string> = {
  'Atef': 'Atef Strike',
  'Atef Strike': 'Atef Strike',
  'EL GOO': 'Youssef Emad',
  'El Goo': 'Youssef Emad',
  'el goo': 'Youssef Emad',
  'Maisoon': 'Maison Mohamed',
  'Maison': 'Maison Mohamed',
  'Maison Mohmed': 'Maison Mohamed',
  'Mustafa': 'Mustafa Mahmoud',
  'Mustafa Mahmoud': 'Mustafa Mahmoud',
  'Hassan Tarek': 'Hassan Tarek',
  'Omar Ehab': 'Omar Ehab',
  'Youssef': 'Youssef Emad',
  'Youssef Emad': 'Youssef Emad',
  'Abdallah Atef': 'Abdallah Atef',
  'Omar Sherif': 'Omar Sherif',
  'Salma Ahmed': 'Salma Ahmed',
};
