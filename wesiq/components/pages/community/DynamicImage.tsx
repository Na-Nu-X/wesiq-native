import { useState, useEffect } from "react"
import { Image, StyleProp, ImageStyle } from "react-native"
import { useTranslation } from "react-i18next"

interface DynamicImageProps {
    uri:string,
    scale_by_aspect_ratio?:boolean,
    style?:StyleProp<ImageStyle>,
}

export const DynamicImage = ({ uri, style, scale_by_aspect_ratio = false }: DynamicImageProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const [dimensions, setDimensions] = useState<{ width:number, height:number }|null>(null) // Stores The Dimensions
    const [aspect_ratio, setAspectRatio] = useState<number>(1) // Stores The Aspect Ratio (1 / 1 By Default)

    useEffect(() => {
        if(uri) {
            Image.getSize(
                uri,

                (width, height) => {
                    setDimensions({ width, height }) // Sets The Dimensions
                    if(height > 0) setAspectRatio(width / height) // Sets The Aspect Ratio
                },

                (error) => {
                    console.error(t("Nepodarilo sa zistiť veľkosť obrázka:"), error)
                }
            )
        }
    }, [uri])

    if(!dimensions) return null

    return (
        <Image
            source={{ uri }}
            resizeMode="stretch"

            style={[
                scale_by_aspect_ratio ? { 
                    width: "100%", 
                    aspectRatio: aspect_ratio,
                } : {
                    width: dimensions.width,
                    height: dimensions.height,
                },

                style,
            ]}
        />
    )
}