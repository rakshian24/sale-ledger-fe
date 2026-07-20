export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
};

export const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

export const formatDateDDMMMYYYY = (date: string): string => {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return date;
  }

  const [, year, month, day] = match;
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${day}-${monthNames[Number(month) - 1]}-${year}`;
};

export const getTodayDateInputValue = () => {
  return new Date().toISOString().slice(0, 10);
};
