export function readableEta(eta: number) {
    const date = new Date(0);
    date.setSeconds(eta);
    return date.toISOString().slice(11, 19);
}

export function buildRFC822Date(date: Date) {
    const dayStrings = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthStrings = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const day = dayStrings[date.getDay()];
    const dayNumber = date.getDate().toString().padStart(2, "0");
    const month = monthStrings[date.getMonth()];
    const year = date.getFullYear();
    const time = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:00`;
    const timezone = date.getTimezoneOffset() === 0 ? "GMT" : "BST";

    //Wed, 02 Oct 2002 13:00:00 GMT
    return `${day}, ${dayNumber} ${month} ${year} ${time} ${timezone}`;
}

export async function wait(ms: number) {
    await new Promise((r,) => setTimeout(r, ms))
}
