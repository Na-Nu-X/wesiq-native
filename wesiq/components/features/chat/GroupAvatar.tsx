// Avatar Of A Group Chat (The Group Photo, Otherwise A Group Icon)

import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { Icon } from "@/components/ui"
import { colors } from "@/theme"
import { getAttachmentUrl } from "./MessageBubble"

interface GroupAvatarProps {
    avatar:string|null, // Media Path Of The Group Photo
    name:string|null,
    size?:number
}

export default function GroupAvatar({ avatar, name, size = 40 }:GroupAvatarProps) {
    const avatar_url:string|null = getAttachmentUrl(avatar) // Gets The Full URL
    const [failed_url, setFailedUrl] = useState<string|null>(null) // Stores The URL That Failed To Load
    const has_picture:boolean = avatar_url !== null && failed_url !== avatar_url // Checks If It Has Picture

    return (
        <View
            accessibilityRole = "image"
            accessibilityLabel = {name ?? undefined}
            style = {[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
        >
            {has_picture && avatar_url ? (
                <Image
                    source = {{ uri: avatar_url }}
                    style = {{ width: size, height: size, borderRadius: size / 2 }}
                    contentFit = "cover"
                    transition = {150}
                    recyclingKey = {avatar_url}
                    onError = {() => setFailedUrl(avatar_url)}
                />
            ) : (
                <Icon
                    name = "user-group"
                    size = {Math.round(size * 0.4)}
                    color = "primary_text"
                />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: colors.primary_soft,
        borderWidth: 1,
        borderColor: colors.border,
    },
})
