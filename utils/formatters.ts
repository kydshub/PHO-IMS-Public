export const formatCurrency = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
export const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

export const formatLastSeen = (timestamp: number): string => {
    const now = new Date();
    const lastSeenDate = new Date(timestamp);
    const diffSeconds = Math.round((now.getTime() - lastSeenDate.getTime()) / 1000);

    if (diffSeconds < 60) return "last seen just now";
    
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `last seen ${diffMinutes}m ago`;
    
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `last seen ${diffHours}h ago`;
    
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return "last seen yesterday";
    if (diffDays < 7) return `last seen ${diffDays} days ago`;
    
    return `last seen on ${lastSeenDate.toLocaleDateString()}`;
};
