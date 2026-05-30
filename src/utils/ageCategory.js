export const determineAgeCategory = (age) => {
  if (age < 12) return 'CHILD';
  if (age < 18) return 'TEEN';
  return 'ADULT';
};
