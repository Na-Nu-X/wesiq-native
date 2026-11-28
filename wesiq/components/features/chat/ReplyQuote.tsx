// Quoted Message Of A Reply: Inside A Bubble (Tap Jumps To The Original) And Above The Composer While Replying

import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Icon, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { formatUsername } from "@/lib/format"
import i18n from "@/lib/i18n"

import type { IconName } from "@/components/ui"
import type { ChatMessage, ChatReplyPreview } from "@/types/models"

// Function For Turn A Loaded Message Into The Same Preview The Server Sends (Mock Echo, Composer)
export const toReplyPreview = (message:ChatMessage):ChatReplyPreview => ({
    id: message.id,
    message_type: message.message_type ?? "text",
    content: message.content,
    has_attachments: message.attachments.length > 0,
    sender: message.sender ? { id: message.sender.id, username: message.sender.username } : null,
})

// Function For The Text And Icon Of A Quoted Message (Messages Without Text Get A Label)
export const getReplySummary = (reply:ChatReplyPreview):{ text:string, icon:IconName|null } => {
    switch(reply.message_type) {
        case "voice": return { text: i18n.t("Hlasová správa"), icon: "microphone" }
        case "post": return { text: i18n.t("Zdieľaný príspevok"), icon: "images" }
        case "article": return { text: i18n.t("Zdieľaný článok"), icon: "newspaper" }
        default: break
    }

    if(reply.content) return { text: reply.content, icon: reply.has_attachments ? "paperclip" : null }
    return { text: i18n.t("Príloha"), icon: "paperclip" }
}

interface ReplyQuoteProps {
    reply:ChatReplyPreview,
    current_user_id:number|null,
    variant:"own"|"other"|"composer", // Own Bubble (Blue), Incoming Bubble, Or The Banner Above The Composer
    onPress?:() => void
}

export default function ReplyQuote({ reply, current_user_id, variant, onPress }:ReplyQuoteProps) {
    const { t } = useTranslation() // Initializes The Translations

    const is_own_bubble:boolean = variant === "own" // Checks If It Is Own Bubble
    const is_mine:boolean = reply.sender !== null && reply.sender.id === current_user_id // The Quoted Message Was Written By The Logged In User
    const sender_name:string = is_mine ? t("Vy") : reply.sender ? formatUsername(reply.sender.username) : "" // Gets The Sender Name
    const summary = getReplySummary(reply) // Gets The Summary

    // Gets The Title
    const title:string = variant === "composer"
        ? (is_mine ? t("Odpovedáte sebe") : t("Odpovedáte {{username}}", { username: sender_name }))
        : sender_name

    // Gets The Content
    const content = (
        <>
            <View style = {[styles.accent, is_own_bubble ? styles.accent_own : null]} />

            <View style = {styles.body}>
                <Text
                    variant = "label"
                    color = {is_own_bubble ? "on_primary" : "primary_text"}
                    numberOfLines = {1}
                >
                    {title}
                </Text>

                <View style = {styles.summary}>
                    {!!summary.icon &&
                        <Icon
                            name = {summary.icon}
                            size = {11}
                            color = {is_own_bubble ? "on_primary" : "text_muted"}
                        />
                    }
                    <Text
                        variant = "caption"
                        color = {is_own_bubble ? "on_primary" : "text_secondary"}
                        numberOfLines = {variant === "composer" ? 1 : 2}
                        style = {[styles.summary_text, is_own_bubble ? styles.summary_text_own : null]}
                    >
                        {summary.text}
                    </Text>
                </View>
            </View>
        </>
    )

    const container_style = [styles.container, variant === "own" ? styles.container_own : variant === "other" ? styles.container_other : styles.container_composer] // Gets The Container Style

    if(!onPress) return <View style = {container_style}>{content}</View>

    return (
        <Pressable
            onPress = {onPress}
            accessibilityRole = "button"
            accessibilityLabel = {`${title}: ${summary.text}`}
            accessibilityHint = {t("Zobraziť pôvodnú správu")}
            style = {({ pressed }) => [...container_style, pressed ? styles.pressed : null]}
        >
            {content}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        overflow: "hidden",
        borderRadius: radii.sm,
    },

    container_own: {
        backgroundColor: "rgba(255, 255, 255, 0.14)",
        marginHorizontal: -spacing.xs,
    },

    container_other: {
        backgroundColor: colors.primary_soft,
        marginHorizontal: -spacing.xs,
    },

    container_composer: {
        flex: 1,
        backgroundColor: "transparent",
    },

    pressed: {
        opacity: 0.7,
    },

    accent: {
        width: 3,
        backgroundColor: colors.primary,
    },

    accent_own: {
        backgroundColor: colors.on_primary,
    },

    body: {
        flexShrink: 1,
        gap: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs + 1,
    },

    summary: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },

    summary_text: {
        flexShrink: 1,
    },

    summary_text_own: {
        opacity: 0.85,
    },
})
