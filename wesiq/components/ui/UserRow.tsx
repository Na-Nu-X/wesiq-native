import { ReactNode } from "react"
import { Pressable, PressableStateCallbackType, StyleSheet, View } from "react-native"
import { colors, radii, spacing } from "@/theme"
import Avatar, { AvatarUser } from "./Avatar"
import Text from "./Text"
import Icon from "./Icon"

export interface UserRowProps {
    user:AvatarUser,
    subtitle?:string, // Defaults To "@username" When The User Has A Name
    onPress?:() => void,
    trailing?:ReactNode, // Action Buttons
    accessibility_hint?:string
}

// Function For Get The Display Name
export const getDisplayName = (user:AvatarUser):string => {
    const full_name:string = [user.first_name, user.last_name].filter((part):part is string => Boolean(part && part.trim())).join(" ") // Gets The Full Name
    return full_name || user.username
}

export default function UserRow({ user, subtitle, onPress, trailing, accessibility_hint }:UserRowProps) {
    const display_name:string = getDisplayName(user) // Gets The Display Name
    const secondary:string|null = subtitle ?? (display_name !== user.username ? `@${user.username}` : null) // Gets The Secondary Text

    return (
        <View style={styles.row}>
            <Pressable
                onPress={onPress}
                disabled={!onPress}
                accessibilityRole={onPress ? "button" : undefined}
                accessibilityLabel={secondary ? `${display_name}, ${secondary}` : display_name}
                accessibilityHint={accessibility_hint}
                style={({ pressed }:PressableStateCallbackType) => [styles.main, pressed ? styles.pressed : null]}
            >
                <Avatar user={user} size={44} />

                <View style={styles.text}>
                    <View style={styles.name_row}>
                        <Text variant="body_strong" numberOfLines={1} style={styles.name}>{display_name}</Text>
                        {user.subscription?.is_active && <Icon name="crown" size={11} color="premium" />}
                    </View>

                    {secondary && <Text variant="caption" color="text_muted" numberOfLines={1}>{secondary}</Text>}
                </View>
            </Pressable>

            {trailing && <View style={styles.trailing}>{trailing}</View>}
        </View>
    )
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        minHeight: 60,
    },

    main: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        marginHorizontal: -spacing.xs,
        borderRadius: radii.md,
    },

    pressed: {
        backgroundColor: colors.surface_pressed,
    },

    text: {
        flex: 1,
        gap: 1,
    },

    name_row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs + 2,
    },

    name: {
        flexShrink: 1,
    },

    trailing: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
})
