// Post Caption With Highlighted #Hashtags, Tappable @Mentions And A "More" Toggle

import { useState } from "react"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Text } from "@/components/ui"

const TOKEN_PATTERN:RegExp = /([#@][\p{L}\p{N}_.]+)/gu
const COLLAPSED_LINES:number = 3

interface CaptionProps {
    username:string,
    text:string,
    is_expanded_initially?:boolean
}

export default function Caption({ username, text, is_expanded_initially = false }:CaptionProps) {
    const { t } = useTranslation() // Initializes The Translations
    const [is_expanded, setIsExpanded] = useState<boolean>(is_expanded_initially) // Stores The Information If The Whole Caption Is Shown
    const [is_truncated, setIsTruncated] = useState<boolean>(false) // Stores The Information If The Text Is Longer Than The Collapsed Lines

    const parts:string[] = text.split(TOKEN_PATTERN).filter((part:string) => part.length > 0) // Splits The Text Into Plain Text And Tokens

    return (
        <>
            <Text
                variant="callout"
                numberOfLines={is_expanded ? undefined : COLLAPSED_LINES}
                onTextLayout={(event) => {
                    if(!is_expanded && event.nativeEvent.lines.length >= COLLAPSED_LINES) setIsTruncated(true)
                }}
            >
                <Text variant="body_strong" onPress={() => router.push({ pathname: "/profile/[username]", params: { username } })}>{username}</Text>
                {"  "}

                {parts.map((part:string, index:number) => {
                    if(part.startsWith("@")) {
                        const mentioned:string = part.slice(1).replace(/\.$/, "") // Gets The Username (Without A Trailing Dot)
                        return <Text key={index} variant="callout" color="primary_text" onPress={() => router.push({ pathname: "/profile/[username]", params: { username: mentioned } })}>{part}</Text>
                    }

                    if(part.startsWith("#")) return <Text key={index} variant="callout" color="primary_text">{part}</Text>
                    return part
                })}
            </Text>

            {is_truncated && !is_expanded && (
                <Text variant="label" color="text_muted" onPress={() => setIsExpanded(true)} accessibilityRole="button">{t("viac")}</Text>
            )}
        </>
    )
}
