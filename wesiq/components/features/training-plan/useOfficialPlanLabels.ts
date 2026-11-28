// Labels Of Official Plan Tags (Goals And Target Muscles), Shared By The Category Chips And The Plan Cards

import { useTranslation } from "react-i18next"

// Function For Turn An Unknown Server Tag Into Readable Text ("lower_back" → "Lower back")
const prettifyTag = (tag:string):string => {
    const text:string = tag.replace(/[_-]+/g, " ").trim() // Replaces The Separators
    return text.charAt(0).toUpperCase() + text.slice(1)
}

// Function For Get The Translated Label Of A Tag (Keys Are Normalized Tags, E.g. "full_body")
export function useOfficialPlanLabels() {
    const { t } = useTranslation() // Initializes The Translations

    // Gets The Tag Labels
    const tag_labels:Record<string, string> = {
        all: t("Všetky kategórie"),
        gym: t("Posilňovňa"),
        calisthenics: t("Kalistenika"),
        full_body: t("Celé telo"),
        chest: t("Hrudník"),
        core: t("Stred tela"),
        push: t("Tlak"),
        pull: t("Ťah"),
        legs: t("Nohy"),
        back: t("Chrbát"),
        shoulders: t("Ramená"),
        biceps: t("Biceps"),
        triceps: t("Triceps"),
        quads: t("Predné stehná"),
        hamstrings: t("Zadné stehná"),
        glutes: t("Sedacie svaly"),
        calves: t("Lýtka"),
        forearms: t("Predlaktia"),
        hypertrophy: t("Hypertrofia"),
        strength: t("Sila"),
        endurance: t("Vytrvalosť"),
        fat_loss: t("Chudnutie")
    }

    // Function For Get The Label Of A Tag
    const getTagLabel = (tag:string):string => tag_labels[tag.trim().toLowerCase().replace(/[\s-]+/g, "_")] ?? prettifyTag(tag)

    return { getTagLabel }
}
