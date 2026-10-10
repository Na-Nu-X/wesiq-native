import { useRef, useState } from "react"
import { Text, StyleSheet, Animated } from "react-native"
import { AudioPlayer, useAudioPlayer } from "expo-audio"
import { useTranslation } from "react-i18next"
import { GREEN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { BIG_BORDER_RADIUS } from "@/constants/borders"

export const CompletedTaskMessage = () => {
    const { t } = useTranslation() // Initializes The Translations

    const [gained_xp_text, setGainedXpText] = useState<string|null>(null) // Stores The Gained XP Text

    const translateY = useRef(new Animated.Value(0)).current // Animates The Translate Y Movement
    const fade = useRef(new Animated.Value(0)).current // Animates The Fade

    const success_sound:AudioPlayer = useAudioPlayer(require("@/assets/sounds/success.mp3")) // Gets The Sound

    // Function For Play The Success Sound
    const playSuccessSound = ():void => {
        try {
            success_sound.currentTime = 0 // Resets The Time
            success_sound.play() // Plays The Sound
        } 
        
        catch {
            console.error(t("Pri prehrávaní zvuku došlo k chybe."));
        }
    }

    // Function For Trigger The Completed Task Message
    const triggerCompletedTaskMessage = (gained_xp:number):void => {
        setGainedXpText(`+${gained_xp} XP`) // Sets The Gained XP Text

        translateY.setValue(0)
        fade.setValue(1)

        playSuccessSound() // Plays The Success Sound

        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -100,
                duration: 3000,
                useNativeDriver: true
            }),

            Animated.timing(fade, {
                toValue: 0,
                duration: 3000,
                useNativeDriver: true
            })
        ]).start()
    }

    return {
        triggerCompletedTaskMessage,

        AnimatedCompletedTaskMessage: (
            <Animated.View
                pointerEvents="none"

                style={[
                    styles.gained_xp_text_container,

                    {
                        transform: [{ translateY: translateY }],
                        opacity: fade,
                    }
                ]}
            >
                <Text style={styles.gained_xp_text}>{gained_xp_text}</Text>
            </Animated.View>
        )
    }
}

const styles = StyleSheet.create({
    gained_xp_text_container: {
        position: "absolute",
        top: "50%",
        alignSelf: "center",
        userSelect: "none",
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: transparentize(GREEN_COLOR, 0.5),
        borderWidth: 1,
        borderColor: GREEN_COLOR,
        borderRadius: BIG_BORDER_RADIUS,
        shadowColor: GREEN_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
        zIndex: 9999,
    },

    gained_xp_text: {
        color: SECONDARY_COLOR,
        fontSize: 20,
        fontWeight: "bold",
    },
})