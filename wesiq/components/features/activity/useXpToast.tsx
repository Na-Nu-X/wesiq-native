// "+50 XP" Toast With A Success Sound When A Daily Challenge Is Completed

import { ReactNode, useState } from "react"
import { StyleSheet, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated"
import { useAudioPlayer } from "expo-audio"
import { Icon, Text } from "@/components/ui"
import { colors, radii, shadows, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"

export function useXpToast():{ show:(xp:number, label?:string) => void, element:ReactNode } {
    const [content, setContent] = useState<{ xp:number, label?:string }|null>(null)
    const progress = useSharedValue<number>(0) // 0 Hidden, 1 Shown
    const player = useAudioPlayer(require("@/assets/sounds/success.mp3"))

    const show = (xp:number, label?:string):void => {
        setContent({ xp, label })
        haptics.success()

        try {
            player.seekTo(0).catch(() => {})
            player.play()
        }

        catch {
            // The Sound Is Optional
        }

        progress.set(withSequence(withTiming(1, { duration: 260 }), withDelay(2200, withTiming(0, { duration: 400 }))))
    }

    const animated_style = useAnimatedStyle(() => ({
        opacity: progress.get(),
        transform: [{ translateY: (1 - progress.get()) * -24 }, { scale: 0.9 + progress.get() * 0.1 }],
    }))

    const element = (
        <View pointerEvents="none" style={styles.layer}>
            <Animated.View style={[styles.toast, animated_style]} accessibilityLiveRegion="polite">
                <Icon name="bolt" size={14} color="premium" />
                <Text variant="body_strong">+{content?.xp ?? 0} XP</Text>
                {content?.label ? <Text variant="callout" color="text_secondary" numberOfLines={1} style={styles.label}>{content.label}</Text> : null}
            </Animated.View>
        </View>
    )

    return { show, element }
}

const styles = StyleSheet.create({
    layer: {
        position: "absolute",
        top: spacing.md,
        left: spacing.lg,
        right: spacing.lg,
        alignItems: "center",
    },

    toast: {
        maxWidth: 420,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 2,
        backgroundColor: colors.surface_raised,
        borderWidth: 1,
        borderColor: colors.premium_soft,
        borderRadius: radii.pill,
        ...shadows.md,
    },

    label: {
        flexShrink: 1,
    },
})
