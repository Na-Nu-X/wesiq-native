import React from "react"
import { StyleSheet, ViewProps } from "react-native"
import { ImageBackground } from "expo-image"
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg"
import { MAIN_COLOR, BLUE_COLOR } from "@/constants/colors"

type Props = ViewProps & {
  children?: React.ReactNode
}

export default function BackgroundContainer({ children, style, ...props }:Props) {
    return (
        <ImageBackground
            source={require("@/assets/images/background.jpeg")}
            style={[styles.container, style]}
            contentFit="cover"
            {...props}
        >
            <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
                <Defs>
                    <RadialGradient
                        id="main_gradient"
                        cx="50%"
                        cy="40%"
                        rx="60%"
                        ry="60%"
                        fx="50%"
                        fy="40%"
                    >
                        <Stop 
                            offset="35%" 
                            stopColor={MAIN_COLOR} 
                            stopOpacity={0.88} 
                        />

                        <Stop 
                            offset="100%" 
                            stopColor={MAIN_COLOR} 
                            stopOpacity={0.72} 
                        />
                    </RadialGradient>
            
                    <RadialGradient
                        id="top_glow"
                        cx="50%"
                        cy="-20%"
                        rx="100%"
                        ry="80%"
                        fx="50%"
                        fy="-20%"
                    >
                        <Stop 
                            offset="0%" 
                            stopColor={BLUE_COLOR} 
                            stopOpacity={0.22} 
                        />

                        <Stop 
                            offset="55%" 
                            stopColor={BLUE_COLOR} 
                            stopOpacity="0" 
                        />
                    </RadialGradient>
                </Defs>
            
                <Rect width="100%" height="100%" fill="url(#main_gradient)" />
                <Rect width="100%" height="100%" fill="url(#top_glow)" />
            </Svg>

            {children}
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})