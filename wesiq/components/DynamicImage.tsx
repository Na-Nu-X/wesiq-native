import React, { useState, useEffect } from "react"
import { Image } from "react-native"

interface DynamicImageProps {
    uri:string
}

export const DynamicImage = ({ uri }:DynamicImageProps) => {
    const [aspect_ratio, setAspectRatio] = useState<number>(1 / 1) // Stores The Aspect Ratio (1 / 1 By Default)

    useEffect(() => {
        if(uri) {
            Image.getSize(
                uri, 

                (width, height) => {
                    if(height > 0) setAspectRatio(width / height) // Sets The Aspect Ratio
                }, 

                (error) => {
                    console.log("Nepodarilo sa zistiť veľkosť obrázka:", error)
                }
            )
        }
    }, [uri])

    return (
        <Image
            source={{ uri }}

            style={{ 
                width: "100%", 
                aspectRatio: aspect_ratio,
                resizeMode: "cover"
            }}
        />
    )
}