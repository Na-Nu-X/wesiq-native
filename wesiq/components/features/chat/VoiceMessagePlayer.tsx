import { useEffect, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Icon, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { getMediaUrl } from "@/lib/media"
import { AudioPlayer, AudioStatus, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import { getFormattedTime } from "@/utils/time"
import { BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { WAVEFORM_BARS } from "./Composer"

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

    useEffect(() => {
        if(!is_active) {
            setIsPaused(false)
            setCurrentSeconds(0)
            setSeekToSeconds(null)
        }
    }, [is_active])

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

    const fitWaveformToBars = (samples:number[], target_bars:number = WAVEFORM_BARS):number[] => {
        if(!samples || samples.length === 0) return Array(target_bars).fill(0.2)
        if(samples.length === 1) return Array(target_bars).fill(samples[0])
        if(samples.length === target_bars) return samples

        // Shorter Recording (Less Than 35 Samples)
        if(samples.length < target_bars) {
            const result:number[] = []
            const max_index:number = samples.length - 1

            for(let i:number = 0; i < target_bars; i++) {
                const exact_pos:number = (i / (target_bars - 1)) * max_index
                const low:number = Math.floor(exact_pos)
                const high:number = Math.ceil(exact_pos)
                const weight:number = exact_pos - low

                const interpolated:number = samples[low] * (1 - weight) + samples[high] * weight

                result.push(Number(interpolated.toFixed(3)))
            }

            return result
        }

        // Longer Recording (More Than 35 Samples)
        const step:number = samples.length / target_bars
        const result:number[] = []

        for(let i:number = 0; i < target_bars; i++) {
            const start:number = Math.floor(i * step)
            const end:number = Math.floor((i + 1) * step)
            const slice:number[] = samples.slice(start, Math.max(start + 1, end))
            const avg:number = slice.reduce((sum, val) => sum + val, 0) / slice.length

            result.push(Number(avg.toFixed(3)))
        }

        return result
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
                <Icon
                    name={is_playing ? "pause" : "play"}
                    size={16}
                    color={is_own ? "on_primary" : "primary"}
                />
            </Pressable>

            <View style={styles.voice_message_body}>
                <View style={styles.waveform}>
                    {bars.map((value:number, index:number) => {
                        const is_filled:boolean = (index / bars.length) <= progress

                        return (
                            <Pressable
                                key={index}
                                onPress={() => handleSeekBar(index)}
                                hitSlop={{ top: 8, bottom: 8 }}
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

                <Text variant="caption" color={is_own ? "on_primary" : "text_muted"} style={styles.duration}>
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
        gap: 10,
        minWidth: 190,
        paddingVertical: 2,
    },

    play_button: {
        justifyContent: "center",
        alignItems: "center",
        width: 32,
        height: 32,
        borderRadius: "50%",
    },

    play_button_own: {
        backgroundColor: transparentize(SECONDARY_COLOR, 0.8),
    },

    play_button_other: {
        backgroundColor: transparentize(BLUE_COLOR, 0.8),
    },

    voice_message_body: {
        flex: 1,
        gap: 4,
    },

    waveform: {
        flexDirection: "row",
        alignItems: "center",
        height: 24,
        gap: 2,
    },

    bar_touch: {
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
        height: 24,
    },

    bar: {
        width: 2.5,
        borderRadius: 2,
    },

    bar_own_active: {
        backgroundColor: SECONDARY_COLOR,
    },

    bar_own_idle: {
        backgroundColor: transparentize(SECONDARY_COLOR, 0.6),
    },

    bar_other_active: {
        backgroundColor: BLUE_COLOR,
    },

    bar_other_idle: {
        backgroundColor: transparentize(SECONDARY_COLOR, 0.6),
    },

    duration: {
        fontSize: 10,
        fontVariant: ["tabular-nums"],
    },
})
