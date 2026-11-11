// Frame Preview Above The Scrubber While It Is Dragged (Sprite Sheet Tile From The VTT File)

import { View, StyleSheet } from "react-native"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import { DOMAIN } from "@/constants/general"
import { DynamicImage } from "./DynamicImage"

import type { vtt } from "../activity/CustomVideoControls"

const SCRUBBER_INSET:number = 12.5 // Same As The Scrubber Hitbox In CustomVideoControls
const EDGE_GAP:number = 6 // Keeps The Preview Inside The Video
const TRIANGLE_SIZE:number = 10

interface VideoScrubberPreviewProps {
    video_scrubber_preview:vtt,
    video_scrubber_preview_image:string,
    scrubber_position:number, // Touch X Inside The Scrubber
    scrubber_width:number,
    bottom:number // Distance Of The Scrubber From The Bottom Of The Video
}

export const VideoScrubberPreview = ({ video_scrubber_preview, video_scrubber_preview_image, scrubber_position, scrubber_width, bottom }:VideoScrubberPreviewProps) => {
    const { w, h, x, y } = video_scrubber_preview
    const container_width:number = scrubber_width + SCRUBBER_INSET * 2 // Width Of The Video
    const touch_x:number = SCRUBBER_INSET + Math.min(Math.max(0, scrubber_position), scrubber_width) // Touch X Inside The Video
    const left:number = Math.min(Math.max(EDGE_GAP, touch_x - w / 2), container_width - w - EDGE_GAP) // Centers The Preview Over The Finger
    const triangle_left:number = Math.min(Math.max(TRIANGLE_SIZE, touch_x - left), w - TRIANGLE_SIZE) - TRIANGLE_SIZE // Points At The Finger

    return (
        <View pointerEvents="none" style={[styles.root, { left, bottom: bottom + TRIANGLE_SIZE + 4, width: w, height: h + TRIANGLE_SIZE }]}>
            <View style={[styles.frame, { width: w, height: h }]}>
                <DynamicImage uri={`${DOMAIN}/${video_scrubber_preview_image}`} style={{ position: "absolute", left: -x, top: -y }} />
            </View>

            <View style={[styles.triangle, { top: h, left: triangle_left }]} />
        </View>
    )
}

const styles = StyleSheet.create({
    root: {
        position: "absolute",
        zIndex: 200,
    },

    frame: {
        borderWidth: 1,
        borderColor: "#cccccc",
        borderRadius: SMALL_BORDER_RADIUS,
        opacity: 0.95,
        overflow: "hidden",
    },

    triangle: {
        position: "absolute",
        width: 0,
        height: 0,
        backgroundColor: "transparent",
        borderTopWidth: TRIANGLE_SIZE,
        borderRightWidth: TRIANGLE_SIZE,
        borderRightColor: "transparent",
        borderLeftWidth: TRIANGLE_SIZE,
        borderLeftColor: "transparent",
        borderTopColor: "#cccccc",
    },
})
