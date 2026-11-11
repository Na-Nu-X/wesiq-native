import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import "dayjs/locale/sk"
import "dayjs/locale/cs"
import "dayjs/locale/de"
import "dayjs/locale/es"
import "dayjs/locale/fr"
import "dayjs/locale/uk"
import "dayjs/locale/ru"
import "dayjs/locale/pt-br"
import i18n from "@/lib/i18n"

dayjs.extend(relativeTime)

// Function For Map The App Language To A dayjs Locale (Relative Times Used To Be Always Slovak)
const getDayjsLocale = ():string => {
    const language:string = i18n.language.toLowerCase().replace("_", "-") // Gets The Language
    return ["sk", "cs", "de", "es", "fr", "uk", "ru", "pt-br", "en"].includes(language) ? language : "en"
}

// Function For Get The Time Ago
export const getTimeAgo = (date_string:string):string => {
    if(!date_string) return ""
    return dayjs(date_string).locale(getDayjsLocale()).fromNow()
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

// Function For Formatting Time To Minimalist Format (For Example Converts 3600 To 1h)
export function getMinimalistFormattedTime(elapsed_time:number):string {
    const hours:string = getFormattedTime("hours", elapsed_time) // Gets The Hours
    const minutes:string = getFormattedTime("minutes", elapsed_time) // Gets The Minutes
    const seconds:string = getFormattedTime("seconds", elapsed_time) // Gets The Seconds

    const parts:string[] = [] // Stores The Parts (Prevents The Blank Spaces)

    if(hours !== "0") parts.push(`${hours}h`) // Pushes The Hours To The Parts
    if(minutes !== "0") parts.push(`${minutes}m`) // Pushes The Minutes To The Parts
    if(seconds !== "0") parts.push(`${seconds}s`) // Pushes The Seconds To The Parts

    if(parts.length === 0) return "0s" // Returns The Default Text
    return parts.join(" ").trim() // Returns The Text
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