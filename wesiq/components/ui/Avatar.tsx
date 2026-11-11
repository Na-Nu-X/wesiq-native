import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { colors, radii } from "@/theme"
import { getInitials, getProfilePictureUrl } from "@/lib/media"
import Text from "./Text"

export interface AvatarUser {
    id:number,
    username:string,
    profile_picture_name:string|null,
    first_name?:string|null,
    last_name?:string|null,
    subscription?:{ is_active:boolean }|null
}

export interface AvatarProps {
    user:AvatarUser,
    size?:number,
    is_ring_hidden?:boolean // Hides The Premium Ring (E.g. In Dense Lists)
}

export default function Avatar({ user, size = 40, is_ring_hidden = false }:AvatarProps) {
    const picture_url:string|null = getProfilePictureUrl(user) // Gets The Picture URL
    const [failed_url, setFailedUrl] = useState<string|null>(null) // Stores The URL That Failed To Load
    const has_picture:boolean = picture_url !== null && failed_url !== picture_url // Stores The Information If The Picture Can Be Shown
    const is_premium:boolean = !is_ring_hidden && user.subscription?.is_active === true // Stores The Information If The User Is A Subscriber

    const ring_width:number = size >= 56 ? 3 : 2 // Gets The Ring Width
    const inner_size:number = is_premium ? size - ring_width * 2 - 2 : size // Gets The Size Inside The Ring

    return (
        <View
            accessibilityRole="image"
            accessibilityLabel={user.username}

            style={[
                styles.container,
                { width: size, height: size },
                is_premium ? { borderWidth: ring_width, borderColor: colors.premium, padding: 1 } : null,
            ]}
        >
            {has_picture && picture_url ? (
                <Image
                    source={{ uri: picture_url }}
                    style={{ width: inner_size, height: inner_size, borderRadius: radii.pill }}
                    contentFit="cover"
                    transition={150}
                    recyclingKey={picture_url}
                    onError={() => setFailedUrl(picture_url)}
                />
            ) : (
                <View style={[styles.fallback, { width: inner_size, height: inner_size }]}>
                    <Text variant="label" color="text_accent" style={{ fontSize: Math.max(10, Math.round(inner_size * 0.38)), lineHeight: Math.round(inner_size * 0.5) }}>
                        {getInitials(user)}
                    </Text>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.pill,
    },

    fallback: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface_pressed,
        borderRadius: radii.pill,
    },
})
