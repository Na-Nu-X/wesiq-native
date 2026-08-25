import React, { useState, useRef } from "react"
import { StyleSheet, Pressable, Image, Animated, View } from "react-native"
import { LIGHT_BLUE_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import { DOMAIN } from "@/constants/general"

import type { LoggedInUser } from "./LoginFormDialog"
import type { User } from "./Feed"

type IconProps = {
    user_id:number,
    user_profile_picture_name:string|null,
    user_subscription:boolean,
    label:string,
    width?:number,
    height?:number
}

const AnimatedImage = Animated.createAnimatedComponent(Image) // Creates The Animated Image Element

export default function ProfilePictureLink({ user_id, user_profile_picture_name, user_subscription, label = "Môj účet", width = 32, height = 32 }:IconProps) {
    const [is_pressed, setIsPressed] = useState<boolean>(false) // Stores The Information If The Button Is Pressed
    const animation_value = useRef(new Animated.Value(0)).current // Stores The Animation Value

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
                        user_subscription ? "subscriber" : "" // Adds The Subscriber Class
                    }`}

                    source={
                        user_profile_picture_name ? { uri: `${DOMAIN}/media/images/${user_id}/${user_profile_picture_name}` } : require("../assets/images/profile_picture.png") // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
                    }

                    style={[
                        styles.profile_picture,
                        { width: width, height: height },
                        user_subscription && styles.subscriber_profile_picture,
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
        borderRadius: 100,
    },

    profile_picture: {
        borderRadius: 100,
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