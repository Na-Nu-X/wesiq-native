import { useState, useEffect } from "react"
import { Image, StyleProp, ImageStyle } from "react-native"

interface DynamicImageProps {
    uri:string,
    style?:StyleProp<ImageStyle>,
}

export const DynamicImage = ({ uri, style }: DynamicImageProps) => {
    const [dimensions, setDimensions] = useState<{ width:number, height:number }|null>(null) // Stores The Dimensions

    useEffect(() => {
        if(uri) {
            Image.getSize(
                uri,

                (width, height) => {
                    setDimensions({ width, height }) // Sets The Dimensions
                },

                (error) => {
                    console.error("Nepodarilo sa zistiť veľkosť obrázka:", error)
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
                { 
                    width: dimensions.width,
                    height: dimensions.height,
                },

                style,
            ]}
        />
    )
}