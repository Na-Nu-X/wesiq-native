// Small Building Blocks For States: Divider, Empty State, Error State, Skeleton

import { useEffect } from "react"
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, cancelAnimation } from "react-native-reanimated"
import { useTranslation } from "react-i18next"
import { colors, layout, radii, spacing } from "@/theme"
import Text from "./Text"
import Icon, { IconName } from "./Icon"
import Button from "./Button"

import type { ApiError } from "@/types/api"

// ---------- Divider ----------

export function Divider({ inset = 0, style }:{ inset?:number, style?:StyleProp<ViewStyle> }) {
    return <View style={[styles.divider, { marginLeft: inset }, style]} />
}

// ---------- Empty State ----------

export interface EmptyStateProps {
    icon:IconName,
    title:string,
    message?:string,
    action?:{ label:string, onPress:() => void },
    is_compact?:boolean
}

export function EmptyState({ icon, title, message, action, is_compact = false }:EmptyStateProps) {
    return (
        <View style={[styles.empty, is_compact ? styles.empty_compact : null]}>
            <View style={styles.empty_icon}>
                <Icon name={icon} size={is_compact ? 18 : 24} color="primary" />
            </View>

            <Text variant={is_compact ? "body_strong" : "heading"} align="center">{title}</Text>
            {message && <Text variant="callout" color="text_secondary" align="center">{message}</Text>}
            {action && <Button label={action.label} onPress={action.onPress} variant="secondary" size="sm" style={styles.empty_action} />}
        </View>
    )
}

// ---------- Error State ----------

export function ErrorState({ error, onRetry, is_compact = false }:{ error:ApiError, onRetry?:() => void, is_compact?:boolean }) {
    const { t } = useTranslation() // Initializes The Translations

    return (
        <EmptyState
            icon={error.kind === "network" || error.kind === "timeout" ? "wifi" : "triangle-exclamation"}
            title={t("Niečo sa pokazilo")}
            message={error.message}
            action={onRetry ? { label: t("Skúsiť znova"), onPress: onRetry } : undefined}
            is_compact={is_compact}
        />
    )
}

// ---------- Skeleton ----------

export function Skeleton({ width = "100%", height = 14, radius = radii.sm, style }:{ width?:DimensionValue, height?:number, radius?:number, style?:StyleProp<ViewStyle> }) {
    const opacity = useSharedValue<number>(0.5) // Stores The Opacity

    // Initializes The Pulse Animation
    useEffect(() => {
        opacity.set(withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true))
        return () => cancelAnimation(opacity)
    }, [opacity])

    const animated_style = useAnimatedStyle(() => ({ opacity: opacity.get() }))

    return (
        <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[{ width, height, borderRadius: radius, backgroundColor: colors.surface_strong }, animated_style, style]}
        />
    )
}

// Skeleton Of A List Row With Avatar (Loading Lists Of Users)
export function UserRowSkeleton() {
    return (
        <View style={styles.row_skeleton}>
            <Skeleton width={44} height={44} radius={radii.pill} />

            <View style={styles.row_skeleton_text}>
                <Skeleton width="55%" height={13} />
                <Skeleton width="35%" height={11} />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    divider: {
        height: layout.hairline,
        backgroundColor: colors.divider,
    },

    empty: {
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        paddingVertical: spacing.huge,
        paddingHorizontal: spacing.xxl,
    },

    empty_compact: {
        paddingVertical: spacing.xxl,
    },

    empty_icon: {
        width: 56,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.xs,
        backgroundColor: colors.primary_soft,
        borderRadius: radii.pill,
    },

    empty_action: {
        alignSelf: "center",
        marginTop: spacing.sm,
    },

    row_skeleton: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.sm,
    },

    row_skeleton_text: {
        flex: 1,
        gap: spacing.sm,
    },
})
