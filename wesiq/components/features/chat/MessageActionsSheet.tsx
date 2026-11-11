// Long-Press Options Of A Message: Reactions, Copy, Edit (15 Min), Delete (1 Day)

import { Pressable, StyleSheet, View } from "react-native"
import * as Clipboard from "expo-clipboard"
import { useTranslation } from "react-i18next"
import { Card, Divider, Sheet, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { MenuRow } from "@/components/features/posts/PostMenuSheet"

import type { ChatMessage } from "@/types/models"

// Same Reactions As Before (The Server Keeps Up To 3 Per Message)
export const REACTION_EMOJIS:readonly string[] = ["👍", "👎", "👏", "💪", "😀", "😂", "😍", "🙌", "🙏", "🤝", "🤣", "🤯"]

interface MessageActionsSheetProps {
    message:ChatMessage|null,
    current_username:string|null,
    onClose:() => void,
    onReact:(message:ChatMessage, emoji:string) => void,
    onEdit:(message:ChatMessage) => void,
    onDelete:(message:ChatMessage) => void
}

export default function MessageActionsSheet({ message, current_username, onClose, onReact, onEdit, onDelete }:MessageActionsSheetProps) {
    const { t } = useTranslation() // Initializes The Translations

    const can_edit:boolean = message !== null && message.is_sender && !message.is_older_than_15_minutes && message.content.length > 0
    const can_delete:boolean = message !== null && message.is_sender && !message.is_older_than_1_day

    return (
        <Sheet visible={message !== null} onClose={onClose} title={t("Možnosti správy")}>
            {message && (
                <>
                    <View style={styles.reactions} accessibilityRole="toolbar" accessibilityLabel={t("Reakcie")}>
                        {REACTION_EMOJIS.map((emoji:string) => {
                            const is_mine:boolean = message.message_reactions.some((reaction) => reaction.emoji === emoji && reaction.user.username === current_username)

                            return (
                                <Pressable
                                    key={emoji}
                                    onPress={() => {
                                        haptics.selection()
                                        onReact(message, emoji)
                                        onClose()
                                    }}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: is_mine }}
                                    accessibilityLabel={emoji}
                                    style={({ pressed }) => [styles.reaction, is_mine ? styles.reaction_selected : null, pressed ? styles.reaction_pressed : null]}
                                >
                                    <Text style={styles.emoji}>{emoji}</Text>
                                </Pressable>
                            )
                        })}
                    </View>

                    <Card padding="xs">
                        {message.content.length > 0 && (
                            <MenuRow icon="copy" label={t("Kopírovať text")} onPress={async () => {
                                await Clipboard.setStringAsync(message.content)
                                haptics.success()
                                onClose()
                            }} />
                        )}

                        {can_edit && (
                            <>
                                <Divider inset={spacing.md} />
                                <MenuRow icon="pen" label={t("Upraviť")} onPress={() => {
                                    onEdit(message)
                                    onClose()
                                }} />
                            </>
                        )}

                        {can_delete && (
                            <>
                                <Divider inset={spacing.md} />
                                <MenuRow icon="trash" label={t("Odstrániť správu")} onPress={() => {
                                    onDelete(message)
                                    onClose()
                                }} is_danger />
                            </>
                        )}
                    </Card>

                    {message.is_sender && (message.is_older_than_15_minutes || message.is_older_than_1_day) && (
                        <Text variant="caption" color="text_muted" align="center">
                            {message.is_older_than_1_day ? t("Správy staršie ako deň už nie je možné upraviť ani odstrániť.") : t("Správu je možné upraviť len do 15 minút.")}
                        </Text>
                    )}
                </>
            )}
        </Sheet>
    )
}

const styles = StyleSheet.create({
    reactions: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: spacing.sm,
    },

    reaction: {
        width: 46,
        height: 46,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface_raised,
        borderRadius: radii.pill,
    },

    reaction_selected: {
        backgroundColor: colors.primary_soft,
        borderWidth: 1,
        borderColor: colors.border_strong,
    },

    reaction_pressed: {
        transform: [{ scale: 0.92 }],
    },

    emoji: {
        fontSize: 22,
        lineHeight: 28,
    },
})
