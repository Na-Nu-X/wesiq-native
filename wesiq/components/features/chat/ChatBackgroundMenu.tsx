// Chat Background Options: Pick An Image From The Device Or Choose One Of The Built-In Backgrounds
// Rendered As A View Inside The Conversation Menu Sheet (One Modal At A Time, Like The Report View)

import { useState } from "react"
import { ActivityIndicator, LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { Asset } from "expo-asset"
import { useTranslation } from "react-i18next"
import { Card, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { MenuRow } from "@/components/features/posts/PostMenuSheet"

import type { UploadableFile } from "@/lib/api/upload"

const COLUMNS:number = 3 // Tiles Per Row

// Built-In Backgrounds (assets/images/chat_backgrounds)
export const CHAT_BACKGROUNDS:number[] = [
    require("@/assets/images/chat_backgrounds/background_1.jpg"),
    require("@/assets/images/chat_backgrounds/background_2.jpg"),
    require("@/assets/images/chat_backgrounds/background_3.jpg"),
    require("@/assets/images/chat_backgrounds/background_4.jpg"),
    require("@/assets/images/chat_backgrounds/background_5.jpg"),
]

// Function For Turn A Built-In Background Into An Uploadable File (The Server Only Accepts Uploaded Images)
export const getChatBackgroundFile = async (index:number):Promise<UploadableFile> => {
    const asset:Asset = Asset.fromModule(CHAT_BACKGROUNDS[index] as number) // Gets The Bundled Asset
    await asset.downloadAsync() // Copies It To A Local File On Native (On Web The URI Is Fetched By The Upload Helper)

    return { uri: asset.localUri ?? asset.uri, name: `chat_background_${index + 1}.jpg`, mime_type: "image/jpeg", web_file: null }
}

interface ChatBackgroundMenuProps {
    onPickFromDevice:() => void,
    onSelectBackground:(index:number) => void,
    is_busy:boolean,
    selected_index:number|null // The Built-In Background Being Uploaded
}

export default function ChatBackgroundMenu({ onPickFromDevice, onSelectBackground, is_busy, selected_index }:ChatBackgroundMenuProps) {
    const { t } = useTranslation() // Initializes The Translations
    const [grid_width, setGridWidth] = useState<number>(0) // Stores The Grid Width (The Sheet Is Narrower Than The Window On Tablets And Web)

    const tile_width:number = grid_width > 0 ? Math.floor((grid_width - spacing.sm * (COLUMNS - 1)) / COLUMNS) : 0 // Gets The Tile Width

    return (
        <>
            <Card padding = "xs">
                <MenuRow
                    icon = "images"
                    label = {t("Vybrať zo zariadenia")}
                    onPress = {onPickFromDevice}
                    is_disabled = {is_busy}
                />
            </Card>

            <View style = {styles.section}>
                <Text variant = "overline" color = "text_secondary">{t("Predvolené pozadia")}</Text>

                <View style = {styles.grid} onLayout = {(event:LayoutChangeEvent) => setGridWidth(event.nativeEvent.layout.width)}>
                    {CHAT_BACKGROUNDS.map((source:number, index:number) => (
                        <Pressable
                            key = {index}
                            onPress = {() => onSelectBackground(index)}
                            disabled = {is_busy}
                            accessibilityRole = "button"
                            accessibilityLabel = {t("Pozadie {{number}}", { number: index + 1 })}
                            style = {({ pressed }) => [styles.tile, { width: tile_width }, pressed ? styles.tile_pressed : null, is_busy && selected_index !== index ? styles.tile_disabled : null]}
                        >
                            <Image
                                source = {source}
                                style = {styles.image}
                                contentFit = "cover"
                                transition = {150}
                            />

                            {selected_index === index && (
                                <View style = {styles.tile_overlay}>
                                    <ActivityIndicator color = {colors.spinner} />
                                </View>
                            )}
                        </Pressable>
                    ))}
                </View>
            </View>
        </>
    )
}

const styles = StyleSheet.create({
    section: {
        gap: spacing.sm,
    },

    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
    },

    tile: {
        aspectRatio: 9 / 16,
        overflow: "hidden",
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },

    tile_pressed: {
        borderColor: colors.border_strong,
        opacity: 0.85,
    },

    tile_disabled: {
        opacity: 0.5,
    },

    image: {
        width: "100%",
        height: "100%",
    },

    tile_overlay: {
        ...StyleSheet.absoluteFill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.overlay,
    },
})
