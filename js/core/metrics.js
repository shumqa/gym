/**
 * BMI is a screening indicator, not a diagnosis or a measure of body composition.
 * Weight difference is a mathematical comparison with the adult BMI range only.
 */
export function calculateBodyMetrics(weightKg, heightCm, age = null) {
  const weight = Number(weightKg);
  const height = Number(heightCm);
  if (!Number.isFinite(weight) || !Number.isFinite(height) || weight <= 0 || height <= 0) return null;

  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  const lowerWeight = 18.5 * heightM * heightM;
  const upperWeight = 24.9 * heightM * heightM;
  const ageKnown = age !== null && age !== undefined && age !== '' && Number.isFinite(Number(age)) && Number(age) > 0;
  const isUnder18 = ageKnown && Number(age) < 18;
  const needsAge = !ageKnown;

  let category = 'Стандартный диапазон';
  let message = 'Показатель находится в стандартном диапазоне ИМТ для взрослых.';
  let difference = 0;
  let differenceLabel = '';

  if (isUnder18) {
    category = 'Нужна возрастная оценка';
    message = 'Для людей младше 18 лет используют возрастные и половые перцентили. Взрослая шкала и расчёт разницы веса здесь не применяются.';
  } else if (needsAge) {
    category = 'Укажите возраст';
    message = 'ИМТ рассчитан. Для интерпретации показателя и весовых ориентиров нужно указать возраст: взрослая шкала применяется с 18 лет.';
  } else if (bmi < 18.5) {
    category = 'Ниже диапазона';
    message = 'ИМТ ниже стандартного взрослого диапазона. Не используйте этот расчёт для самостоятельной постановки цели веса.';
    difference = lowerWeight - weight;
    differenceLabel = 'Разница до нижней границы диапазона';
  } else if (bmi > 24.9 && bmi < 30) {
    category = 'Выше диапазона';
    message = 'ИМТ выше стандартного взрослого диапазона. Это скрининговый показатель, а не оценка процента жира.';
    difference = weight - upperWeight;
    differenceLabel = 'Разница до верхней границы диапазона';
  } else if (bmi >= 30) {
    category = 'Значительно выше диапазона';
    message = 'ИМТ значительно выше стандартного взрослого диапазона. Для персональной оценки лучше обсудить показатели со специалистом.';
    difference = weight - upperWeight;
    differenceLabel = 'Разница до верхней границы диапазона';
  }

  return {
    bmi,
    category,
    message,
    lowerWeight,
    upperWeight,
    difference: Math.max(0, difference),
    differenceLabel,
    isUnder18,
    needsAge
  };
}
