import React, { useState, useRef } from "react"
import { StyleSheet, Pressable, Image, Animated, View } from "react-native"
import { LIGHT_BLUE_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"

import type { LoggedInUser } from "@/app/(tabs)"

type IconProps = {
    logged_in_user:LoggedInUser,
    label:string
}

const AnimatedImage = Animated.createAnimatedComponent(Image) // Creates The Animated Image Element

export default function ProfilePictureLink({ logged_in_user, label = "Môj účet" }:IconProps) {
    const [is_pressed, setIsPressed] = useState<boolean>(false) // Stores The Information If The Button Is Pressed
    const animation_value = useRef(new Animated.Value(0)).current // Stores The Animation Value

    if(!logged_in_user) return null

    // Function For Handle Press In
    const handlePressIn = () => {
        setIsPressed(true)

        Animated.timing(animation_value, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start()
    }

    // Function For Handle Press Out
    const handlePressOut = () => {
        setIsPressed(false)

        Animated.timing(animation_value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
        }).start()
    }

    // Animates The Scale
    const animated_scale = animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.05]
    })

    return (
        <Pressable 
            // onPress={handleGoToProfile}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            accessibilityRole="button"
            accessibilityLabel={label} 
        >
            <View className="profile_picture_container" style={styles.profile_picture_container}>
                <AnimatedImage 
                    className={`profile_picture skeleton_loading ${
                        logged_in_user.subscription && logged_in_user.subscription.is_active ? "subscriber" : "" // Adds The Subscriber Class
                    }`}

                    source={
                        logged_in_user.profile_picture_name ? { uri: `https://wesiq.com/media/images/${logged_in_user.id}/${logged_in_user.profile_picture_name}` } : require("../assets/images/profile_picture.png") // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
                    }

                    style={[
                        styles.profile_picture,
                        logged_in_user.subscription && logged_in_user.subscription.is_active && styles.subscriber_profile_picture,
                        { transform: [{ scale: animated_scale }] }
                    ]}
                />
            </View>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    profile_picture_container: {
        padding: 2,
        borderWidth: 1,
        borderColor: LIGHT_BLUE_COLOR,
        borderRadius: 38 / 2,
    },

    profile_picture: {
        width: 32,
        height: 32,
        borderRadius: 38 / 2,
    },
  
    subscriber_profile_picture: {
        backgroundColor: transparentize(YELLOW_COLOR, 0.85),
        borderColor: transparentize(YELLOW_COLOR, 0.5),
        shadowColor: YELLOW_COLOR,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },
})