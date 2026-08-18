export interface CityOption {
  value: string;
  label: string;
  areas: string[];
}

export const libyanCities: CityOption[] = [
  {
    value: 'tripoli',
    label: 'طرابلس',
    areas: [
      'تاجوراء', 'عين زارة', 'أبو سليم', 'سوق الجمعة', 'جنزور', 'طريق الشوك',
      'دمشق', 'حي الأندلس', 'وسط المدينة', 'بن عاشور', 'زاوية الدهماني',
      'سيدي المصري', 'السراج', 'قصر بن غشير', 'سوق الخميس', 'الحضبة',
      'صلاح الدين', 'الفشلوم', 'الظهرة', 'باب بن غشير', 'الهضبة الخضراء',
      'شارع الرشيد', 'شارع السكة', 'المهاري', 'قصر هوب', 'السراي الحمراء',
    ],
  },
  { value: 'banghazi', label: 'بنغازي', areas: ['السياني', 'الحديقة', 'الفويهات', 'ليثي', 'سواني الحمري', 'بنينة', 'قار يونس', 'سلمان'] },
  { value: 'misrata', label: 'مصراتة', areas: ['المركز', 'قصر أحمد', 'كراريم', 'الزروق', 'بئر الأشهب', 'تاميمي'] },
  { value: 'zawia', label: 'الزاوية', areas: ['المركز', 'صبراتة', 'صرمان', 'جميل', 'رقدالين'] },
  { value: 'sabha', label: 'سبها', areas: ['المركز', 'المنشية', 'الحضارة', 'الغردقة', 'الزيدية'] },
  { value: 'zliten', label: 'زليتن', areas: ['المركز', 'مسلاتة', 'العزيزية', 'بئر الغنم'] },
  { value: 'khoms', label: 'الخمس', areas: ['المركز', 'لبدة', 'صياد', 'الجوشي'] },
  { value: 'zintan', label: 'الزنتان', areas: ['المركز', 'الرجبان', 'ككلة'] },
  { value: 'derna', label: 'درنة', areas: ['المركز', 'الشيحة', 'باب طبرق', 'فوات'] },
  { value: 'tobruk', label: 'طبرق', areas: ['المركز', 'الزويتينة', 'برقة'] },
  { value: 'gharyan', label: 'غريان', areas: ['المركز', 'الرصيعة', 'ككلة', 'تغرنة'] },
  { value: 'surt', label: 'سرت', areas: ['المركز', 'الجديدة', 'القذافية', 'بوحادي'] },
  { value: 'bani_walid', label: 'بني وليد', areas: ['المركز'] },
  { value: 'ajdabiya', label: 'اجدابيا', areas: ['المركز', 'البريقة', 'زوية'] },
  { value: 'other', label: 'أخرى', areas: [] },
];

export function cityLabel(value: string): string {
  return libyanCities.find((c) => c.value === value)?.label ?? value;
}

export function cityAreas(value: string): string[] {
  return libyanCities.find((c) => c.value === value)?.areas ?? [];
}
