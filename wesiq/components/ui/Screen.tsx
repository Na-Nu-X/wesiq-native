import { ReactNode, useId } from "react"
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { Edge, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg"
import { colors, layout, spacing } from "@/theme"

export interface ScreenProps {
    children:ReactNode,
    header?:ReactNode, // Stays On Top While The Content Scrolls
    footer?:ReactNode, // Stays At The Bottom Above The Home Indicator (E.g. Save Bar)
    is_scrollable?:boolean,
    is_keyboard_aware?:boolean, // Moves Content Above The Keyboard (Forms)
    is_padded?:boolean, // Horizontal Screen Padding
    has_glow?:boolean, // Subtle Blue Glow At The Top Of The Screen
    edges?:Edge[], // Safe Area Edges (The Tab Bar Already Handles The Bottom Edge On Tab Screens)
    refresh?:{ is_refreshing:boolean, onRefresh:() => void },
    content_style?:StyleProp<ViewStyle>
}

export default function Screen({
    children,
    header,
    footer,
    is_scrollable = true,
    is_keyboard_aware = false,
    is_padded = true,
    has_glow = true,
    edges = ["top", "left", "right"],
    refresh,
    content_style,
}:ScreenProps) {
    const insets = useSafeAreaInsets() // Gets The Safe Area Insets
    const has_bottom_edge:boolean = edges.includes("bottom") // Stores The Information If The Bottom Edge Is Handled Here

    const content_container_style:StyleProp<ViewStyle> = [
        styles.content,
        is_padded ? styles.padded : null,
        // Without A Footer The Bottom Inset Is Added To The Scroll Content So The Last Item Isn't Hidden
        !footer && has_bottom_edge ? { paddingBottom: spacing.xxl + insets.bottom } : null,
        content_style,
    ]

    const body:ReactNode = is_scrollable ? (
        <ScrollView
            style={styles.flex}
            contentContainerStyle={content_container_style}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="never"

            refreshControl={refresh ? (
                <RefreshControl
                    refreshing={refresh.is_refreshing}
                    onRefresh={refresh.onRefresh}
                    tintColor={colors.primary}
                    colors={[colors.primary]}
                    progressBackgroundColor={colors.surface_raised}
                />
            ) : undefined}
        >
            {children}
        </ScrollView>
    ) : (
        <View style={[styles.flex, content_container_style]}>{children}</View>
    )

    return (
        <View style={styles.root}>
            {has_glow && <TopGlow />}

            <SafeAreaView edges={edges.filter((edge:Edge) => edge !== "bottom" || !footer)} style={styles.flex}>
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior="padding"
                    enabled={is_keyboard_aware && Platform.OS !== "web"}
                >
                    <View style={styles.column}>
                        {header}
                        {body}
                    </View>

                    {footer && (
                        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                            <View style={styles.footer_inner}>{footer}</View>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    )
}

// Function For Render The Top Glow (Static SVG, Cheap To Render)
function TopGlow() {
    const gradient_id:string = `screen_glow_${useId().replace(/:/g, "")}` // Gets The Unique Gradient ID

    return (
        <Svg pointerEvents="none" width="100%" height={360} style={styles.glow}>
            <Defs>
                <RadialGradient id={gradient_id} cx="50%" cy="-30%" rx="90%" ry="100%" fx="50%" fy="-30%">
                    <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.22} />
                    <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                </RadialGradient>
            </Defs>

            <Rect width="100%" height="100%" fill={`url(#${gradient_id})`} />
        </Svg>
    )
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.background,
    },

    flex: {
        flex: 1,
    },

    glow: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
    },

    column: {
        flex: 1,
        width: "100%",
        maxWidth: layout.max_content_width,
        alignSelf: "center",
    },

    content: {
        flexGrow: 1,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xxl,
        gap: spacing.lg,
    },

    padded: {
        paddingHorizontal: layout.screen_padding,
    },

    footer: {
        paddingTop: spacing.md,
        paddingHorizontal: layout.screen_padding,
        backgroundColor: colors.background_deep,
        borderTopWidth: layout.hairline,
        borderTopColor: colors.divider,
    },

    footer_inner: {
        width: "100%",
        maxWidth: layout.max_content_width,
        alignSelf: "center",
    },
})
