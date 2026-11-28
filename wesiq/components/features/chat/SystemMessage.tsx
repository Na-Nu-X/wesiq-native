// System Messages In A Chat ("@martin pridal používateľa @lucia"): A Centered Caption Between Hairlines, Usernames Highlighted And Tappable
// The Message That Created The Group Is Shown As An Intro Card At The Top Of The Conversation

import { memo } from "react"
import { StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Text } from "@/components/ui"
import { colors, layout, radii, spacing } from "@/theme"
import GroupAvatar from "./GroupAvatar"

import type { ChatRoom } from "@/types/models"

const HANDLE_PATTERN:RegExp = /(@[A-Za-z0-9._]+)/g // Usernames Contain Letters, Digits, Dots And Underscores

interface SystemMessageProps {
    text:string,
    formatted_time?:string
}

// Function For Open A Profile From A Handle
const openProfile = (handle:string):void => {
    router.push({ pathname: "/profile/[username]", params: { username: handle.slice(1) } })
}

// Function For Render The Text With Highlighted, Tappable Usernames
function HighlightedText({ text }:{ text:string }) {
    const { t } = useTranslation() // Initializes The Translations
    const parts:string[] = text.split(HANDLE_PATTERN) // Odd Indexes Are The Handles

    return (
        <Text
            variant = "caption"
            color = "text_secondary"
            style = {styles.centered}
        >
            {parts.map((part:string, index:number) => index % 2 === 1 ? (
                <Text
                    key = {index}
                    variant = "caption"
                    color = "text"
                    onPress = {() => openProfile(part)}
                    accessibilityRole = "link"
                    accessibilityHint = {t("Zobraziť profil")}
                    style = {styles.handle}
                >
                    {part}
                </Text>
            ) : part)}
        </Text>
    )
}

function SystemMessage({ text, formatted_time }:SystemMessageProps) {
    return (
        <View style = {styles.row}>
            <View style = {styles.line} />

            <View style = {styles.pill}>
                <HighlightedText text = {text} />
                {!!formatted_time &&
                    <Text
                        variant = "caption"
                        color = "text_muted"
                        style = {styles.time}
                    >
                        {formatted_time}
                    </Text>
                }
            </View>

            <View style = {styles.line} />
        </View>
    )
}

interface GroupIntroProps {
    room:ChatRoom,
    text:string, // "@patrik vytvoril skupinu …"
    formatted_time?:string
}

// Function For Render The Start Of A Group Conversation (Photo, Name, Who Created It, Members)
export const GroupIntro = memo(function GroupIntro({ room, text, formatted_time }:GroupIntroProps) {
    const { t } = useTranslation() // Initializes The Translations

    return (
        <View style = {styles.intro}>
            <GroupAvatar
                avatar = {room.avatar}
                name = {room.name}
                size = {76}
            />

            <View style = {styles.intro_text}>
                <Text
                    variant = "heading"
                    numberOfLines = {2}
                    style = {styles.centered}
                >
                    {room.name ?? t("Skupina")}
                </Text>
                <HighlightedText text = {text} />

                <Text
                    variant = "caption"
                    color = "text_muted"
                    style = {styles.centered}
                >
                    {formatted_time ? `${t("Členovia: {{count}}", { count: room.members_count })} · ${formatted_time}` : t("Členovia: {{count}}", { count: room.members_count })}
                </Text>
            </View>
        </View>
    )
})

export default memo(SystemMessage)

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
    },

    line: {
        flex: 1,
        height: layout.hairline,
        backgroundColor: colors.divider,
    },

    pill: {
        maxWidth: "78%",
        alignItems: "center",
        gap: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        backgroundColor: colors.surface,
        borderWidth: layout.hairline,
        borderColor: colors.border,
        borderRadius: radii.md,
    },

    handle: {
        fontWeight: "600",
    },

    time: {
        fontSize: 11,
    },

    centered: {
        textAlign: "center",
    },

    intro: {
        alignItems: "center",
        gap: spacing.md,
        marginTop: spacing.xl,
        marginBottom: spacing.md,
        marginHorizontal: spacing.lg,
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderWidth: layout.hairline,
        borderColor: colors.border,
        borderRadius: radii.lg,
    },

    intro_text: {
        alignItems: "center",
        gap: spacing.xs,
    },
})
