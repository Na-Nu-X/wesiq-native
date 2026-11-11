// Activity Stopwatch With Live XP, The XP Boost And Heart Rate

import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Button, Card, Icon, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { formatDuration } from "@/lib/format"
import HeartRateChip from "./HeartRateChip"
import { XP_BOOST_DURATION_MS, XP_BOOST_MULTIPLIER } from "./xp"

interface TimerCardProps {
    elapsed_ms:number,
    gained_xp:number,
    is_running:boolean,
    is_started:boolean,
    is_saving:boolean,
    boost:{ is_available:boolean, expires_at:number|null }, // expires_at In MS
    now:number,
    onToggle:() => void,
    onStop:() => void
}

// Function For Format The Stopwatch (h:mm:ss)
const formatStopwatch = (elapsed_ms:number):string => {
    const total:number = Math.floor(elapsed_ms / 1000)
    const hours:number = Math.floor(total / 3600)
    return `${String(hours).padStart(2, "0")}:${String(Math.floor(total / 60) % 60).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

export default function TimerCard({ elapsed_ms, gained_xp, is_running, is_started, is_saving, boost, now, onToggle, onStop }:TimerCardProps) {
    const { t } = useTranslation() // Initializes The Translations

    const boost_remaining_ms:number = boost.expires_at !== null ? Math.max(0, boost.expires_at - now) : 0
    const is_boost_active:boolean = boost_remaining_ms > 0

    return (
        <Card padding="lg" style={[styles.card, is_running ? styles.card_running : null]}>
            <View style={styles.top}>
                <View style={[styles.status, is_running ? styles.status_running : null]}>
                    <View style={[styles.dot, is_running ? styles.dot_running : is_started ? styles.dot_paused : null]} />
                    <Text variant="label" color={is_running ? "success" : "text_secondary"}>{is_running ? t("Nahráva sa") : is_started ? t("Pozastavené") : t("Pripravené")}</Text>
                </View>

                <HeartRateChip />
            </View>

            <Text variant="timer" align="center" accessibilityRole="timer" accessibilityLabel={t("Čas aktivity: {{time}}", { time: formatStopwatch(elapsed_ms) })} style={styles.timer}>{formatStopwatch(elapsed_ms)}</Text>

            <View style={styles.xp_row}>
                <Icon name="bolt" size={12} color={is_boost_active ? "premium" : "text_muted"} />
                <Text variant="callout" color="text_secondary" is_tabular>{t("{{xp}} XP v tejto aktivite", { xp: gained_xp })}</Text>
            </View>

            {/* ---------- XP Boost ---------- */}
            {is_boost_active ? (
                <View style={styles.boost} accessible accessibilityLabel={t("Navýšenie XP {{multiplier}}× ešte {{time}}", { multiplier: XP_BOOST_MULTIPLIER, time: formatDuration(boost_remaining_ms / 1000) })}>
                    <View style={styles.boost_row}>
                        <Text variant="label" color="premium">{t("Navýšenie XP {{multiplier}}×", { multiplier: XP_BOOST_MULTIPLIER })}</Text>
                        <Text variant="label" color="text_secondary" is_tabular>{formatDuration(boost_remaining_ms / 1000)}</Text>
                    </View>

                    <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, boost_remaining_ms / XP_BOOST_DURATION_MS * 100)}%` }]} /></View>
                </View>
            ) : boost.is_available ? (
                <View style={[styles.boost, styles.boost_ready]}>
                    <Text variant="caption" color="text_secondary" align="center">{t("Navýšenie XP {{multiplier}}× na 30 minút sa zapne so spustením aktivity.", { multiplier: XP_BOOST_MULTIPLIER })}</Text>
                </View>
            ) : null}

            <View style={styles.buttons}>
                <Button label={is_running ? t("Pozastaviť") : is_started ? t("Pokračovať") : t("Začať")} icon={is_running ? "pause" : "play"} onPress={onToggle} size="lg" style={styles.flex} />
                <Button label={t("Dokončiť")} icon="stop" variant="secondary" onPress={onStop} is_disabled={!is_started} is_loading={is_saving} size="lg" accessibility_hint={t("Uloží aktivitu")} />
            </View>
        </Card>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    card: {
        gap: spacing.md,
    },

    card_running: {
        borderColor: colors.border_strong,
    },

    top: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    status: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs + 2,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 4,
        backgroundColor: colors.surface_raised,
        borderRadius: radii.pill,
    },

    status_running: {
        backgroundColor: colors.success_soft,
    },

    dot: {
        width: 7,
        height: 7,
        backgroundColor: colors.text_muted,
        borderRadius: radii.pill,
    },

    dot_running: {
        backgroundColor: colors.success,
    },

    dot_paused: {
        backgroundColor: colors.warning,
    },

    timer: {
        fontSize: 52,
        lineHeight: 64,
        paddingTop: spacing.sm,
    },

    xp_row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        marginTop: -spacing.sm,
    },

    boost: {
        gap: spacing.xs + 2,
        padding: spacing.md,
        backgroundColor: colors.premium_soft,
        borderRadius: radii.md,
    },

    boost_ready: {
        backgroundColor: colors.surface_raised,
    },

    boost_row: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    track: {
        height: 5,
        overflow: "hidden",
        backgroundColor: colors.surface_strong,
        borderRadius: radii.pill,
    },

    fill: {
        height: "100%",
        backgroundColor: colors.premium,
        borderRadius: radii.pill,
    },

    buttons: {
        flexDirection: "row",
        gap: spacing.sm,
        paddingTop: spacing.xs,
    },
})
