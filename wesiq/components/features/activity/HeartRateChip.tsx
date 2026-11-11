// Heart Rate Pill (Connect Apple Health, Health Connect Or A Bluetooth Strap; The Test Source Only In Development)

import { useEffect, useState } from "react"
import { Platform, Pressable, PressableStateCallbackType, StyleSheet, View } from "react-native"
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated"
import { useTranslation } from "react-i18next"
import { Icon, Sheet, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { showAlert } from "@/lib/alert"
import { HeartRateManager } from "@/classes/HeartRate"
import { MenuRow } from "@/components/features/posts/PostMenuSheet"

import type { HeartRateSourceType } from "@/classes/HeartRate"
import type { IconName } from "@/components/ui"

const SOURCE_ICONS:Record<HeartRateSourceType, IconName> = {
    APPLE_HEALTH: "apple-whole",
    HEALTH_CONNECT: "heart-pulse",
    BLE: "bluetooth-b",
    TEST: "flask",
}

export default function HeartRateChip() {
    const { t } = useTranslation() // Initializes The Translations
    const [manager] = useState<HeartRateManager>(() => new HeartRateManager())
    const [bpm, setBpm] = useState<number|null>(null)
    const [source, setSource] = useState<HeartRateSourceType|null>(null)
    const [is_connecting, setIsConnecting] = useState<boolean>(false)
    const [is_sheet_open, setIsSheetOpen] = useState<boolean>(false)
    const scale = useSharedValue<number>(1)

    // Initializes The Disconnect On Unmount
    useEffect(() => () => manager.stopMonitoring(), [manager])

    // Initializes The Heartbeat Animation
    useEffect(() => {
        if(!bpm) {
            cancelAnimation(scale)
            scale.set(1)
            return
        }

        const beat_ms:number = 60000 / bpm // Gets The Beat Length
        scale.set(withRepeat(withSequence(withTiming(1.25, { duration: beat_ms * 0.3 }), withTiming(1, { duration: beat_ms * 0.7 })), -1))
    }, [bpm, scale])

    const heart_style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }))

    const source_labels:Record<HeartRateSourceType, string> = {
        APPLE_HEALTH: "Apple Health",
        HEALTH_CONNECT: "Health Connect",
        BLE: t("Bluetooth snímač"),
        TEST: t("Testovacie dáta"),
    }

    const sources:HeartRateSourceType[] = [
        ...(Platform.OS === "ios" ? ["APPLE_HEALTH" as const] : []),
        ...(Platform.OS === "android" ? ["HEALTH_CONNECT" as const] : []),
        ...(Platform.OS !== "web" ? ["BLE" as const] : []),
        ...(__DEV__ ? ["TEST" as const] : []),
    ]

    // Function For Connect A Source
    const connect = async (next_source:HeartRateSourceType):Promise<void> => {
        setIsSheetOpen(false)
        setIsConnecting(true)
        setBpm(null)

        const is_connected:boolean = await manager.startMonitoring(next_source, setBpm).catch(() => false) // Connects
        setIsConnecting(false)

        if(!is_connected) {
            setSource(null)
            showAlert(t("Pripojenie zlyhalo"), t("Skontrolujte, či je zariadenie zapnuté a aplikácia má povolený prístup."))
            return
        }

        haptics.success()
        setSource(next_source)
    }

    // Function For Disconnect
    const disconnect = ():void => {
        manager.stopMonitoring()
        setSource(null)
        setBpm(null)
        setIsSheetOpen(false)
    }

    const label:string = is_connecting ? t("Pripájam...") : source ? (bpm ? `${bpm}` : "--") : t("Tep")

    return (
        <>
            <Pressable
                onPress={() => setIsSheetOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={source ? t("Srdcový tep: {{bpm}} úderov za minútu", { bpm: bpm ?? "--" }) : t("Pripojiť snímač tepu")}
                style={({ pressed }:PressableStateCallbackType) => [styles.chip, source ? styles.chip_connected : null, pressed ? styles.pressed : null]}
            >
                <Animated.View style={heart_style}>
                    <Icon name="heart" size={13} color={source ? "danger" : "text_muted"} is_solid={Boolean(source)} />
                </Animated.View>

                <Text variant="label" color={source ? "text" : "text_secondary"} is_tabular>{label}</Text>
                {source && bpm ? <Text variant="caption" color="text_muted">bpm</Text> : null}
            </Pressable>

            <Sheet visible={is_sheet_open} onClose={() => setIsSheetOpen(false)} title={t("Snímač tepu")} subtitle={t("Zvoľte možnosť pre meranie srdcového tepu.")}>
                <View style={styles.list}>
                    {sources.length === 0 && <Text variant="callout" color="text_secondary">{t("Meranie tepu je dostupné v aplikácii pre iOS a Android.")}</Text>}

                    {sources.map((one_source:HeartRateSourceType) => (
                        <MenuRow key={one_source} icon={SOURCE_ICONS[one_source]} label={one_source === source ? `${source_labels[one_source]} · ${t("pripojené")}` : source_labels[one_source]} onPress={() => connect(one_source)} />
                    ))}

                    {!!source && <MenuRow icon="link-slash" label={t("Odpojiť")} onPress={disconnect} is_danger />}
                </View>
            </Sheet>
        </>
    )
}

const styles = StyleSheet.create({
    chip: {
        minHeight: 32,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs + 2,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface_raised,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.pill,
    },

    chip_connected: {
        borderColor: colors.danger_soft,
    },

    pressed: {
        opacity: 0.8,
    },

    list: {
        gap: spacing.xs,
    },
})
