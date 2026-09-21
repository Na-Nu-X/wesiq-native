import { useState, useEffect, useRef, RefObject, useMemo } from "react"
import { View, Image, StyleSheet, Text, Pressable, Modal, TouchableOpacity, LayoutChangeEvent, GestureResponderEvent, PanResponder } from "react-native"
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av"
import { DOMAIN } from "@/constants/general"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { FontAwesome6 } from "@expo/vector-icons"
import { BIG_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet"
import * as ScreenOrientation from "expo-screen-orientation"

import type { Media, Post } from "@/components/Feed"
import { CustomVideoControls } from "../activity/CustomVideoControls"

interface DynamicVideoProps {
    one_post:Post,
    one_post_media:Media,
    onSetPlayingVideo:(id:number|null) => void,
    playing_video:number|null,
    data_saving_mode:boolean,
    is_volume_slider_sliding:RefObject<boolean>,
    onVideoDurationLoad:(video_duration:number) => void,
    onSetIsVideoInitialized:(is_video_initialized:boolean) => void,
    is_video_initialized:boolean
}

export const DynamicVideo = ({ 
    one_post, 
    one_post_media, 
    onSetPlayingVideo, 
    playing_video, 
    data_saving_mode, 
    is_volume_slider_sliding, 
    onVideoDurationLoad,
    onSetIsVideoInitialized,
    is_video_initialized
}:DynamicVideoProps) => {
    const [aspect_ratio, setAspectRatio] = useState<number>(16 / 9) // Stores The Aspect Ratio (16 / 9 By Default)
    const thumbnail_url:string = `${DOMAIN}/media/${one_post_media.thumbnail}` // Sets The Thumbnail URL

    const [active_quality, setActiveQuality] = useState<number>(data_saving_mode ? 480 : -1) // Stores The Active Video Quality (480p When The Data Saving Mode Is Enabled, Otherwise Auto By Default)
    const saved_position = useRef<number>(0) // Stores The Saved Video Position
    const [video_speed, setVideoSpeed] = useState<number>(1) // Stores The Video Speed

    // const video = useRef<Video>(null) // Stores The Video Reference
    const normal_video = useRef<Video>(null) // Stores The Normal Video Reference
    const fullscreen_video = useRef<Video>(null) // Stores The Fullscreen Video Reference
    const getCurrentVideo = ():Video|null => is_fullscreen ? fullscreen_video.current : normal_video.current // Function For Get The Current Video (Normal / Fullscreen)

    const [is_muted, setIsMuted] = useState<boolean>(false) // Stores The Information If The Video Is Muted
    const [volume, setVolume] = useState<number>(0) // Stores The Video Volume

    const [elapsed_time, setElapsedTime] = useState<number>(0) // Stores The Elapsed Video Time
    const [duration, setDuration] = useState<number>(0) // Stores The Video Duration
    const [buffered_time, setBufferedTime] = useState<number>(0) // Stores The Video Buffered Time

    const video_settings = useRef<BottomSheetModal>(null) // Stores The Video Settings
    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points
    const [video_settings_sheet, setVideoSettingsSheet] = useState<"main"|"quality"|"speed">("main") // Stores The Active Video Settings Sheet

    const [show_controls, setShowControls] = useState<boolean>(true) // Stores The Information If The Custom Video Controls Are Visible
    const controls_timeout = useRef<any>(null) // Stores The Controls Timeout
    // const controls_timeout = useRef<NodeJS.Timeout | null>(null)
    const [scrubber_width, setScrubberWidth] = useState<number>(0) // Stores The Scrubber Width

    const [is_fullscreen, setIsFullscreen] = useState<boolean>(false) // Stores The Information If The Video Is In Fullscreen Mode

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

    // Stores The Video Source
    const video_source = useMemo(
        () => ({ uri: getVideoURL(active_quality) }), 
        [one_post.user.id, one_post_media.id, active_quality]
    )

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

    // Initializes The Video Orientation
    useEffect(() => {
        const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
            const orientation:ScreenOrientation.Orientation = event.orientationInfo.orientation // Gets The Current Orientation
            if(orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT) setIsFullscreen(true) // Sets The Information If The Video Is In Fullscreen Mode
            else if(orientation === ScreenOrientation.Orientation.PORTRAIT_UP) setIsFullscreen(false) // Sets The Information If The Video Isn't In Fullscreen Mode
        })
    
        return () => {
            ScreenOrientation.removeOrientationChangeListener(subscription)
        }
    }, [])

    // Function For Initialize (Download) The Video
    const initializeVideo = ():void => {
        onSetIsVideoInitialized(true) // Sets The Information If The Video Is Initialized
        playPauseVideo(one_post_media.id) // Plays The Video
        setShowControls(true) // Sets The Information That The Custom Video Controls Are Visible
        startControlsTimer() // Starts The Controls Timer
    }

    // Function For Play Or Pause The Video
    const playPauseVideo = async (post_media_id:number ):Promise<void> => {
        const current_video:Video|null = getCurrentVideo() // Gets The Current Video (Normal / Fullscreen)
        
        if(playing_video !== null && playing_video === post_media_id) {
            if(current_video) await current_video.pauseAsync() // Pauses The Video
            onSetPlayingVideo(null) // Sets The Current Playing Video
        } 
        
        else {
            if(current_video) await current_video.playAsync() // Plays The Video
            onSetPlayingVideo(post_media_id) // Sets The Current Playing Video
        }
    }

    // Function For Rewind The Video 5 Seconds
    const stepBack = async (step:number = 5):Promise<void> => {
        const current_video:Video|null = getCurrentVideo() // Gets The Current Video (Normal / Fullscreen)

        if(current_video) {
            const new_time:number = Math.max(0, elapsed_time - step * 1000) // Gets The New Video Time
            await current_video.setPositionAsync(new_time) // Sets The New Current Video Time Position

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
        const current_video:Video|null = getCurrentVideo() // Gets The Current Video (Normal / Fullscreen)

        if(current_video) {
            const new_time:number = Math.max(0, elapsed_time + step * 1000) // Gets The New Video Time
            await current_video.setPositionAsync(new_time) // Sets The New Current Video Time Position

            // // Step Back Indicator
            // step_back_indicator.classList.add("hidden")
            // void step_back_indicator.offsetWidth
            // step_back_indicator.classList.remove("hidden")

            // setTimeout(() => {
            //     step_back_indicator.classList.add("hidden")
            // }, 300)
        }
    }

    // Function For Mute Or Unmute The Video
    const muteUnmuteVideo = async ():Promise<void> => {
        const current_video:Video|null = getCurrentVideo() // Gets The Current Video (Normal / Fullscreen)

        if(current_video) {
            const next_mute_state:boolean = !is_muted // Gets The Next Mute State
            await current_video.setIsMutedAsync(next_mute_state) // Mutes / Unmutes The Video
            setIsMuted(!is_muted) // Sets The Information If The Video Is Muted
        }
    }

    // Function For Change The Video Volume
    const changeVideoVolume = async (value:number) => {
        const current_video:Video|null = getCurrentVideo() // Gets The Current Video (Normal / Fullscreen)

        setVolume(value) // Sets The Volume
        
        if(current_video) {
            await current_video.setVolumeAsync(value) // Sets The New Video Volume

            if(value === 0 && !is_muted) {
                await current_video.setIsMutedAsync(true) // Mutes The Video
                setIsMuted(true) // Sets The Information If The Video Is Muted
            } 
            
            else if(value > 0 && is_muted) {
                await current_video.setIsMutedAsync(false) // Unmutes The Video
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

    // Function For Change The Video Quality
    const changeVideoQuality = async (quality:number) => {
        const current_video:Video|null = getCurrentVideo() // Gets The Current Video (Normal / Fullscreen)

        if(current_video) {
            const status:AVPlaybackStatus = await current_video.getStatusAsync() // Gets The Video Status
            if(status.isLoaded) saved_position.current = status.positionMillis // Saves The Video Position
        }
    
        setActiveQuality(quality) // Sets The Active Video Quality
        hideVideoSettings() // Closes The Video Settings
    }

    // Function For Change The Video Speed
    const changeVideoSpeed = async (speed:number):Promise<void> => {
        const current_video:Video|null = getCurrentVideo() // Gets The Current Video (Normal / Fullscreen)

        setVideoSpeed(speed) // Sets The Video Speed

        if(current_video) {
            try {
                await current_video.setRateAsync(speed, true) // Changes The Video Speed
            }
            
            catch {
                console.error("Chyba pri zmene rýchlosti videa.")
            }
        }

        hideVideoSettings() // Closes The Video Settings
    }

    // Function For Toggle The Video Fullscreen
    const toggleVideoFullscreen = async (): Promise<void> => {
        const current_video:Video|null = getCurrentVideo() // Gets The Current Video (Normal / Fullscreen)
        
        if(current_video) {
            const status:AVPlaybackStatus = await current_video.getStatusAsync() // Gets The Video Status
            if(status.isLoaded) saved_position.current = status.positionMillis // Saves The Video Position
            setIsFullscreen((previous_value:boolean) => !previous_value) // Sets The Information If The Video Is In Fullscreen Mode
        }
    }

    // Function For Handle The Tap On The Video
    const handleTapVideo = ():void => {
        if(show_controls) {
            setShowControls(false) // Sets The Information That The Custom Video Controls Are Hidden
            if(controls_timeout.current) clearTimeout(controls_timeout.current) // Clears The Controls Timeout
        } 
        
        else {
            setShowControls(true) // Sets The Information That The Custom Video Controls Are Visible
            startControlsTimer() // Starts The Controls Timer
        }
    }

    // Function For Start The Controls Timer
    const startControlsTimer = ():void => {
        if(controls_timeout.current) clearTimeout(controls_timeout.current) // Clears The Controls Timeout
        
        // 5 Seconds Timeout
        controls_timeout.current = setTimeout(() => {
            setShowControls(false) // Sets The Information That The Custom Video Controls Are Hidden
        }, 5000)
    }

    useEffect(() => {
        return () => {
            if(controls_timeout.current) clearTimeout(controls_timeout.current) // Clears The Controls Timeout
        }
    }, [])

    // // Scrubber Hitbox Mouse Move Functionality
    // scrubber_hitbox.addEventListener("mousemove", async function(event:MouseEvent):Promise<void> {
    //     const scrubber_rect:DOMRect = scrubber_hitbox.getBoundingClientRect() // Gets The Scrubber Rect
    //     const scrubber_width:number = scrubber_hitbox.offsetWidth // Gets The Scrubber Width
    //     const hovered_scrubber_position:number = event.clientX - scrubber_rect.left // Gets Current Hovered Scrubber Position
    //     const scrubber_progress:number = Math.min(Math.max((hovered_scrubber_position / scrubber_width) * 100, 0), 100) // Calculates The Current Scrubber Progress
    //     const hovered_video_time:number = (scrubber_progress / 100) * one_video.duration || 0 // Gets The Hovered Video Time

    //     is_hovered_scrubber = true // Marks The Scrubber As Hovered
    //     scrubber.style.setProperty("--progress", `${scrubber_progress}%`) // Shows The Progress In Scrubber
    //     elapsed_time.textContent = `${getFormattedTime("minutes", hovered_video_time)}:${getFormattedTime("seconds", hovered_video_time, true)}` // Sets The Elapsed Timer

    //     // Video Scrubber Preview

    //     const post_container = this.closest(".post_container") as HTMLDivElement // Gets The Post Container
    //     const video_scrubber_preview:HTMLDivElement = post_container.querySelector(".video_scrubber_preview") as HTMLDivElement // Gets The Video Scrubber Preview Container
    //     const sprite_sheet:string|null = video_container.dataset["sprite_sheet"] || null // Gets The Sprite Sheet Path
    //     const vtt_file:string|null = video_container.dataset["vtt_file"] || null // Gets The VTT File Path
        
    //     let vtt_video_previews:vtt[] = [] // Stores The VTT Video Previews

    //     if(vtt_file && sprite_sheet) {
    //         await loadVttData(vtt_file, vtt_video_previews) // Loads The VTT File Data
    //         initializeVideoPreview(hovered_video_time, vtt_video_previews, sprite_sheet, video_scrubber_preview, hovered_scrubber_position, scrubber_rect, post_container) // Initializes The Video Preview
    //     }
    // })

    // // Scrubber Hitbox Mouse Out Functionality
    // scrubber_hitbox.addEventListener("mouseout", function():void {
    //     const post_container = this.closest(".post_container") as HTMLDivElement // Gets The Post Container
    //     const video_scrubber_preview:HTMLDivElement = post_container.querySelector(".video_scrubber_preview") as HTMLDivElement // Gets The Video Scrubber Preview Container
        
    //     is_hovered_scrubber = false // Marks The Scrubber As No Hovered
    //     scrubber.style.setProperty("--progress", previous_scrubber_progress) // Shows The Progress In Scrubber
    //     elapsed_time.textContent = `${getFormattedTime("minutes", previous_elapsed_time)}:${getFormattedTime("seconds", previous_elapsed_time, true)}` // Sets The Elapsed Timer
    //     video_scrubber_preview.style.display = "none" // Hides The Video Scrubber Preview
    // })

    // Function For Change The Video Time
    const changeVideoTime = async (event:GestureResponderEvent):Promise<void> => {
        const native_event:any = event.nativeEvent as any // Gets The Native Event (iOS / Android)
        const clicked_scrubber_position:number|undefined = native_event.locationX ?? native_event.offsetX // Gets Current Clicked Scrubber Position
    
        if(clicked_scrubber_position === undefined || scrubber_width === 0 || duration === 0) return
    
        const scrubber_progress = Math.min(Math.max(clicked_scrubber_position / scrubber_width, 0), 1) // Calculates The Current Scrubber Progress
        const clicked_video_time = scrubber_progress * duration // Gets The Clicked Video Time
        const current_video:Video|null = getCurrentVideo() // Gets The Current Video (Normal / Fullscreen)

        if(current_video) await current_video.setPositionAsync(clicked_video_time) // Sets The New Current Video Time Position
        startControlsTimer() // Starts The Controls Timer
    }

    return (
        <Pressable 
            className="video_container" 
            onPress={handleTapVideo}
            style={styles.video_container}
        >
            {show_controls && is_video_initialized && (
                <>
                    <View className="play_pause_indicator hidden" style={styles.play_pause_indicator}>
                        <Icon
                            icon_name={playing_video !== one_post_media.id ? "pause" : "play"}
                            onPress={() => playPauseVideo(one_post_media.id)}
                            size={40}
                            style={playing_video === one_post_media.id ? { marginLeft: 8 } : { marginLeft: 0 }}
                            pressed_color={LIGHT_BLUE_COLOR}
                            color={LIGHT_BLUE_COLOR}
                        />
                    </View>

                    <View className="step_back_indicator hidden" style={styles.step_back_indicator}>
                        <Icon
                            icon_name="angle-left"
                            onPress={() => stepBack(5)}
                            size={40}
                            pressed_color={LIGHT_BLUE_COLOR}
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

                        <Icon
                            icon_name="angle-right"
                            onPress={() => stepFurther(5)}
                            size={40}
                            pressed_color={LIGHT_BLUE_COLOR}
                            color={LIGHT_BLUE_COLOR}
                            // style={{ transition: opacity 0.5s ease, transform 0.2s ease-out; }}
                        />
                    </View>
                </>
            )}

            <View 
                style={{ 
                    width: "100%", 
                    aspectRatio: aspect_ratio, 
                    backgroundColor: MAIN_COLOR, 
                }}
            >
                {!is_video_initialized ? (
                    <View style={StyleSheet.absoluteFill}>
                        <Image 
                            source={{ uri: thumbnail_url }} 
                            style={StyleSheet.absoluteFill} 
                            resizeMode="cover"
                        />

                        <View style={styles.play_pause_indicator}>
                            <Icon
                                icon_name="download"
                                onPress={initializeVideo}
                                size={40}
                                pressed_color={LIGHT_BLUE_COLOR}
                                color={LIGHT_BLUE_COLOR}
                            />
                        </View>
                    </View>
                ) : (
                    !is_fullscreen && (
                        <Video
                            ref={normal_video}
                            className="video"
                            source={video_source}
    
                            // @ts-ignore
                            initialStatus={{
                                positionMillis: saved_position.current,
                                shouldPlay: playing_video === one_post_media.id,
                            }}
                            
                            // @ts-ignore
                            selectedVideoTrack={{
                                type: active_quality === -1 ? "auto" : "resolution",
                                value: active_quality === -1 ? undefined : active_quality
                            }}
    
                            rate={video_speed} 
                            shouldCorrectPitch={true}
                            shouldPlay={playing_video === one_post_media.id}
                            useNativeControls={false}
                            isLooping={true}
                            isMuted={is_muted}
                            resizeMode={ResizeMode.CONTAIN} 
                            style={{ width: "100%", height: "100%" }}
                            videoStyle={{ width: "100%", height: "100%" }}
    
                            // onLoad={async () => {
                            //     if(normal_video.current && saved_position.current > 0) {
                            //         await normal_video.current.setPositionAsync(saved_position.current) // Jumps Back To The Watched Part
                            //         // await normal_video.current.playAsync() // Plays The Video Again
                            //         saved_position.current = 0 // Removes The Saved Video Position
                            //     }
                            // }}
                            
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
                    )
                )}

                <Modal
                    visible={is_fullscreen}
                    animationType="fade"
                    supportedOrientations={["landscape", "portrait"]}
                    onRequestClose={() => setIsFullscreen(false)}
                >
                    <View 
                        style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: MAIN_COLOR,
                        }}
                    >
                        <Video
                            ref={fullscreen_video}
                            className="video"
                            source={video_source}
                            
                            // @ts-ignore
                            initialStatus={{
                                positionMillis: saved_position.current,
                                shouldPlay: playing_video === one_post_media.id,
                            }}

                            // @ts-ignore
                            selectedVideoTrack={{
                                type: active_quality === -1 ? "auto" : "resolution",
                                value: active_quality === -1 ? undefined : active_quality
                            }}

                            rate={video_speed} 
                            shouldCorrectPitch={true}
                            shouldPlay={playing_video === one_post_media.id}
                            useNativeControls={false}
                            isLooping={true}
                            isMuted={is_muted}
                            resizeMode={ResizeMode.CONTAIN} 
                            style={{ width: "100%", height: "100%" }}
                            videoStyle={{ width: "100%", height: "100%" }}

                            // onLoad={async () => {
                            //     if(fullscreen_video.current && saved_position.current > 0) {
                            //         await fullscreen_video.current.setPositionAsync(saved_position.current) // Jumps Back To The Watched Part
                            //         // await fullscreen_video.current.playAsync() // Plays The Video Again
                            //         saved_position.current = 0 // Removes The Saved Video Position
                            //     }
                            // }}

                            onPlaybackStatusUpdate={(status) => {
                                if(status.isLoaded) {
                                    setElapsedTime(status.positionMillis) // Sets The Elapsed Time
                                    setVolume(status.volume) // Sets The Volume
    
                                    if(status.durationMillis) {
                                        setDuration(status.durationMillis) // Sets The Duration
                                        // onVideoDurationLoad(status.durationMillis) // Sets The Duration
                                    }
    
                                    if(status.playableDurationMillis) setBufferedTime(status.playableDurationMillis) // Sets The Buffered Time
                                }
                            }}
                        />

                        <CustomVideoControls 
                            one_post_media={one_post_media}
                            onPlayPauseVideo={() => playPauseVideo(one_post_media.id)}
                            playing_video={playing_video}
                            onStepBack={(step:number) => stepBack(step)}
                            onStepFurther={(step:number) => stepFurther(step)}
                            is_muted={is_muted}
                            volume={volume}
                            elapsed_time={elapsed_time}
                            duration={duration}
                            buffered_time={buffered_time}
                            onChangeVideoVolume={(value:number) => changeVideoVolume(value)}
                            is_volume_slider_sliding={is_volume_slider_sliding}
                            onMuteUnmuteVideo={muteUnmuteVideo}
                            onShowVideoSettings={showVideoSettings}
                            is_fullscreen={is_fullscreen}
                            onToggleVideoFullscreen={toggleVideoFullscreen}
                            onHandleScrubberLayout={(event:LayoutChangeEvent) => setScrubberWidth(event.nativeEvent.layout.width)}
                            onChangeVideoTime={changeVideoTime}
                        />
                    </View>
                </Modal>
            </View>

            {show_controls && (
                <CustomVideoControls 
                    one_post_media={one_post_media}
                    onPlayPauseVideo={is_video_initialized ? () => playPauseVideo(one_post_media.id) : initializeVideo}
                    playing_video={playing_video}
                    onStepBack={(step:number) => stepBack(step)}
                    onStepFurther={(step:number) => stepFurther(step)}
                    is_muted={is_muted}
                    volume={volume}
                    elapsed_time={elapsed_time}
                    duration={duration}
                    buffered_time={buffered_time}
                    onChangeVideoVolume={(value:number) => changeVideoVolume(value)}
                    is_volume_slider_sliding={is_volume_slider_sliding}
                    onMuteUnmuteVideo={muteUnmuteVideo}
                    onShowVideoSettings={showVideoSettings}
                    is_fullscreen={is_fullscreen}
                    onToggleVideoFullscreen={toggleVideoFullscreen}
                    onHandleScrubberLayout={(event:LayoutChangeEvent) => setScrubberWidth(event.nativeEvent.layout.width)}
                    onChangeVideoTime={changeVideoTime}
                />
            )}

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
        </Pressable>
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