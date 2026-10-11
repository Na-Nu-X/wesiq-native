import { useState, useEffect } from "react"
import { StyleSheet, Image, Animated, View } from "react-native"
import { LIGHT_BLUE_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import { DOMAIN } from "@/constants/general"

interface ProfilePictureProps {
    user_id:number,
    user_profile_picture_name:string|null,
    user_subscription:boolean,
    width?:number,
    height?:number
}

const AnimatedImage = Animated.createAnimatedComponent(Image) // Creates The Animated Image Element

export default function ProfilePicture({ 
    user_id, 
    user_profile_picture_name, 
    user_subscription, 
    width = 32, 
    height = 32 
}:ProfilePictureProps) {
    const [is_error, setIsError] = useState<boolean>(false) // Stores The Information That There Is An Error

    // Initializes Reset Of The Information That There Is An Error
    useEffect(() => {
        setIsError(false) // Sets The Information That There Isn't An Error
    }, [user_profile_picture_name, user_id])

    return (
        <View className="profile_picture_container" style={styles.profile_picture_container}>
            <AnimatedImage 
                className={`profile_picture ${
                    user_subscription ? "subscriber" : "" // Adds The Subscriber Class
                }`}

                source={
                    user_profile_picture_name && !is_error
                        ? { uri: `${DOMAIN}/media/images/${user_id}/${user_profile_picture_name}` }
                        : require("@/assets/images/profile_picture.png") // https://www.flaticon.com/free-icon/user_3177440
                }

                onError={() => setIsError(true)} // Sets The Information That There Is An Error

                style={[
                    styles.profile_picture,
                    { width: width, height: height },
                    user_subscription && styles.subscriber_profile_picture,
                ]}
            />
        </View>
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