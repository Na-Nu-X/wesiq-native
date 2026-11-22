import { useEffect, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Icon, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { getMediaUrl } from "@/lib/media"
import { AudioPlayer, AudioStatus, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import { getFormattedTime } from "@/utils/time"
import { WAVEFORM_BARS } from "./Composer"
import { fitWaveformToBars } from "@/lib/chat"

import type { VoiceMessage } from "@/types/models"

interface ActiveAudioEngineProps {
    uri:string,
    is_paused:boolean,
    seek_to_seconds:number|null,
    onProgress:(current_seconds:number, duration_seconds:number) => void,
    onFinish:() => void
}

function ActiveAudioEngine({ uri, is_paused, seek_to_seconds, onProgress, onFinish }:ActiveAudioEngineProps) {
    const audio_player:AudioPlayer = useAudioPlayer(uri) // Gets The Audio Player
    const status:AudioStatus = useAudioPlayerStatus(audio_player) // Gets The Status

    useEffect(() => {
        let is_mounted:boolean = true

        // Function For Start The Playback
        const startPlayback = async ():Promise<void> => {
            await setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true
            })

            if(is_mounted && !is_paused) audio_player.play() // Plays The Voice Message
        }

        startPlayback() // Starts The Playback

        return () => { is_mounted = false }
    }, [audio_player])

    useEffect(() => {
        if(is_paused) audio_player.pause() // Pauses The Voice Message
        else audio_player.play() // Plays The Voice Message
    }, [is_paused, audio_player])

    useEffect(() => {
        if(seek_to_seconds !== null) audio_player.seekTo(seek_to_seconds)
    }, [seek_to_seconds, audio_player])

    useEffect(() => {
        onProgress(status.currentTime ?? 0, status.duration ?? 0)

        if(status.didJustFinish) {
            audio_player.seekTo(0)
            onFinish()
        }
    }, [status.currentTime, status.duration, status.didJustFinish, onProgress, onFinish, audio_player])

    return null
}

interface VoiceMessagePlayerProps {
    voice_message:VoiceMessage,
    is_own:boolean,
    is_active:boolean,
    onToggle:() => void
}

export default function VoiceMessagePlayer({ voice_message, is_own, is_active, onToggle }:VoiceMessagePlayerProps) {
    const { t } = useTranslation()

    const [is_paused, setIsPaused] = useState<boolean>(false)
    const [current_seconds, setCurrentSeconds] = useState<number>(0)
    const [actual_duration_seconds, setActualDurationSeconds] = useState<number>(0)
    const [seek_to_seconds, setSeekToSeconds] = useState<number|null>(null)

    const audio_url:string|null = getMediaUrl(voice_message.file)
    const total_seconds:number = actual_duration_seconds > 0 ? actual_duration_seconds : (voice_message.duration / 1000)
    const progress:number = is_active && total_seconds > 0 ? Math.min(1, Math.max(0, current_seconds / total_seconds)) : 0
    const is_playing:boolean = is_active && !is_paused

    // Resets The Playback State When Another Voice Message Starts Playing (Adjusted During Render)
    const [was_active, setWasActive] = useState<boolean>(is_active)

    if(was_active !== is_active) {
        setWasActive(is_active)

        if(!is_active) {
            setIsPaused(false)
            setCurrentSeconds(0)
            setSeekToSeconds(null)
        }
    }

    const handlePressPlayPause = ():void => {
        if(!audio_url) return

        if(!is_active) {
            setIsPaused(false)
            onToggle()
            return
        }

        setIsPaused((prev:boolean) => !prev)
    }

    const handleSeekBar = (index:number):void => {
        if(!audio_url || total_seconds <= 0) return

        const target_seconds:number = (index / bars.length) * total_seconds

        setSeekToSeconds(target_seconds)
        setCurrentSeconds(target_seconds)

        if(!is_active) {
            setIsPaused(false)
            onToggle()
        }
    }

    const bars:number[] = fitWaveformToBars(voice_message.waveform, WAVEFORM_BARS) // Gets The Bars

    return (
        <View style={styles.voice_message_container}>
            {is_active && audio_url && (
                <ActiveAudioEngine
                    uri={audio_url}
                    is_paused={is_paused}
                    seek_to_seconds={seek_to_seconds}

                    onProgress={(current:number, duration:number) => {
                        setCurrentSeconds(current)
                        if(duration > 0) setActualDurationSeconds(duration)
                    }}

                    onFinish={onToggle}
                />
            )}

            <Pressable
                onPress={handlePressPlayPause}
                accessibilityRole="button"
                accessibilityLabel={is_playing ? t("Pozastaviť hlasovú správu") : t("Prehrať hlasovú správu")}
                style={[styles.play_button, is_own ? styles.play_button_own : styles.play_button_other]}
            >
                <View style={is_playing ? null : styles.play_icon}>
                    <Icon name={is_playing ? "pause" : "play"} size={14} color={is_own ? "primary_solid" : "on_primary"} />
                </View>
            </Pressable>

            <View style={styles.voice_message_body}>
                <View style={styles.waveform}>
                    {bars.map((value:number, index:number) => {
                        const is_filled:boolean = progress > 0 && ((index + 0.5) / bars.length) <= progress // Bars Behind The Playback Position

                        return (
                            <Pressable
                                key={index}
                                onPress={() => handleSeekBar(index)}
                                hitSlop={{ top: 8, bottom: 8 }}
                                accessible={false}
                                style={styles.bar_touch}
                            >
                                <View
                                    style={[
                                        styles.bar,
                                        { height: Math.max(4, Math.min(24, value * 24)) },
                                        is_own
                                            ? (is_filled ? styles.bar_own_active : styles.bar_own_idle)
                                            : (is_filled ? styles.bar_other_active : styles.bar_other_idle),
                                    ]}
                                />
                            </Pressable>
                        )
                    })}
                </View>

                <Text variant="caption" color={is_own ? "on_primary" : "text_muted"} is_tabular style={[styles.duration, is_own ? styles.duration_own : null]}>
                    {is_active 
                        ? `${getFormattedTime("minutes", current_seconds)}:${getFormattedTime("seconds", current_seconds, true)}`
                        : `${getFormattedTime("minutes", total_seconds)}:${getFormattedTime("seconds", total_seconds, true)}`
                    }
                </Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    voice_message_container: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm + 2,
        minWidth: 200,
        paddingVertical: spacing.xxs,
    },

    play_button: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.pill,
    },

    play_button_own: {
        backgroundColor: colors.white,
    },

    play_button_other: {
        backgroundColor: colors.primary_solid,
    },

    play_icon: {
        marginLeft: 2, // Optically Centers The Play Triangle
    },

    voice_message_body: {
        flex: 1,
        gap: spacing.xxs,
    },

    waveform: {
        flexDirection: "row",
        alignItems: "center",
        height: 26,
        gap: 1,
    },

    bar_touch: {
        flex: 1,
        height: 26,
        alignItems: "center",
        justifyContent: "center",
    },

    bar: {
        width: 3,
        borderRadius: radii.pill,
    },

    bar_own_active: {
        backgroundColor: colors.white,
    },

    bar_own_idle: {
        backgroundColor: "rgba(255, 255, 255, 0.4)",
    },

    bar_other_active: {
        backgroundColor: colors.primary,
    },

    bar_other_idle: {
        backgroundColor: "rgba(129, 144, 181, 0.45)", // "text_muted" At 45%
    },

    duration: {
        fontSize: 11,
    },

    duration_own: {
        opacity: 0.85,
    },
})
