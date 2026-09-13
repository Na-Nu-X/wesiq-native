import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import "dayjs/locale/sk"

dayjs.extend(relativeTime)
dayjs.locale("sk")

// Function For Get The Time Ago
export const getTimeAgo = (date_string:string):string => {
    if(!date_string) return ""
    return dayjs(date_string).fromNow()
}

// Function For Get The Formatted Date
export function getFormattedDate(text:string, show_year:boolean = true):string {
    const date:Date = new Date(text)

    let formatted_date:string =
        `${String(date.getDate()).padStart(2, "0")}.` + 
        `${String(date.getMonth() + 1).padStart(2, '0')}.`

    if(show_year) formatted_date += ` ${date.getFullYear()}`

    return formatted_date
}

// Function For Formatting Time
export function getFormattedTime(unit:string = "seconds", elapsed_seconds:number = 0, leading_zero:boolean = false):string {
    // Formats Seconds
    if(unit === "seconds") {
        const result:string = String(Math.floor(elapsed_seconds) % 60) // Number Value Of Elapsed Seconds
        return leading_zero === true ? result.toString().padStart(2, "0") : result // Returns Formatted Style Of Elapsed Seconds If Format Parameter Is Set As True
    }

    // Formats Minutes
    if(unit === "minutes") {
        const result:string = String((Math.floor(elapsed_seconds / 60)) % 60) // Number Value Of Elapsed Minutes
        return leading_zero === true ? result.toString().padStart(2, "0") : result // Returns Formatted Style Of Elapsed Minutes If Format Parameter Is Set As True
    }

    // Formats Hours
    if(unit === "hours") {
        const result:string = String((Math.floor(elapsed_seconds / 3600)) % 60) // Number Value Of Elapsed Hours
        return leading_zero === true ? result.toString().padStart(2, "0") : result // Returns Formatted Style Of Elapsed Hours If Format Parameter Is Set As True
    }

    else return leading_zero === true ? "00" : "0" // Default Values
}

// Function For Formatting Time To Minimalist Format
export function getMinimalistFormattedTime(elapsed_time:number):string {
    // For Example Converts 3600 To 1h
    return (
        `${getFormattedTime("hours", elapsed_time) !== "0" ? getFormattedTime("hours", elapsed_time) + "h" : ""}
        ${getFormattedTime("minutes", elapsed_time) !== "0" ? getFormattedTime("minutes", elapsed_time) + "m" : ""}
        ${getFormattedTime("seconds", elapsed_time) !== "0" ? getFormattedTime("seconds", elapsed_time) + "s" : ""}`
    )
}

// Function For Convert Time String To Elapsed Seconds (For Example: From 5:00 To 300)
export function getElapsedSeconds(string:string):number {
    const minutes:number = Number(string.split(":")[0]) // Gets Minutes From The Timer
    const seconds:number = Number(string.split(":")[1]) // Gets Seconds From The Timer

    return minutes * 60 + seconds // Returns Elapsed Seconds
}

// Function For Get Day Name From Weekday Index In User's Country's Language (Sunday - 0, Monday - 1, Tuesday - 2, Wednesday - 3, Thursday - 4, Friday - 5, Saturday - 6)
export function getDayName(day_index:number, format:"long"|"short"|"narrow"="short"):string {
    const locale:string = navigator.languages?.[0] || navigator.language || "en-US"
    const date:Date = new Date(2024, 0, 7 + day_index)

    return new Intl.DateTimeFormat(locale, { weekday: format }).format(date)
}

// Function For Get Remaining Seconds From The Date
export function getRemainingSecondsFromDate(date:string):number {
    if(date.trim() === "") return 0

    const target_time:number = new Date(date).getTime() // Gets The Target Time In MS
    const current_time:number = Date.now() // Gets The Current Time In MS
    const remaining_seconds:number = Math.floor((target_time - current_time) / 1000) // Gets The Remaining Time In Seconds

    return Math.max(0, remaining_seconds) // Returns The Remaining Seconds Or 0 If The Date Has Already Passed
}