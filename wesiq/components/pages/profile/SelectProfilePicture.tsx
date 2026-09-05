import React, { useState, useRef } from "react"
import { Pressable, Alert, StyleSheet, Animated, Image, View } from "react-native"
import * as ImagePicker from "expo-image-picker"
import {LIGHT_BLUE_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"

type SelectProfilePictureProps = {
    onProfilePictureSelection:(media:ImagePicker.ImagePickerAsset) => void,
    previous_profile_picture:string|null,
    is_subscriber:boolean
}

const AnimatedImage = Animated.createAnimatedComponent(Image) // Creates The Animated Image Element

export default function SelectProfilePicture({ 
    onProfilePictureSelection, 
    previous_profile_picture, 
    is_subscriber 
}:SelectProfilePictureProps) {
    const [is_pressed, setIsPressed] = useState(false) // Stores The Information If The Button Is Pressed
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

    // Function For Handle Media Selection
    const handleSelectMedia = async () => {
        const permission_result = await ImagePicker.requestMediaLibraryPermissionsAsync() // Gets The Permission Result

        if(!permission_result.granted) {
            Alert.alert("Prístup zamietnutý", "Pre výber fotiek musíte povoliť prístup.") // Shows The Alert
            return
        }

        // Opens The Gallery
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, // Only Images
            allowsMultipleSelection: false, // Single Selection
            quality: 1
        })

        if(!result.canceled && result.assets.length > 0) {
            onProfilePictureSelection(result.assets[0]) // Handles The Profile Picture Selection
        }
    }

    return (
        <Pressable 
            onPress={handleSelectMedia} 
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            accessibilityRole="button"
            accessibilityLabel="Nahrať obrázok"
        >
            <View className="profile_picture_container" style={styles.profile_picture_container}>
                <AnimatedImage 
                    className={`profile_picture skeleton_loading ${
                        is_subscriber ? "subscriber" : "" // Adds The Subscriber Class
                    }`}

                    source={
                        previous_profile_picture ? { uri: previous_profile_picture } : require("../../../assets/images/profile_picture.png") // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
                    }

                    style={[
                        styles.profile_picture,
                        is_subscriber && styles.subscriber_profile_picture,
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
        width: 64,
        height: 64,
        borderRadius: 64 / 2,
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