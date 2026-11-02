import { View, StyleSheet } from "react-native"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import { DynamicImage } from "./DynamicImage"
import { DOMAIN } from "@/constants/general"

import type { vtt } from "../activity/CustomVideoControls"

interface VideoScrubberPreviewProps {
    video_scrubber_preview:vtt,
    video_scrubber_preview_image:string,
    scrubber_position:number,
    scrubber_width:number
}

export const VideoScrubberPreview = ({ 
    video_scrubber_preview, 
    video_scrubber_preview_image, 
    scrubber_position, 
    scrubber_width 
}:VideoScrubberPreviewProps) => {
    return (
        <View 
            style={{ 
                position: "relative", 
                bottom: video_scrubber_preview.h + 10 + 17.5 + 10 + 20 + 2.5,

                left: Math.min(
                    Math.max(7, scrubber_position - (video_scrubber_preview.w / 2) + 10 + 3), 
                    scrubber_width + 20 - video_scrubber_preview.w
                ),
            }}
        >
            <View 
                className="video_scrubber_preview"

                style={[
                    styles.video_scrubber_preview,

                    {
                        width: video_scrubber_preview.w,
                        height: video_scrubber_preview.h,
                    }
                ]}
            >
                <DynamicImage 
                    uri={`${DOMAIN}/${video_scrubber_preview_image}`}

                    style={{ 
                        position: "absolute",
                        left: -video_scrubber_preview.x,
                        top: -video_scrubber_preview.y,
                    }}
                />
            </View>
        
            <View 
                className="triangle" 

                style={[
                    styles.triangle,

                    {
                        top: video_scrubber_preview.h + 10,
                        left: (video_scrubber_preview.w / 2) - 10,
                    }
                ]} 
            />
        </View>
    )
}

const styles = StyleSheet.create({
    video_scrubber_preview: {
        position: "absolute",
        width: 160,
        height: 90,
        borderWidth: 1,
        borderColor: "#cccccc",
        borderRadius: SMALL_BORDER_RADIUS,
        opacity: 0.9,
        overflow: "hidden",
        zIndex: 200,
    },
    
    triangle: {
        position: "absolute",
        width: 0,
        height: 0,
        backgroundColor: "transparent",
        borderTopWidth: 10,
        borderRightWidth: 10,
        borderRightColor: "transparent",
        borderLeftWidth: 10,
        borderLeftColor: "transparent",
        borderTopColor: "#cccccc",
    },
})