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
  thu6: { guide: 'https://www.muscleandstrength.com/exercises/wide-grip-upright-rows.html', source: 'Muscle & Strength' }
};

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
  return [...items.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

export const EXERCISE_CATEGORIES = CATEGORIES;
