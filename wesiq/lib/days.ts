// Week Day Names (0 = Sunday, Same As The Server And Date.getDay)

import i18n from "@/lib/i18n"

import type { Day } from "@/types/models"

// Full Names Use The Existing Translation Keys
const FULL_NAME_KEYS:Record<Day, string> = {
    0: "Nedeľa",
    1: "Pondelok",
    2: "Utorok",
    3: "Streda",
    4: "Štvrtok",
    5: "Piatok",
    6: "Sobota",
}

// Function For Get The Full Day Name (E.g. "Monday")
export const getDayName = (day:Day):string => i18n.t(FULL_NAME_KEYS[day])

// Function For Get The Short Day Name In The App Language (E.g. "Mon", "Po"), Falls Back To The First Letters
export const getShortDayName = (day:Day):string => {
    const locale:string = i18n.language.replace("_", "-") // Gets The BCP 47 Locale (pt_BR → pt-BR)
    const date:Date = new Date(2024, 0, 1 + ((day + 6) % 7)) // 1 January 2024 Was A Monday

    try {
        const name:string = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date) // Formats The Day
        return name.replace(/\.$/, "")
    }

    catch {
        return getDayName(day).slice(0, 2)
    }
}
