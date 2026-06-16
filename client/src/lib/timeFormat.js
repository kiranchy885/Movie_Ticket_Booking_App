const timeFormat = (minutes) => {
  if (!minutes) return "N/A";

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hrs}h ${mins}m`;
};

export default timeFormat;