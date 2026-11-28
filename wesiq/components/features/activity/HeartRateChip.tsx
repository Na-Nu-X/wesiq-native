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

import type { HeartRateConnectError, HeartRateConnectResult, HeartRateSourceType } from "@/classes/HeartRate"
import type { IconName } from "@/components/ui"

// Defines The Source Icons
const SOURCE_ICONS:Record<HeartRateSourceType, IconName> = {
    APPLE_HEALTH: "apple-whole",
    HEALTH_CONNECT: "heart-pulse",
    BLE: "bluetooth-b",
    TEST: "flask",
}

export default function HeartRateChip() {
    const { t } = useTranslation() // Initializes The Translations
    const [manager] = useState<HeartRateManager>(() => new HeartRateManager()) // Stores The Manager
    const [bpm, setBpm] = useState<number|null>(null) // Stores The Bpm
    const [source, setSource] = useState<HeartRateSourceType|null>(null) // Stores The Source
    const [is_connecting, setIsConnecting] = useState<boolean>(false) // Stores If It Is Connecting
    const [is_sheet_open, setIsSheetOpen] = useState<boolean>(false) // Stores If It Is Sheet Open
    const scale = useSharedValue<number>(1) // Stores The Scale

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

    const heart_style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] })) // Gets The Heart Style

    // Gets The Source Labels
    const source_labels:Record<HeartRateSourceType, string> = {
        APPLE_HEALTH: "Apple Health",
        HEALTH_CONNECT: "Health Connect",
        BLE: t("Bluetooth snímač"),
        TEST: t("Testovacie dáta"),
    }

    // Gets The Sources
    const sources:HeartRateSourceType[] = [
        ...(Platform.OS === "ios" ? ["APPLE_HEALTH" as const] : []),
        ...(Platform.OS === "android" ? ["HEALTH_CONNECT" as const] : []),
        ...(Platform.OS !== "web" ? ["BLE" as const] : []),
        ...(__DEV__ ? ["TEST" as const] : []),
    ]

    // Function For Get The Message Of A Failed Connection
    const getErrorMessage = (error:HeartRateConnectError, failed_source:HeartRateSourceType):string => {
        if(error === "permission") return t("Povoľte aplikácii prístup v nastaveniach zariadenia a skúste to znova.")
        if(error === "bluetooth_off") return t("Zapnite Bluetooth a skúste to znova.")
        if(error === "not_found") return t("Nenašiel sa žiadny snímač tepu. Skontrolujte, či je zapnutý a nasadený.")
        if(error === "unavailable" && failed_source === "HEALTH_CONNECT") return t("Health Connect nie je dostupný. Nainštalujte alebo aktualizujte aplikáciu Health Connect.")
        if(error === "unavailable") return t("Táto možnosť nie je v tomto zariadení dostupná.")
        return t("Skontrolujte, či je zariadenie zapnuté a aplikácia má povolený prístup.")
    }

    // Function For Reset After The Sensor Disconnected By Itself
    const handleConnectionLost = ():void => {
        manager.stopMonitoring()
        setSource(null) // Sets The Source
        setBpm(null) // Sets The Bpm
        haptics.error()
        showAlert(t("Snímač tepu sa odpojil"))
    }

    // Function For Connect A Source
    const connect = async (next_source:HeartRateSourceType):Promise<void> => {
        setIsSheetOpen(false) // Sets The Sheet Open State
        setIsConnecting(true) // Sets The Connecting State
        setSource(null) // Sets The Source
        setBpm(null) // Sets The Bpm

        const result:HeartRateConnectResult = await manager.startMonitoring(next_source, setBpm, handleConnectionLost) // Connects
        if(!result.ok && result.error === "cancelled") return // Another Source Was Picked Or The Connection Was Stopped

        setIsConnecting(false) // Sets The Connecting State

        if(!result.ok) {
            haptics.error()
            showAlert(t("Pripojenie zlyhalo"), getErrorMessage(result.error, next_source))
            return
        }

        haptics.success()
        setSource(next_source) // Sets The Source
    }

    // Function For Disconnect (Also Stops A Running Search)
    const disconnect = ():void => {
        manager.stopMonitoring()
        setIsConnecting(false) // Sets The Connecting State
        setSource(null) // Sets The Source
        setBpm(null) // Sets The Bpm
        setIsSheetOpen(false) // Sets The Sheet Open State
    }

    const label:string = is_connecting ? t("Pripájam...") : source ? (bpm ? `${bpm}` : "--") : t("Tep") // Gets The Label

    return (
        <>
            <Pressable
                onPress = {() => setIsSheetOpen(true)}
                accessibilityRole = "button"
                accessibilityLabel = {source ? t("Srdcový tep: {{bpm}} úderov za minútu", { bpm: bpm ?? "--" }) : t("Pripojiť snímač tepu")}
                style = {({ pressed }:PressableStateCallbackType) => [styles.chip, source ? styles.chip_connected : null, pressed ? styles.pressed : null]}
            >
                <Animated.View style = {heart_style}>
                    <Icon
                        name = "heart"
                        size = {13}
                        color = {source ? "danger" : "text_muted"}
                        is_solid = {Boolean(source)}
                    />
                </Animated.View>

                <Text
                    variant = "label"
                    color = {source ? "text" : "text_secondary"}
                    is_tabular
                >
                    {label}
                </Text>
                {source && bpm ? <Text variant = "caption" color = "text_muted">bpm</Text> : null}
            </Pressable>

            <Sheet
                visible = {is_sheet_open}
                onClose = {() => setIsSheetOpen(false)}
                title = {t("Snímač tepu")}
                subtitle = {t("Zvoľte možnosť pre meranie srdcového tepu.")}
            >
                <View style = {styles.list}>
                    {sources.length === 0 &&
                        <Text variant = "callout" color = "text_secondary">{t("Meranie tepu je dostupné v aplikácii pre iOS a Android.")}</Text>
                    }

                    {sources.map((one_source:HeartRateSourceType) => (
                        <MenuRow
                            key = {one_source}
                            icon = {SOURCE_ICONS[one_source]}
                            label = {one_source === source ? `${source_labels[one_source]} · ${t("pripojené")}` : source_labels[one_source]}
                            onPress = {() => connect(one_source)}
                        />
                    ))}

                    {(!!source || is_connecting) &&
                        <MenuRow
                            icon = {is_connecting ? "xmark" : "link-slash"}
                            label = {is_connecting ? t("Zrušiť") : t("Odpojiť")}
                            onPress = {disconnect}
                            is_danger
                        />
                    }
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
