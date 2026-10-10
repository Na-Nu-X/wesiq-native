import { BIG_BORDER_RADIUS } from "@/constants/borders"
import { SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { useVideoPlayer, VideoPlayer, VideoView } from "expo-video"
import { Pressable, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

interface FullscreenVideoPlayerProps {
    url:string, 
    onClose:() => void
}

export const FullscreenVideoPlayer = ({ url, onClose }:FullscreenVideoPlayerProps) => {
    const { t } = useTranslation() // Initializes The Translations

    // Creates The Video Player
    const video_player:VideoPlayer = useVideoPlayer(url, player => {
        player.play() // Plays The Video
    })

    return (
        <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center" }}>
            <VideoView 
                player={video_player} 
                style={{ width: "100%", height: "100%" }} 
            />

            <Pressable 
                onPress={onClose}

                style={{ 
                    position: "absolute", 
                    top: 50,
                    right: 20, 
                    backgroundColor: transparentize(SECONDARY_COLOR, 0.8),
                    padding: 10,
                    borderRadius: BIG_BORDER_RADIUS,
                }}
            >
                <Text style={{ color: SECONDARY_COLOR, fontWeight: "bold" }}>{t("Zavrieť")}</Text>
            </Pressable>
        </View>
    )
}