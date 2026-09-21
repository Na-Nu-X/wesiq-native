import { RefObject, useRef, useState } from "react"
import { View, StyleSheet, Text, Pressable, LayoutChangeEvent, GestureResponderEvent, PanResponder } from "react-native"
import { SECONDARY_COLOR, BLUE_COLOR, transparentize, LIGHT_BLUE_COLOR, DARK_BLUE_COLOR, MAIN_COLOR } from "@/constants/colors"
import { BIG_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import { getFormattedTime } from "@/utils/time"
import Slider from "@react-native-community/slider"
import { FontAwesome6 } from "@expo/vector-icons"

import type { Media } from "@/components/Feed"

interface CustomVideoControlsProps {
    one_post_media:Media,
    onPlayPauseVideo:(post_media_id:number) => void,
    playing_video:number|null,
    onStepBack:(step:number) => void,
    onStepFurther:(step:number) => void,
    is_muted:boolean,
    volume:number,
    elapsed_time:number,
    duration:number,
    buffered_time:number,
    onChangeVideoVolume:(value:number) => void,
    is_volume_slider_sliding:RefObject<boolean>
    onMuteUnmuteVideo:() => void,
    onShowVideoSettings:() => void,
    is_fullscreen:boolean,
    onToggleVideoFullscreen:() => void,
    onHandleScrubberLayout:(event:LayoutChangeEvent) => void,
    onChangeVideoTime:(event:GestureResponderEvent) => void,
}

export const CustomVideoControls = ({ 
    one_post_media,
    onPlayPauseVideo, 
    playing_video, 
    onStepBack, 
    onStepFurther, 
    is_muted, 
    volume, 
    elapsed_time, 
    duration, 
    buffered_time, 
    onChangeVideoVolume,
    is_volume_slider_sliding,
    onMuteUnmuteVideo,
    onShowVideoSettings,
    is_fullscreen,
    onToggleVideoFullscreen,
    onHandleScrubberLayout,
    onChangeVideoTime
}:CustomVideoControlsProps) => {
    // Function For Get The Volume Icon
    const getVolumeIcon = ():string => {
        const current_volume:number = is_muted ? 0 : volume // Gets The Current Volume (0 If The Video Is Muted)

        if(current_volume === 0) return "volume-xmark"
        if(current_volume <= 0.5) return "volume-low"
        return "volume-high"
    }

    return (
        <View className="controls" style={styles.controls}>
            <View className="buttons" style={styles.buttons}>
                <View 
                    className="play_pause" 
                    accessibilityLabel={playing_video === one_post_media.id ? "Pozastaviť..." : "Prehrať..."}
                    style={styles.play_pause}
                >
                    <Icon
                        icon_name={playing_video === one_post_media.id ? "pause" : "play"}
                        onPress={() => onPlayPauseVideo(one_post_media.id)}
                        pressed_style={{ transform: [{ scale: 1.1 }] }}
                        color={SECONDARY_COLOR}
                        pressed_color={SECONDARY_COLOR}
                    />
                </View>

                <View 
                    className="step_back" 
                    accessibilityLabel="O 5 sekúnd späť..."
                >
                    <Icon
                        icon_name="arrow-rotate-left"
                        onPress={() => onStepBack(5)}
                        pressed_style={{ transform: [{ scale: 1.1 }] }}
                        color={SECONDARY_COLOR}
                        pressed_color={SECONDARY_COLOR}
                    />
                </View>

                <View 
                    className="step_further" 
                    accessibilityLabel="O 5 sekúnd ďalej..."
                >
                    <Icon
                        icon_name="arrow-rotate-right"
                        onPress={() => onStepFurther(5)}
                        pressed_style={{ transform: [{ scale: 1.1 }] }}
                        color={SECONDARY_COLOR}
                        pressed_color={SECONDARY_COLOR}
                    />
                </View>

                <View className="timer" style={styles.timer}>
                    <Text 
                        className="elapsed"

                        style={{
                            width: 40,
                            // width: "4ch"
                            textAlign: "center",
                            fontSize: 15,
                            color: SECONDARY_COLOR,
                        }}
                    >
                        {`${getFormattedTime("minutes", elapsed_time / 1000)}:${getFormattedTime("seconds", elapsed_time / 1000, true)}`}
                    </Text>

                    <Text
                        style={{
                            width: 40,
                            // width: "4ch"
                            textAlign: "center",
                            fontSize: 15,
                            color: SECONDARY_COLOR,
                        }}
                    >
                        /
                    </Text>

                    <Text 
                        className="total"
                        
                        style={{
                            width: 40,
                            // width: "4ch"
                            textAlign: "center",
                            fontSize: 15,
                            color: SECONDARY_COLOR,
                        }}
                    >
                        {`${getFormattedTime("minutes", duration / 1000)}:${getFormattedTime("seconds", duration / 1000, true)}`}
                    </Text>
                </View>

                <View className="volume_container" style={styles.volume_container}>
                    {!one_post_media.is_muted && (
                        <>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <Slider
                                    className="volume"
                                    minimumValue={0}
                                    maximumValue={1}
                                    step={0.01}
                                    value={is_muted ? 0 : volume}
                                    onValueChange={onChangeVideoVolume}
                                    onSlidingStart={() => { is_volume_slider_sliding.current = true }}
                                    onSlidingComplete={() => { is_volume_slider_sliding.current = false }}
                                    minimumTrackTintColor={DARK_BLUE_COLOR}
                                    maximumTrackTintColor={BLUE_COLOR}
                                    thumbTintColor={DARK_BLUE_COLOR}

                                    // @ts-ignore
                                    thumbStyle={{ 
                                        width: 15,
                                        height: 15,
                                        borderRadius: 15 / 2,
                                    }}

                                    style={[
                                        styles.volume, 
                                        { width: 100, height: 40 }
                                    ]}
                                />

                                <Text className="volume_label" style={styles.volume_label}>
                                    {is_muted ? "0%" : `${Math.round(volume * 100)}%`}
                                </Text>
                            </View>

                            <View 
                                className="mute_unmute" 
                                accessibilityLabel="Hlasitosť..." 
                                style={styles.mute_unmute}
                            >
                                <Icon
                                    icon_name={getVolumeIcon()}
                                    onPress={onMuteUnmuteVideo}
                                    pressed_style={{ transform: [{ scale: 1.1 }] }}
                                    color={SECONDARY_COLOR}
                                    pressed_color={SECONDARY_COLOR}
                                />
                            </View>
                        </>
                    )}

                    {one_post_media.is_muted && (
                        <View className="volume_container">
                            <View className="muted" accessibilityLabel="Video nemá zvuk" style={styles.muted}>
                                <FontAwesome6
                                    name="volume-xmark"
                                    color={"#999999"}
                                />
                            </View>
                        </View>
                    )}
                </View>

                <View 
                    className="show_video_settings_button" 
                    accessibilityLabel="Nastavenia..."
                    style={styles.show_video_settings_button}
                >
                    <Icon
                        icon_name="gear"
                        onPress={onShowVideoSettings}
                        pressed_style={{ transform: [{ scale: 1.1 }] }}
                        color={SECONDARY_COLOR}
                        pressed_color={SECONDARY_COLOR}
                    />
                </View>

                <View 
                    className="fullscreen" 
                    accessibilityLabel="Rozstiahnuť..."
                    style={styles.fullscreen}
                >
                    <Icon
                        icon_name={is_fullscreen ? "compress" : "expand"}
                        onPress={onToggleVideoFullscreen}
                        pressed_style={{ transform: [{ scale: 1.1 }] }}
                        color={SECONDARY_COLOR}
                        pressed_color={SECONDARY_COLOR}
                    />
                </View>
            </View>

            <Pressable 
                className="scrubber_hitbox" 
                onLayout={onHandleScrubberLayout} 
                onPress={onChangeVideoTime}
                style={styles.scrubber_hitbox}
            >
                <View className="scrubber" style={styles.scrubber} pointerEvents="none">
                    <View 
                        className="scrubber_track" 

                        style={[
                            styles.scrubber_track,
                            { width: duration > 0 ? `${(elapsed_time / duration) * 100}%` : "0%" }
                        ]}
                    />

                    <View 
                        className="scrubber_thumb" 

                        style={[
                            styles.scrubber_thumb,
                            { marginLeft: duration > 0 ? `${(elapsed_time / duration) * 100}%` : "0%" }
                        ]}
                    />

                    <View 
                        className="buffering_bar" 

                        style={[
                            styles.buffering_bar,
                            { width: duration > 0 ? `${(buffered_time / duration) * 100}%` : "0%" }
                        ]}
                    />
                </View>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    controls: {
        // display: "none",
        // opacity: 0,
        position: "absolute",
        bottom: BIG_BORDER_RADIUS / 2,
        gap: 10,
        width: "100%",
        // transition: display 0.3s ease allow-discrete 1s, opacity 0.3s ease 1s;
        zIndex: 100,
    },

    buttons: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: BIG_BORDER_RADIUS / 2,
    },

    play_pause: {
        width: 13.5,
    },

    timer: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: "auto",
        paddingVertical: 5,
        paddingHorizontal: 10,
        // font-family: $article-heading-font;
        // font-variant-numeric: tabular-nums;
        fontSize: 15,
        backgroundColor: transparentize(MAIN_COLOR, 0.8),
        borderRadius: 28 / 2,
    },

    volume_container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: transparentize(MAIN_COLOR, 0.8),
        borderRadius: 28 / 2,
    },

    volume: {
        // direction: "rtl",
        position: "relative",
        height: 5,
        borderRadius: 5 / 2,
    },

    volume_label: {
        position: "absolute",
        bottom: "50%",
        left: -45,
        transform: [{ translateY: "50%" }],
        // width: 4ch;
        width: 40,
        textAlign: "right",
        color: SECONDARY_COLOR,
        // font-variant-numeric: tabular-nums;
        fontSize: 15,
    },

    mute_unmute: {
        width: 22.5,
        textAlign: "right",
        // transition: transform 0.3s ease;

        // &:hover {
        //     transform: scale(1.1);
        //     cursor: pointer;
        // }
    },

    muted: {
        width: 22.5,
        textAlign: "right",
        // transition: transform 0.3s ease;

        // &:hover {
        //     transform: scale(1.1);
        //     cursor: pointer;
        // }
    },

    show_video_settings_button: {
        marginLeft: 10,
    },

    fullscreen: {
        marginLeft: 10,
    },

    scrubber_hitbox: {
        // width: calc(100% - $big-border-radius);
        width: "100%",
        marginHorizontal: "auto",
        paddingVertical: 5,

        // &:hover {
        //     .scrubber {
        //         &::before {
        //             transition: width 0s;
        //         }

        //         &::after {
        //             transition: transform 0s, margin-left 0s;
        //         }
        //     }
        // }
    },

    scrubber: {
        position: "relative",
        width: "100%",
        height: 5,
        backgroundColor: LIGHT_BLUE_COLOR,
        borderRadius: 8 / 2,

        // &:hover {
        //     // height: 8px;

        //     &::after {
        //         background-color: $dark-blue-color;
        //         transform: translateY(-50%) scale(1.2);
        //     }
        // }
    },

    scrubber_track: {
        position: "absolute",
        width: 0,
        maxWidth: "100%",
        height: 5,
        backgroundColor: DARK_BLUE_COLOR,
        borderRadius: 8 / 2,
        // transition: width 0.1s linear;
        zIndex: 100,
    },

    scrubber_thumb: {
        position: "absolute",
        top: "50%",
        transform: [{ translateY: "-50%" }],
        width: 10,
        height: 10,
        marginLeft: 0,
        backgroundColor: DARK_BLUE_COLOR,
        borderRadius: "50%",
        // transition: transform 0.3s ease, margin-left 0.1s linear, background-color 0.3s ease;
        zIndex: 100,
    },

    buffering_bar: {
        position: "relative",
        width: 0,
        maxWidth: "100%",
        height: 5,
        backgroundColor: DARK_BLUE_COLOR,
        borderRadius: 8 / 2,
        // transition: width 0.1s linear;
        zIndex: 50,
    },
})