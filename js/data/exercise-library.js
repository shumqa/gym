import { WORKOUT_DATA } from './workouts.js';

const MUSCLE_AND_STRENGTH = 'https://www.muscleandstrength.com/exercises';

// Direct guides below were checked during this update. Pages titled "Video Exercise Guide"
// include a demonstration on the source site. For exercises without an exact reviewed page,
// the card links to the general exercise library and a name-specific video search.
const RESOURCE_BY_ID = {
  mon1: { guide: 'https://www.muscleandstrength.com/exercises/barbell-bench-press.html', source: 'Muscle & Strength' },
  mon2: { guide: 'https://www.muscleandstrength.com/exercises/incline-dumbbell-bench-press.html', source: 'Muscle & Strength' },
  mon3: { guide: 'https://www.muscleandstrength.com/exercises/dumbbell-flys.html', source: 'Muscle & Strength' },
  mon5: { guide: 'https://www.muscleandstrength.com/exercises/dumbbell-lateral-raise.html', source: 'Muscle & Strength', video: 'https://www.youtube.com/watch?v=4hTUCDUQaNA' },
  mon6: { guide: 'https://www.muscleandstrength.com/exercises/tricep-extension.html', source: 'Muscle & Strength' },
  wed1: { guide: 'https://www.muscleandstrength.com/exercises/lat-pull-down.html', source: 'Muscle & Strength' },
  wed2: { guide: 'https://www.muscleandstrength.com/exercises/bent-over-barbell-row.html', source: 'Muscle & Strength' },
  wed3: { guide: 'https://www.muscleandstrength.com/exercises/one-arm-dumbbell-row.html', source: 'Muscle & Strength' },
  wed4: { guide: 'https://www.muscleandstrength.com/exercises/seated-row.html', source: 'Muscle & Strength' },
  wed7: { guide: 'https://www.muscleandstrength.com/exercises/standing-hammer-curl.html', source: 'Muscle & Strength' },
  fri1: { guide: 'https://www.muscleandstrength.com/exercises/squat.html', source: 'Muscle & Strength' },
  fri3: { guide: 'https://www.acefitness.org/continuing-education/certified/may-2025/8865/the-ace-do-it-better-series-the-romanian-deadlift/', source: 'ACE Fitness', video: 'https://www.youtube.com/watch?v=tsyQHhrCJvY' },
  fri5: { guide: 'https://www.muscleandstrength.com/exercises/leg-curl.html', source: 'Muscle & Strength' },
  tue2: { guide: 'https://www.muscleandstrength.com/exercises/barbell-hip-thrust', source: 'Muscle & Strength' },
  tue3: { guide: 'https://www.muscleandstrength.com/exercises/leg-extension.html', source: 'Muscle & Strength' },
  thu6: { guide: 'https://www.muscleandstrength.com/exercises/wide-grip-upright-rows.html', source: 'Muscle & Strength' },
  extra_db_bench: { guide: 'https://www.muscleandstrength.com/exercises/dumbbell-bench-press.html', source: 'Muscle & Strength' },
  extra_db_row: { guide: 'https://www.muscleandstrength.com/exercises/bent-over-dumbbell-row.html', source: 'Muscle & Strength' },
  extra_db_pullover: { guide: 'https://www.muscleandstrength.com/exercises/dumbbell-pullover.html', source: 'Muscle & Strength' },
  extra_military_press: { guide: 'https://www.muscleandstrength.com/exercises/military-press.html', source: 'Muscle & Strength' },
  extra_arnold_press: { guide: 'https://www.muscleandstrength.com/exercises/seated-arnold-press.html', source: 'Muscle & Strength' },
  extra_db_deadlift: { guide: 'https://www.muscleandstrength.com/exercises/dumbbell-deadlift.html', source: 'Muscle & Strength' },
  extra_stiff_deadlift: { guide: 'https://www.muscleandstrength.com/exercises/stiff-leg-deadlift-aka-romanian-deadlift.html', source: 'Muscle & Strength' }
};

// Additional commonly used gym movements. These are catalogue/log options and
// do not silently change the user's prescribed weekly workout plan.
const EXTRA_EXERCISES = [
  { id: 'extra_db_bench', name: 'Жим гантелей лёжа', category: 'chest', muscles: ['Большая грудная', 'Передняя дельта', 'Трицепс'], equipment: 'Гантели', note: 'Горизонтальный жим с гантелями; держи запястья над локтями и контролируй опускание.' },
  { id: 'extra_cable_crossover', name: 'Сведение рук в кроссовере', category: 'chest', muscles: ['Большая грудная', 'Передняя дельта'], equipment: 'Кроссовер', note: 'Своди руки перед корпусом без рывка и не превращай движение в жим.' },
  { id: 'extra_pushups', name: 'Отжимания от пола', category: 'chest', muscles: ['Грудные', 'Трицепс', 'Передняя дельта', 'Кор'], equipment: 'Собственный вес', note: 'Сохраняй прямую линию корпуса, опускайся подконтрольно и не проваливай поясницу.' },
  { id: 'extra_dips', name: 'Отжимания на брусьях', category: 'chest', muscles: ['Грудные', 'Трицепс', 'Передняя дельта'], equipment: 'Брусья', note: 'Подбирай глубину без дискомфорта в плечах; при необходимости используй гравитрон.' },
  { id: 'extra_db_pullover', name: 'Пуловер с гантелью', category: 'chest', muscles: ['Грудные', 'Широчайшие', 'Передняя зубчатая'], equipment: 'Гантель и скамья', note: 'Опускай вес в комфортной амплитуде, сохраняя лёгкий сгиб локтей и стабильный корпус.' },
  { id: 'extra_military_press', name: 'Жим штанги стоя (армейский жим)', category: 'shoulders', muscles: ['Передняя дельта', 'Средняя дельта', 'Трицепс', 'Кор'], equipment: 'Штанга', note: 'Напряги ягодицы и пресс, не переразгибай поясницу и веди гриф близко к лицу.' },
  { id: 'extra_arnold_press', name: 'Жим Арнольда сидя', category: 'shoulders', muscles: ['Передняя дельта', 'Средняя дельта', 'Трицепс'], equipment: 'Гантели', note: 'Выполняй поворот предплечий плавно, без боли и чрезмерной амплитуды в плечах.' },
  { id: 'extra_face_pull', name: 'Тяга каната к лицу (Face Pull)', category: 'shoulders', muscles: ['Задняя дельта', 'Ромбовидные', 'Средняя трапеция'], equipment: 'Верхний блок', note: 'Тяни канат к уровню лица, разводя кисти; не компенсируй движение поясницей.' },
  { id: 'extra_reverse_cable_fly', name: 'Обратные махи в кроссовере', category: 'shoulders', muscles: ['Задняя дельта', 'Ромбовидные'], equipment: 'Кроссовер', note: 'Работай с небольшим весом и контролируй движение лопаток.' },
  { id: 'extra_db_row', name: 'Тяга гантелей в наклоне', category: 'back', muscles: ['Широчайшие', 'Ромбовидные', 'Задняя дельта', 'Бицепс'], equipment: 'Гантели', note: 'Держи позвоночник нейтрально и тяни локти к тазу без раскачивания.' },
  { id: 'extra_tbar_row', name: 'Тяга Т-грифа', category: 'back', muscles: ['Широчайшие', 'Трапеция', 'Ромбовидные', 'Бицепс'], equipment: 'Т-гриф', note: 'Сохраняй жёсткий корпус и тяни рукоять к нижней части груди или животу.' },
  { id: 'extra_chinups', name: 'Подтягивания обратным хватом', category: 'back', muscles: ['Широчайшие', 'Бицепс', 'Большая круглая'], equipment: 'Турник', note: 'Начинай движение сведением лопаток и избегай раскачивания.' },
  { id: 'extra_deadlift', name: 'Становая тяга классическая', category: 'legs', muscles: ['Ягодицы', 'Бицепс бедра', 'Разгибатели спины', 'Трапеция'], equipment: 'Штанга', note: 'Освой стартовую позицию и брейсинг; поднимай вес близко к голеням с нейтральной спиной.' },
  { id: 'extra_db_deadlift', name: 'Становая тяга с гантелями', category: 'legs', muscles: ['Ягодицы', 'Бицепс бедра', 'Разгибатели спины'], equipment: 'Гантели', note: 'Отводи таз назад, веди гантели вдоль ног и сохраняй нейтральное положение позвоночника.' },
  { id: 'extra_stiff_deadlift', name: 'Тяга на прямых ногах', category: 'legs', muscles: ['Бицепс бедра', 'Ягодицы', 'Разгибатели спины'], equipment: 'Штанга', note: 'Слегка согни колени и опускай вес за счёт движения таза, а не округления спины.' },
  { id: 'extra_goblet_squat', name: 'Гоблет-приседания', category: 'legs', muscles: ['Квадрицепс', 'Ягодицы', 'Кор'], equipment: 'Гантель или гиря', note: 'Держи снаряд у груди, сохраняй опору всей стопой и контролируй колени.' },
  { id: 'extra_bulgarian_split', name: 'Болгарские сплит-приседания', category: 'legs', muscles: ['Квадрицепс', 'Ягодицы', 'Бицепс бедра'], equipment: 'Гантели / собственный вес', note: 'Подбери удобную длину шага и опускайся плавно, удерживая баланс.' },
  { id: 'extra_barbell_curl', name: 'Сгибания рук со штангой', category: 'arms', muscles: ['Бицепс', 'Брахиалис', 'Предплечья'], equipment: 'Штанга', note: 'Удерживай локти около корпуса и не помогай себе раскачиванием туловища.' },
  { id: 'extra_preacher_curl', name: 'Сгибания рук на скамье Скотта', category: 'arms', muscles: ['Бицепс', 'Брахиалис'], equipment: 'Скамья Скотта / EZ-гриф', note: 'Не бросай вес в нижней точке и не выпрямляй локоть резко.' },
  { id: 'extra_rope_overhead', name: 'Разгибание рук над головой с канатом', category: 'arms', muscles: ['Трицепс'], equipment: 'Нижний блок / канат', note: 'Удерживай плечи относительно стабильными и разгибай локти без рывков.' },
  { id: 'extra_cable_crunch', name: 'Скручивания на верхнем блоке', category: 'core', muscles: ['Прямая мышца живота', 'Косые мышцы'], equipment: 'Верхний блок', note: 'Сгибай корпус за счёт мышц живота, не превращая повторение в наклон таза.' },
  { id: 'extra_hanging_knee_raise', name: 'Подъём коленей в висе', category: 'core', muscles: ['Прямая мышца живота', 'Подвздошно-поясничная'], equipment: 'Турник', note: 'Подкручивай таз вверх и избегай инерционного раскачивания.' },
  { id: 'extra_russian_twist', name: 'Русские скручивания', category: 'core', muscles: ['Косые мышцы живота', 'Прямая мышца живота'], equipment: 'Собственный вес / диск', note: 'Поворачивай грудную клетку контролируемо; не ускоряй движение за счёт рывков.' },
  { id: 'extra_treadmill', name: 'Беговая дорожка', category: 'cardio', muscles: ['Сердечно-сосудистая система', 'Ноги'], equipment: 'Беговая дорожка', note: 'Подбери скорость и наклон под текущую подготовку; начинай с постепенной разминки.' }
];

const CATEGORIES = [
  { id: 'chest', label: 'Грудь' },
  { id: 'back', label: 'Спина' },
  { id: 'shoulders', label: 'Плечи' },
  { id: 'arms', label: 'Руки' },
  { id: 'legs', label: 'Ноги и ягодицы' },
  { id: 'core', label: 'Кор' },
  { id: 'cardio', label: 'Кардио' }
];

function classify(exercise) {
  const id = exercise.id;
  const name = exercise.name.toLocaleLowerCase('ru');
  const primary = (exercise.primary || []).join(' ').toLocaleLowerCase('ru');
  const text = `${name} ${primary}`;
  if (/кардио|hiit|берпи|ходьба|плаван|канат|велотренаж/.test(text) || /сердечно-сосудист/.test(primary)) return 'cardio';
  if (/живот|поперечн.*мышц|косые мышц|прямая мышца живота|планка|скручив|подъём ног|подъем ног|абдомин/.test(text) || id === 'wk5') return 'core';
  if (/грудн/.test(primary) || /жим штанги лёжа|жим гантелей на наклонной|разведение гантелей лёжа/.test(name)) return 'chest';
  if (/дельт|плеч/.test(primary) || /жим арнольда|армейский|махи гантелей|обратные разведения|тяга штанги к подбородку/.test(name)) return 'shoulders';
  if (/трицепс|брахиалис|брахиорадиалис/.test(primary) || (/бицепс/.test(primary) && !/бедра/.test(primary))) return 'arms';
  if (/квадрицепс|ягодич|бицепс бедра|икронож|камбаловид|приводящ/.test(primary)) return 'legs';
  if (/широчайш|спин|трапец|ромбовид|разгибател.*спин/.test(primary) || /подтягив|горизонтальн.*тяг|тяга штанги в наклоне|тяга гантели одной рукой|гиперэкстенз/.test(name)) return 'back';
  if (/присед|выпады|жим ногами|сгибан.*ног|разгибан.*ног|ягодичн|подъём на носки/.test(name)) return 'legs';
  if (/тяга|тренажёр/.test(name)) return 'back';
  return 'core';
}

function equipment(exercise) {
  const text = exercise.name.toLocaleLowerCase('ru');
  if (/велотренаж|кардио-тренаж|гребля|боевые канаты|ходьба|плавание|hiit/.test(text)) return 'Кардио';
  if (/штанг|ez|трэп-бар/.test(text)) return 'Штанга';
  if (/гантел/.test(text)) return 'Гантели';
  if (/блок|тренажёр|тренажере|pec deck|римском стуле/.test(text)) return 'Тренажёр / блок';
  if (/перекладин|подтягив|планка|берпи|выпады|скручив|ходьба/.test(text)) return 'Собственный вес';
  return 'Смешанное оборудование';
}

function youtubeSearch(name) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} техника выполнения правильная техника`)}`;
}

export function getExerciseLibrary() {
  const items = new Map();
  for (const workout of Object.values(WORKOUT_DATA)) {
    for (const exercise of workout.exercises) {
      const key = exercise.name.trim().toLocaleLowerCase('ru');
      if (items.has(key)) continue;
      const category = classify(exercise);
      const resource = RESOURCE_BY_ID[exercise.id] || {};
      items.set(key, {
        id: exercise.id,
        name: exercise.name,
        note: exercise.note,
        muscles: [...(exercise.primary || []), ...(exercise.secondary || [])],
        category,
        categoryLabel: CATEGORIES.find(item => item.id === category)?.label || 'Другое',
        equipment: equipment(exercise),
        guideUrl: resource.guide || MUSCLE_AND_STRENGTH,
        guideLabel: resource.guide ? 'Техника + демонстрация' : 'Общий видео-справочник',
        guideSource: resource.source || 'Muscle & Strength · библиотека упражнений',
        videoUrl: resource.video || youtubeSearch(exercise.name),
        videoLabel: resource.video ? 'Открыть видео' : 'Найти видео',
        workout: workout.day
      });
    }
  }

  for (const exercise of EXTRA_EXERCISES) {
    const key = exercise.name.trim().toLocaleLowerCase('ru');
    if (items.has(key)) continue;
    const resource = RESOURCE_BY_ID[exercise.id] || {};
    items.set(key, {
      ...exercise,
      categoryLabel: CATEGORIES.find(item => item.id === exercise.category)?.label || 'Другое',
      guideUrl: resource.guide || MUSCLE_AND_STRENGTH,
      guideLabel: resource.guide ? 'Техника + демонстрация' : 'Общий видео-справочник',
      guideSource: resource.source || 'Muscle & Strength · библиотека упражнений',
      videoUrl: resource.video || youtubeSearch(exercise.name),
      videoLabel: resource.video ? 'Открыть видео' : 'Найти видео',
      workout: 'Дополнительный каталог'
    });
  }

  return [...items.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

export const EXERCISE_CATEGORIES = CATEGORIES;
