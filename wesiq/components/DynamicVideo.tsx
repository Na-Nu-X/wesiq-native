import React, { useState, useEffect, useRef, RefObject, useMemo } from "react"
import { View, Image, StyleSheet, Text, Pressable } from "react-native"
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av"
import { DOMAIN } from "@/constants/general"
import { Media, Post } from "./Feed"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { FontAwesome6 } from "@expo/vector-icons"
import { BIG_BORDER_RADIUS } from "@/constants/borders"
import Icon from "./Icon"
import Slider from "@react-native-community/slider"
import { getFormattedTime } from "@/utils/time"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"

interface DynamicVideoProps {
    one_post:Post,
    one_post_media:Media,
    playing_video:number|null,
    setPlayingVideo:(id:number|null) => void,
    data_saving_mode:boolean,
    is_volume_slider_sliding:RefObject<boolean>,
    onVideoDurationLoad:(video_duration:number) => void
}

export const DynamicVideo = ({ one_post, one_post_media, playing_video, setPlayingVideo, data_saving_mode, is_volume_slider_sliding, onVideoDurationLoad }:DynamicVideoProps) => {
    const [aspect_ratio, setAspectRatio] = useState<number>(16 / 9) // Stores The Aspect Ratio (16 / 9 By Default)
    const thumbnail_url:string = `${DOMAIN}/media/${one_post_media.thumbnail}` // Sets The Thumbnail URL

    const [active_quality, setActiveQuality] = useState<number>(data_saving_mode ? 480 : -1) // Stores The Active Video Quality (480p When The Data Saving Mode Is Enabled, Otherwise Auto By Default)
    const saved_position = useRef<number>(0) // Stores The Saved Video Position
    const [video_speed, setVideoSpeed] = useState<number>(1) // Stores The Video Speed

    const video = useRef<Video>(null) // Stores The Video Reference

    const [is_muted, setIsMuted] = useState<boolean>(false) // Stores The Information If The Video Is Muted
    const [volume, setVolume] = useState<number>(0) // Stores The Video Volume

    const [elapsed_time, setElapsedTime] = useState<number>(0) // Stores The Elapsed Video Time
    const [duration, setDuration] = useState<number>(0) // Stores The Video Duration
    const [buffered_time, setBufferedTime] = useState<number>(0) // Stores The Video Buffered Time

    const video_settings = useRef<BottomSheetModal>(null) // Stores The Video Settings
    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points
    const [video_settings_sheet, setVideoSettingsSheet] = useState<"main"|"quality"|"speed">("main") // Stores The Active Video Settings Sheet

    useEffect(() => {
        if(thumbnail_url) {
            Image.getSize(
                thumbnail_url, 

                (width, height) => {
                    if(height > 0) setAspectRatio(width / height) // Sets The Aspect Ratio
                }, 

                (error) => {
                    console.error("Nepodarilo sa zistiť veľkosť náhľadu videa:", error)
                }
            )
        }
    }, [thumbnail_url])

    // Updates The Data Saving Mode Value If The Data Loads
    useEffect(() => {
        if(data_saving_mode) setActiveQuality(480)
        else setActiveQuality(-1)
    }, [data_saving_mode])

    // Function For Rewind The Video 5 Seconds
    const stepBack = async (step:number = 5):Promise<void> => {
        if(video.current) {
            const new_time:number = Math.max(0, elapsed_time - step * 1000) // Gets The New Video Time
            await video.current.setPositionAsync(new_time) // Sets The New Current Video Time Position

            // // Step Back Indicator
            // step_back_indicator.classList.add("hidden")
            // void step_back_indicator.offsetWidth
            // step_back_indicator.classList.remove("hidden")

            // setTimeout(() => {
            //     step_back_indicator.classList.add("hidden")
            // }, 300)
        }
    }

    // Function For Fast Forward The Video 5 Seconds
    const stepFurther = async (step:number = 5):Promise<void> => {
        if(video.current) {
            const new_time:number = Math.max(0, elapsed_time + step * 1000) // Gets The New Video Time
            await video.current.setPositionAsync(new_time) // Sets The New Current Video Time Position

            // // Step Back Indicator
            // step_back_indicator.classList.add("hidden")
            // void step_back_indicator.offsetWidth
            // step_back_indicator.classList.remove("hidden")

            // setTimeout(() => {
            //     step_back_indicator.classList.add("hidden")
            // }, 300)
        }
    }

    // Function For Get The Volume Icon
    const getVolumeIcon = ():string => {
        const current_volume:number = is_muted ? 0 : volume // Gets The Current Volume (0 If The Video Is Muted)

        if(current_volume === 0) return "volume-xmark"
        if(current_volume <= 0.5) return "volume-low"
        return "volume-high"
    }

    // Function For Mute Or Unmute The Video
    const muteUnmuteVideo = async ():Promise<void> => {
        if(video.current) {
            const next_mute_state:boolean = !is_muted // Gets The Next Mute State
            await video.current.setIsMutedAsync(next_mute_state) // Mutes / Unmutes The Video
            setIsMuted(!is_muted) // Sets The Information If The Video Is Muted
        }
    }

    // Function For Change The Video Volume
    const changeVideoVolume = async (value:number) => {
        setVolume(value) // Sets The Volume
        
        if(video.current) {
            await video.current.setVolumeAsync(value) // Sets The New Video Volume

            if(value === 0 && !is_muted) {
                await video.current.setIsMutedAsync(true) // Mutes The Video
                setIsMuted(true) // Sets The Information If The Video Is Muted
            } 
            
            else if(value > 0 && is_muted) {
                await video.current.setIsMutedAsync(false) // Unmutes The Video
                setIsMuted(false) // Sets The Information If The Video Is Muted
            }
        }
    }

    // Function For Show The Video Settings
    const showVideoSettings = ():void => {
        // setSelectedPost(post) // Sets The Selected Post
        video_settings.current?.present() // Shows The Video Settings
    }

    // Function For Close The Video Settings
    const hideVideoSettings = ():void => {
        // setSelectedPost(null) // Sets The Selected Post
        video_settings.current?.dismiss() // Hides The Video Settings
    }

    // Function For Handle Video Settings Sheet Switching
    const handleVideoSettingsChanges = (index:number) => {
        if(index === -1) setVideoSettingsSheet("main") // Sets The Video Settings Sheet To Default
    }

    // Function For Get The Video URL
    const getVideoURL = (quality:number):string => {
        const base_url:string = `${DOMAIN}/api/stream-video/${one_post.user.id}/${one_post_media.id}` // Gets The Base Video URL
        
        switch(quality) {
            case 1080: return `${base_url}/v2_index.m3u8` // Gets The URL For 1080p Quality
            case 720: return `${base_url}/v1_index.m3u8` // Gets The URL For 720p Quality
            case 480: return `${base_url}/v0_index.m3u8` // Gets The URL For 480p Quality
            default: return `${base_url}/index.m3u8` // Gets The URL For Auto Quality (Master Playlist)
        }
    }

    // Function For Change The Video Quality
    const changeVideoQuality = async (quality:number) => {
        if(video.current) {
            const status:AVPlaybackStatus = await video.current.getStatusAsync() // Gets The Video Status
            if(status.isLoaded) saved_position.current = status.positionMillis // Saves The Video Position
        }
    
        setActiveQuality(quality) // Sets The Active Video Quality
        hideVideoSettings() // Closes The Video Settings
    }

    // Function For Change The Video Speed
    const changeVideoSpeed = async (speed:number):Promise<void> => {
        setVideoSpeed(speed) // Sets The Video Speed

        if(video.current) {
            try {
                await video.current.setRateAsync(speed, true) // Changes The Video Speed
            }
            
            catch {
                console.error("Chyba pri zmene rýchlosti videa.")
            }
        }

        hideVideoSettings() // Closes The Video Settings
    }

    return (
        <View className="video_container" style={styles.video_container}>
            <View className="play_pause_indicator hidden" style={styles.play_pause_indicator}>
                <Icon
                    icon_name={playing_video !== one_post_media.id ? "pause" : "play"}
                    onPress={playing_video !== one_post_media.id ? () => setPlayingVideo(one_post_media.id) : () => setPlayingVideo(null)}
                    size={40}
                    style={playing_video === one_post_media.id ? { marginLeft: 8 } : { marginLeft: 0 }}
                    pressed_color={LIGHT_BLUE_COLOR}
                    color={LIGHT_BLUE_COLOR}
                />
            </View>

            <View className="step_back_indicator hidden" style={styles.step_back_indicator}>
                <FontAwesome6
                    name="angle-left"
                    size={40}
                    color={LIGHT_BLUE_COLOR}
                    // style={{ transition: opacity 0.5s ease, transform 0.2s ease-out; }}
                />

                <Text 
                    style={{ 
                        color: SECONDARY_COLOR, 
                        fontSize: 25,
                    }}

                    // transition: opacity 0.3s ease, transform 0.3s ease-out
                >
                    -5
                </Text>
            </View>

            <View className="step_further_indicator hidden" style={styles.step_further_indicator}>
                <Text 
                    style={{ 
                        color: SECONDARY_COLOR, 
                        fontSize: 25,
                    }}

                    // transition: opacity 0.3s ease, transform 0.3s ease-out
                >
                    +5
                </Text>

                <FontAwesome6
                    name="angle-right"
                    size={40}
                    color={LIGHT_BLUE_COLOR}
                    // style={{ transition: opacity 0.5s ease, transform 0.2s ease-out; }}
                />
            </View>

            <View 
                style={{ 
                    width: "100%", 
                    aspectRatio: aspect_ratio, 
                    backgroundColor: MAIN_COLOR, 
                }}
            >
                {playing_video === one_post_media.id ? (
                    <Video
                        ref={video}
                        className="video"
                        source={{ uri: getVideoURL(active_quality) }}
                        
                        // @ts-ignore
                        selectedVideoTrack={{
                            type: active_quality === -1 ? "auto" : "resolution",
                            value: active_quality === -1 ? undefined : active_quality
                        }}

                        rate={video_speed} 
                        shouldCorrectPitch={true}
                        shouldPlay={true}
                        isLooping={true}
                        isMuted={is_muted}
                        resizeMode={ResizeMode.CONTAIN} 
                        style={{ width: "100%", height: "100%" }}
                        videoStyle={{ width: "100%", height: "100%" }}

                        onLoad={async () => {
                            if(video.current && saved_position.current > 0) {
                                await video.current.setPositionAsync(saved_position.current) // Jumps Back To The Watched Part
                                await video.current.playAsync() // Plays The Video Again
                                saved_position.current = 0 // Removes The Saved Video Position
                            }
                        }}
                        
                        onPlaybackStatusUpdate={(status) => {
                            if(status.isLoaded) {
                                setElapsedTime(status.positionMillis) // Sets The Elapsed Time
                                setVolume(status.volume) // Sets The Volume

                                if(status.durationMillis) {
                                    setDuration(status.durationMillis) // Sets The Duration
                                    onVideoDurationLoad(status.durationMillis) // Sets The Duration
                                }

                                if(status.playableDurationMillis) setBufferedTime(status.playableDurationMillis) // Sets The Buffered Time
                            }
                        }}
                    />
                ) : (
                    <Image 
                        source={{ uri: thumbnail_url }} 
                        style={StyleSheet.absoluteFill} 
                        resizeMode="cover"
                    />
                )}
            </View>

            <View className="controls" style={styles.controls}>
                <View className="buttons" style={styles.buttons}>
                    <View 
                        className="play_pause" 
                        accessibilityLabel={playing_video === one_post_media.id ? "Pozastaviť..." : "Prehrať..."}
                        // &:hover {
                        //     i {
                        //         transform: scale(1.1);
                        //         cursor: pointer;
                        //     }
                        // }
                        style={styles.play_pause}
                    >
                        <Icon
                            icon_name={playing_video === one_post_media.id ? "pause" : "play"}
                            onPress={playing_video !== one_post_media.id ? () => setPlayingVideo(one_post_media.id) : () => setPlayingVideo(null)}
                            size={25}
                            // style={{ transition: transform 0.3s ease; }}
                        />
                    </View>

                    <View 
                        className="step_back" 
                        accessibilityLabel="O 5 sekúnd späť..."
                        // &:hover {
                        //     i {
                        //         transform: scale(1.1);
                        //         cursor: pointer;
                        //     }
                        // }
                    >
                        <Icon
                            icon_name="arrow-rotate-left"
                            onPress={() => stepBack(5)}
                            size={25}
                            // style={{ transition: transform 0.3s ease; }}
                        />
                    </View>

                    <View 
                        className="step_further" 
                        accessibilityLabel="O 5 sekúnd ďalej..."
                        // &:hover {
                        //     i {
                        //         transform: scale(1.1);
                        //         cursor: pointer;
                        //     }
                        // }
                    >
                        <Icon
                            icon_name="arrow-rotate-right"
                            onPress={() => stepFurther(5)}
                            size={25}
                            // style={{ transition: transform 0.3s ease; }}
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
                                        onValueChange={changeVideoVolume}
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
                                        onPress={muteUnmuteVideo}
                                        size={25}
                                        // style={{ transition: transform 0.3s ease; }}
                                    />
                                </View>
                            </>
                        )}

                        {one_post_media.is_muted && (
                            <View className="volume_container">
                                <View className="muted" accessibilityLabel="Video nemá zvuk" style={styles.muted}>
                                    <FontAwesome6
                                        name="volume-xmark"
                                        size={25}
                                        color={"#999999"}
                                        // style={{ transition: transform 0.3s ease; }}
                                    />
                                </View>
                            </View>
                        )}
                    </View>

                    <View 
                        className="show_video_settings_button" 
                        accessibilityLabel="Nastavenia..."
                        // &:hover {
                        //     i {
                        //         transform: scale(1.1);
                        //         cursor: pointer;
                        //     }
                        // }
                        style={styles.show_video_settings_button}
                    >
                        <Icon
                            icon_name="gear"
                            onPress={showVideoSettings}
                            size={25}
                            // style={{ transition: transform 0.3s ease; }}
                        />
                    </View>

                    <View 
                        className="fullscreen" 
                        accessibilityLabel="Rozstiahnuť..."
                        // &:hover {
                        //     i {
                        //         transform: scale(1.1);
                        //         cursor: pointer;
                        //     }
                        // }
                        style={styles.fullscreen}
                    >
                        <Icon
                            icon_name="expand"
                            // onPress={}
                            size={25}
                            // style={{ transition: transform 0.3s ease; }}
                        />
                    </View>
                </View>

                <View className="scrubber_hitbox" style={styles.scrubber_hitbox}>
                    <View className="scrubber" style={styles.scrubber}>
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
                </View>
            </View>

            <BottomSheetModal
                ref={video_settings}
                snapPoints={snap_points}
                enablePanDownToClose={true}
                onChange={handleVideoSettingsChanges}
                containerStyle={{ zIndex: 9999 }}
            >
                <BottomSheetView style={{ padding: 20 }}>
                    <View className="video_settings">
                        {video_settings_sheet === "main" && (
                            <View style={styles.sheet_container}>
                                <Pressable
                                    className="show_video_quality_button"
                                    onPress={() => setVideoSettingsSheet("quality")}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <View style={styles.sheet_icon}>
                                        <FontAwesome6
                                            name="gear"
                                            size={20}
                                            solid={false}
                                            color={BLUE_COLOR}
                                        />
                                    </View>

                                    <Text style={styles.sheet_text}>Kvalita</Text>
                                </Pressable>

                                <Pressable
                                    className="show_video_speed_button"
                                    onPress={() => setVideoSettingsSheet("speed")}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <View style={styles.sheet_icon}>
                                        <FontAwesome6
                                            name="stopwatch"
                                            size={20}
                                            solid={false}
                                            color={BLUE_COLOR}
                                        />
                                    </View>

                                    <Text style={styles.sheet_text}>Rýchlosť</Text>
                                </Pressable>

                                <Pressable
                                    className="back_video_settings_button"
                                    onPress={hideVideoSettings}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <View style={styles.sheet_icon}>
                                        <FontAwesome6
                                            name="xmark"
                                            size={20}
                                            color={BLUE_COLOR}
                                        />
                                    </View>

                                    <Text style={styles.sheet_text}>Zavrieť</Text>
                                </Pressable>
                            </View>
                        )}

                        {video_settings_sheet === "quality" && (
                            <View className="video_quality" style={styles.sheet_container}>
                                <Pressable
                                    className="quality_button quality_auto"
                                    onPress={() => changeVideoQuality(-1)}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        active_quality === -1 && styles.sheet_item_active,
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <Text style={styles.sheet_text}>auto</Text>
                                </Pressable>

                                <Pressable
                                    className="quality_button quality_1080p"
                                    onPress={() => changeVideoQuality(1080)}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        active_quality === 1080 && styles.sheet_item_active,
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <Text style={styles.sheet_text}>1080p</Text>
                                </Pressable>

                                <Pressable
                                    className="quality_button quality_720p"
                                    onPress={() => changeVideoQuality(720)}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        active_quality === 720 && styles.sheet_item_active,
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <Text style={styles.sheet_text}>720p</Text>
                                </Pressable>

                                <Pressable
                                    className="quality_button quality_480p"
                                    onPress={() => changeVideoQuality(480)}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        active_quality === 480 && styles.sheet_item_active,
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <Text style={styles.sheet_text}>480p (šetrenie dát)</Text>
                                </Pressable>

                                <Pressable
                                    className="back_video_quality_button"
                                    onPress={() => setVideoSettingsSheet("main")}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <View style={styles.sheet_icon}>
                                        <FontAwesome6
                                            name="xmark"
                                            size={20}
                                            color={BLUE_COLOR}
                                        />
                                    </View>

                                    <Text style={styles.sheet_text}>Zavrieť</Text>
                                </Pressable>
                            </View>
                        )}

                        {video_settings_sheet === "speed" && (
                            <View className="video_speed" style={styles.sheet_container}>
                                <Pressable
                                    className="speed_button"
                                    onPress={() => changeVideoSpeed(2)}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <Text style={styles.sheet_text}>2×</Text>
                                </Pressable>

                                <Pressable
                                    className="speed_button"
                                    onPress={() => changeVideoSpeed(1.5)}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <Text style={styles.sheet_text}>1,5×</Text>
                                </Pressable>

                                <Pressable
                                    className="speed_button"
                                    onPress={() => changeVideoSpeed(1)}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <Text style={styles.sheet_text}>Normálna</Text>
                                </Pressable>

                                <Pressable
                                    className="speed_button"
                                    onPress={() => changeVideoSpeed(0.5)}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <Text style={styles.sheet_text}>0,5×</Text>
                                </Pressable>

                                <Pressable
                                    className="back_video_speed_button"
                                    onPress={() => setVideoSettingsSheet("main")}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <View style={styles.sheet_icon}>
                                        <FontAwesome6
                                            name="xmark"
                                            size={20}
                                            color={BLUE_COLOR}
                                        />
                                    </View>

                                    <Text style={styles.sheet_text}>Zavrieť</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </BottomSheetView>
            </BottomSheetModal>
        </View>
    )
}

const styles = StyleSheet.create({
    video_container: {
        position: "relative",

        // &:hover {
        //     .controls {
        //         display: flex;
        //         opacity: 1;
        //     }
        // }

        // &:fullscreen {
        //     top: 0px !important;
        //     left: 0px !important;
        //     width: 100vw !important;
        //     height: 100vh !important;
        //     margin: 0px !important;
        //     padding: 0px !important;

        //     .controls {
        //         .buttons {
        //             padding: 0px calc(50px);
        //         }
        //     }
        // }
    },

    play_pause_indicator: {
        position: "absolute",
        top: "50%",
        left: "50%",

        transform: [
            { translateX: "-50%" },
            { translateY: "-50%" }
        ],

        alignItems: "center",
        justifyContent: "center",

        // pointerEvents: "none",
        opacity: 1,
        width: 50,
        height: 50,
        backgroundColor: transparentize(MAIN_COLOR, 0.8),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: opacity 0.3s ease;
        zIndex: 50,

        // &.hidden {
        //     opacity: 0;
        // }
    },

    step_back_indicator: {
        position: "absolute",
        top: "50%",
        left: 50,
        transform: [{ translateY: "-50%" }],
        // pointerEvents: "none",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 50,
        zIndex: 50,

        // &.hidden {
        //     span {
        //         opacity: 0;
        //         transform: scale(1.1);
        //     }
        // }

        // &.hidden {
        //     .fa-angle-left {
        //         opacity: 0;
        //         transform: translateX(-10px);
        //     }
        // }
    },

    step_further_indicator: {
        position: "absolute",
        top: "50%",
        right: 50,
        transform: [{ translateY: "-50%" }],
        // pointerEvents: "none",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 50,
        zIndex: 50,

        // &.hidden {
        //     span {
        //         opacity: 0;
        //         transform: scale(1.1);
        //     }
        // }

        // &.hidden {
        //     .fa-angle-right {
        //         opacity: 0;
        //         transform: translateX(10px);
        //     }
        // }
    },

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
        direction: "rtl",
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
        transform: [{ translateY: "50%" }],
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

    sheet_container: {
        paddingBottom: 20,
    },

    sheet_item: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
        paddingVertical: 20,
        paddingHorizontal: 10,
    },

    sheet_item_active: {
        backgroundColor: LIGHT_BLUE_COLOR,
    },

    sheet_item_border: {
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.8),
    },

    sheet_item_pressed: {
        opacity: 0.5,
    },

    sheet_icon: {
        width: 20,
        alignItems: "center",
        justifyContent: "center",
    },

    sheet_text: {
        color: BLUE_COLOR,
    },
})