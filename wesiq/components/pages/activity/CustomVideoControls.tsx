import { RefObject, useEffect, useRef, useState } from "react"
import { View, StyleSheet, Text, LayoutChangeEvent, GestureResponderEvent, PanResponder, PanResponderInstance } from "react-native"
import { SECONDARY_COLOR, BLUE_COLOR, transparentize, LIGHT_BLUE_COLOR, DARK_BLUE_COLOR, MAIN_COLOR } from "@/constants/colors"
import { BIG_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import { getFormattedTime } from "@/utils/time"
import Slider from "@react-native-community/slider"
import { FontAwesome6 } from "@expo/vector-icons"
import { Video } from "expo-av"

import type { Media } from "@/components/Feed"
import { DOMAIN } from "@/constants/general"

export interface vtt {
    start:number,
    end:number,
    image:string,
    x:number,
    y:number,
    w:number,
    h:number
}

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
    onSetScrubberWidth:(event:LayoutChangeEvent) => void,
    scrubber_width:number,
    current_video:Video|null
    onStartControlsTimer:() => void,
    onStopControlsTimer:() => void,
    onIsScrubberDragged:(is_scrubber_dragged:boolean) => void,
    is_scrubber_dragged:boolean,
    onVttVideoScrubberPreviewUpdate:(video_scrubber_preview:vtt|null) => void,
    onVttVideoScrubberPreviewImageUpdate:(sprite_sheet:string) => void,
    onScrubberPositionUpdate:(scrubber_position:number) => void,
    scrubber_position:number,
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
    onSetScrubberWidth,
    scrubber_width,
    current_video,
    onStartControlsTimer,
    onStopControlsTimer,
    onIsScrubberDragged,
    is_scrubber_dragged,
    onVttVideoScrubberPreviewUpdate,
    onVttVideoScrubberPreviewImageUpdate,
    onScrubberPositionUpdate,
    scrubber_position
}:CustomVideoControlsProps) => {
    const [scrubber_progress, setScrubberProgress] = useState<number>(0) // Stores The Scrubber Progress
    
    const [scrubber_time, setScrubberTime] = useState<number>(0) // Stores The Scrubber Time
    const [vtt_video_previews, setVttVideoPreviews] = useState<vtt[]>([]) // Stores The VTT Video Previews

    // Function For Get The Volume Icon
    const getVolumeIcon = ():string => {
        const current_volume:number = is_muted ? 0 : volume // Gets The Current Volume (0 If The Video Is Muted)

        if(current_volume === 0) return "volume-xmark"
        if(current_volume <= 0.5) return "volume-low"
        return "volume-high"
    }

    // Creates The Scrubbar Gesture
    const scrubbar_gesture:PanResponderInstance = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true, // Enables The Tap
            onMoveShouldSetPanResponder: () => true, // Enables The Move
    
            // Tap Start (mousedown / touchstart)
            onPanResponderGrant: (event:GestureResponderEvent):void => {
                onStopControlsTimer() // Stops The Controls Timer
                onIsScrubberDragged(true) // Sets The Information That The Scrubber Is Dragged
                calculateAndSetScrubberProgress(event) // Calculate End Set The Scrubber Progress
            },
    
            // Move (mousemove / touchmove)
            onPanResponderMove: (event:GestureResponderEvent):void => {
                calculateAndSetScrubberProgress(event) // Calculate End Set The Scrubber Progress
            },
    
            // Tap End (mouseup / touchend)
            onPanResponderRelease: async (event:GestureResponderEvent):Promise<void> => {
                onIsScrubberDragged(false) // Sets The Information That The Scrubber Isn't Dragged
                
                const scrubber_progress:number|undefined = calculateAndSetScrubberProgress(event) // Calculate End Set The Scrubber Progress

                if(scrubber_progress !== undefined && duration > 0) {
                    const video_time:number = scrubber_progress * duration // Gets The Video Time
                    if(current_video) await current_video.setPositionAsync(video_time) // Sets The New Current Video Time Position
                }

                onStartControlsTimer() // Starts The Controls Timer
            }
        })
    ).current

    // Function For Load The VTT File Data
    const loadVttData = async (vtt_url:string) => {
        try {
            // Sends The GET Request To The Server
            const loaded_vtt_file_response:Response = await fetch(`${DOMAIN}/media/${vtt_url}`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            })

            const loaded_vtt_file_text:string = await loaded_vtt_file_response.text() // Gets The Text Content Of The VTT File
            const regex:RegExp = /(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})\s+(.+)#xywh=(\d+),(\d+),(\d+),(\d+)/g;
            let match

            while((match = regex.exec(loaded_vtt_file_text)) !== null) {
                // Stores The Data Of VTT Video Preview To All VTT Video Previews
                const new_vtt_video_previews:vtt = {
                    start: parseVttTime(match[1] as string),
                    end: parseVttTime(match[2] as string),
                    image: match[3] as string,
                    x: parseInt(match[4] as string),
                    y: parseInt(match[5] as string),
                    w: parseInt(match[6] as string),
                    h: parseInt(match[7] as string)
                }

                // Sets The VTT Video Previews
                setVttVideoPreviews((previous_vtt_video_previews:vtt[]) => {
                    return [...previous_vtt_video_previews, new_vtt_video_previews] // Returns The Combined VTT Video Previews
                })
            }
        } 
        
        catch {
            console.error("Pri získavaní náhľadov pre video došlo k chybe.")
        } 
    }

    // Initializes The Load Of The VTT File Data
    useEffect(() => {
        if(one_post_media.vtt_file) loadVttData(one_post_media.vtt_file) // Loads The VTT File Data
    }, [one_post_media])

    // Function For Parse The VTT Time
    const parseVttTime = (time:string):number => {
        const parts:string[] = time.split(':')
        const seconds_parts:string[] = (parts[2] as string).split('.')

        return parseInt(parts[0] as string) * 3600 + parseInt(parts[1] as string) * 60 + parseInt(seconds_parts[0] as string) + parseFloat('0.' + seconds_parts[1] as string)
    }

    // Function For Initialize The Video Preview
    const initializeVideoPreview = ():void => {
        const current_video_preview:vtt|null = vtt_video_previews.find(one_vtt_video_preview => (scrubber_time / 1000) >= one_vtt_video_preview.start && (scrubber_time / 1000) <= one_vtt_video_preview.end) || null // Gets The Current Video Preview
        onVttVideoScrubberPreviewUpdate(current_video_preview) // Sets The VTT Video Scrubber Preview
        if(one_post_media.sprite_sheet) onVttVideoScrubberPreviewImageUpdate(`media/${one_post_media.sprite_sheet}`) // Sets The VTT Video Scrubber Preview
    }

    // Initializes The Load Of The VTT File Data
    useEffect(() => {
        initializeVideoPreview() // Loads The VTT File Data
    }, [scrubber_time, vtt_video_previews, one_post_media, scrubber_position])

    // Function For Calculate End Set The Scrubber Progress (funguje pre Web aj Native)
    const calculateAndSetScrubberProgress = (event:GestureResponderEvent):number|undefined => {
        if(scrubber_width === 0) return
    
        const native_event:any = event.nativeEvent as any // Gets The Native Event (iOS / Android)
        const scrubber_position:number|undefined = native_event.locationX ?? native_event.offsetX // Gets Current Clicked Scrubber Position
    
        if(scrubber_position === undefined) return
    
        const clamped_position:number = Math.min(Math.max(0, scrubber_position), scrubber_width)
        const scrubber_progress:number = clamped_position / scrubber_width // Calculates The Current Scrubber Progress

        setScrubberProgress(scrubber_progress) // Sets The Scrubber Progress
        onScrubberPositionUpdate(scrubber_position) // Sets The Scrubber Position
        setScrubberTime(duration * scrubber_progress) // Sets The Scrubber Time
        
        return scrubber_progress // Returns The Scrubber Progress
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
                        {!is_scrubber_dragged ? (
                            `${getFormattedTime("minutes", elapsed_time / 1000)}:${getFormattedTime("seconds", elapsed_time / 1000, true)}`
                        ) : (
                            `${getFormattedTime("minutes", scrubber_time / 1000)}:${getFormattedTime("seconds", scrubber_time / 1000, true)}`
                        )}
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

            <View 
                className="scrubber_hitbox" 
                onLayout={onSetScrubberWidth} 
                style={styles.scrubber_hitbox}
                {...scrubbar_gesture.panHandlers} 
            />

            <View className="scrubber" style={styles.scrubber}>
                <View 
                    className="scrubber_track" 

                    style={[
                        styles.scrubber_track,

                        { 
                            width: duration > 0 
                                ? (is_scrubber_dragged ? `${scrubber_progress * 100}%` : `${(elapsed_time / duration) * 100}%`) 
                                : "0%" 
                        }
                    ]}
                />

                <View 
                    className="scrubber_thumb" 

                    style={[
                        styles.scrubber_thumb,

                        { 
                            marginLeft: duration > 0 
                                ? (is_scrubber_dragged ? `${scrubber_progress * 100}%` : `${(elapsed_time / duration) * 100}%`) 
                                : "0%" 
                        }
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
        position: "absolute",
        bottom: -10 + (5 / 2),
        width: "100%",
        height: 20,
        marginHorizontal: "auto",
        paddingVertical: 5,
    },

    scrubber: {
        position: "absolute",
        bottom: 0,
        width: "100%",
        height: 5,
        backgroundColor: LIGHT_BLUE_COLOR,
        borderRadius: 8 / 2,
        pointerEvents: "none",

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
        pointerEvents: "none",
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
        pointerEvents: "none",
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
        pointerEvents: "none",
    },
})