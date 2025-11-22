export const generateControlNumber = (prefix: string, logCount: number) => {
    const date = new Date();
    const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = (logCount + 1).toString().padStart(4, '0');
    return `${prefix}${yyyymmdd}-${sequence}`;
};
