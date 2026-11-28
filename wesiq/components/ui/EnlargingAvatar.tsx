import { useRef, useState } from "react"
import { Animated, Dimensions, Modal, Pressable, StyleSheet } from "react-native"
import Avatar, { AvatarProps } from "./Avatar"
import { getProfilePictureUrl } from "@/lib/media"
import { MAIN_COLOR, transparentize } from "@/constants/colors"

export interface EnlargingAvatarProps extends AvatarProps {
    enlarged_size?:number,
    delay_long_press?:number,
    onPress?:() => void
}

const DEFAULT_ENLARGED_SIZE:number = Math.min(Math.round(Dimensions.get("window").width * 0.72), 280) // Defines The Default Enlarged Size

export default function EnlargingAvatar({
    user,
    size = 40,
    is_ring_hidden = false,
    enlarged_size = DEFAULT_ENLARGED_SIZE,
    delay_long_press = 250,
    onPress
}:EnlargingAvatarProps) {
    const [is_visible, setIsVisible] = useState<boolean>(false) // Stores The Information If The Preview Modal Is Open
    const progress:Animated.Value = useRef(new Animated.Value(0)).current // Stores The Open / Close Animation Progress
    const has_picture:boolean = getProfilePictureUrl(user) !== null // Stores The Information If The User Has A Profile Picture

    // Function For Open The Preview
    const openPreview = ():void => {
        if(!has_picture) return

        progress.setValue(0)
        setIsVisible(true) // Opens The Preview

        // Runs The Animation
        Animated.spring(progress, {
            toValue: 1,
            damping: 18,
            stiffness: 240,
            useNativeDriver: true
        }).start()
    }

    // Function For Close The Preview
    const closePreview = ():void => {
        Animated.timing(progress, {
            toValue: 0,
            duration: 140,
            useNativeDriver: true
        }).start(({ finished }) => {
            if(finished) setIsVisible(false) // Closes The Preview
        })
    }

    // Gets The Scale
    const scale:Animated.AnimatedInterpolation<number> = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.65, 1]
    })

    return (
        <>
            <Pressable
                onPress = {onPress}
                onLongPress = {has_picture ? openPreview : undefined}
                delayLongPress = {delay_long_press}
                disabled = {!onPress && !has_picture}
                accessibilityRole = {onPress || has_picture ? "button" : "image"}
                accessibilityLabel = {user.username}

                style = {({ pressed }) => [
                    styles.trigger,
                    { borderRadius: size / 2 },
                    pressed && has_picture ? styles.pressed : null,
                ]}
            >
                <Avatar
                    user = {user}
                    size = {size}
                    is_ring_hidden = {is_ring_hidden}
                />
            </Pressable>

            {is_visible ? (
                <Modal
                    visible = {is_visible}
                    transparent
                    animationType = "none"
                    statusBarTranslucent
                    onRequestClose = {closePreview}
                >
                    <Animated.View style = {[styles.backdrop, { opacity: progress }]}>
                        <Pressable style = {styles.backdrop_pressable} onPress = {closePreview}>
                            <Animated.View style = {{ transform: [{ scale }] }}>
                                <Avatar
                                    user = {user}
                                    size = {enlarged_size}
                                    is_ring_hidden = {is_ring_hidden}
                                />
                            </Animated.View>
                        </Pressable>
                    </Animated.View>
                </Modal>
            ) : null}
        </>
    )
}

const styles = StyleSheet.create({
    trigger: {
        flexShrink: 0,
    },

    pressed: {
        opacity: 0.9,
    },

    backdrop: {
        flex: 1,
        backgroundColor: transparentize(MAIN_COLOR, 0.2),
    },

    backdrop_pressable: {
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
    },
})