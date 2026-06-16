const isoTimeFormat = (dateTime) => {
    const date = new date(dateTime);
    const localTime = data.toLocalTimeString('en-us', {
        hour: '2-digits',
        minutes: '2-digits',
        hour12: true,
    });
    return localTime;
}

export default isoTimeFormat