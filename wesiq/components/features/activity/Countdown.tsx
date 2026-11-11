// Countdown Ring For The Warm Up And Breaks (Optional +30 s And A Local Notification At The End)

import { useEffect, useRef, useState } from "react"
import { StyleSheet, View } from "react-native"
import Svg, { Circle } from "react-native-svg"
import { useTranslation } from "react-i18next"
import { Button, Text } from "@/components/ui"
import { colors, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { formatDuration } from "@/lib/format"
import { cancelBreakAlarm, scheduleBreakAlarm } from "@/lib/breakAlarm"

const SIZE:number = 168
const STROKE:number = 8
const RADIUS:number = (SIZE - STROKE) / 2
const CIRCUMFERENCE:number = 2 * Math.PI * RADIUS
const ADDED_SECONDS:number = 30

interface CountdownProps {
    seconds:number,
    title:string,
    skip_label:string,
    onSkip:() => void,
    can_add_time?:boolean,
    has_alarm?:boolean // Notifies When The Countdown Ends (Breaks)
}

export default function Countdown({ seconds, title, skip_label, onSkip, can_add_time = false, has_alarm = false }:CountdownProps) {
    const { t } = useTranslation() // Initializes The Translations
    const [ends_at, setEndsAt] = useState<number>(() => Date.now() + seconds * 1000)
    const [total_ms, setTotalMs] = useState<number>(seconds * 1000)
    const [now, setNow] = useState<number>(() => Date.now())
    const alarm_id = useRef<string|null>(null)
    const has_finished = useRef<boolean>(false)

    const remaining_ms:number = Math.max(0, ends_at - now)
    const remaining_seconds:number = Math.ceil(remaining_ms / 1000)

    // Initializes The Tick
    useEffect(() => {
        const interval:ReturnType<typeof setInterval> = setInterval(() => setNow(Date.now()), 250)
        return () => clearInterval(interval)
    }, [])

    // Initializes The Alarm For The Current End Time
    useEffect(() => {
        if(!has_alarm) return

        let is_active:boolean = true
        scheduleBreakAlarm((ends_at - Date.now()) / 1000).then((id) => {
            if(is_active) alarm_id.current = id
            else cancelBreakAlarm(id)
        })

        return () => {
            is_active = false
            cancelBreakAlarm(alarm_id.current)
            alarm_id.current = null
        }
    }, [ends_at, has_alarm])

    // Initializes The Haptic Feedback When It Ends (The Screen Stays Until The User Continues)
    useEffect(() => {
        if(remaining_ms > 0 || has_finished.current) return

        has_finished.current = true
        haptics.success()
    }, [remaining_ms])

    // Function For Add Time
    const addTime = ():void => {
        haptics.light()
        has_finished.current = false
        const next_end:number = Math.max(ends_at, Date.now()) + ADDED_SECONDS * 1000
        setEndsAt(next_end)
        setTotalMs((previous:number) => Math.max(previous, next_end - Date.now()))
    }

    const progress:number = total_ms > 0 ? remaining_ms / total_ms : 0
    const is_done:boolean = remaining_ms === 0
    const ring_color:string = is_done ? colors.success : remaining_seconds <= 10 ? colors.warning : colors.primary

    return (
        <View style={styles.root}>
            <Text variant="overline" color="text_muted">{title}</Text>

            <View style={styles.ring} accessible accessibilityRole="timer" accessibilityLabel={is_done ? t("Hotovo") : t("Zostáva {{time}}", { time: formatDuration(remaining_seconds) })}>
                <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
                    <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.surface_strong} strokeWidth={STROKE} fill="none" />
                    <Circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        stroke={ring_color}
                        strokeWidth={STROKE}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                    />
                </Svg>

                <Text variant="timer" color={is_done ? "success" : "text"}>{formatDuration(remaining_seconds)}</Text>
            </View>

            <View style={styles.actions}>
                {can_add_time && <Button label={`+${ADDED_SECONDS} s`} icon="plus" variant="secondary" onPress={addTime} />}
                <Button label={skip_label} icon="forward" variant={is_done ? "primary" : "secondary"} onPress={onSkip} />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    root: {
        alignItems: "center",
        gap: spacing.md,
    },

    ring: {
        width: SIZE,
        height: SIZE,
        alignItems: "center",
        justifyContent: "center",
    },

    actions: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: spacing.sm,
    },
})
