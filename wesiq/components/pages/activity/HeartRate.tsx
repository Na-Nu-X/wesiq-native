import { HeartRateManager } from "@/classes/HeartRate"
import { useEffect, useState } from "react"
import { Alert, AlertButton, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import { SECONDARY_COLOR } from "@/constants/colors"
import { AnimatedHeart } from "./AnimatedHeart"

import type { HeartRateSourceType } from "@/classes/HeartRate"

const heart_rate_manager:HeartRateManager = new HeartRateManager() // Creates The Heart Rate Manager

interface HeartRateProps {
    is_activity_started:boolean
}

export const HeartRate = ({ is_activity_started }:HeartRateProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const [bpm, setBpm] = useState<number|null>(null) // Stores The BPM

    // Function For Connect The Device
    const connectDevice = async (source:HeartRateSourceType) => {
        setBpm(null) // Sets The BPM

        await heart_rate_manager.startMonitoring(source, (new_bpm:number) => {
            setBpm(new_bpm) // Sets The BPM
        })
    }

    // Function For Disconnect The Device
    const disconnectDevice = () => {
        heart_rate_manager.stopMonitoring() // Stops The Monitoring
        setBpm(null) // Sets The BPM
    }

    useEffect(() => {
        return () => {
            heart_rate_manager.stopMonitoring() // Stops The Monitoring
        }
    }, [])

    // Function For Open The Connect Device Menu
    const openConnectDeviceMenu = () => {
        const options:AlertButton[] = [];

        // iOS
        if(Platform.OS === "ios") {
            options.push({ 
                text: "Apple Health (Apple Watch, AirPods...)", 
                onPress: () => connectDevice("APPLE_HEALTH") 
            })
        }
        
        // Android
        else if(Platform.OS === "android") {
            options.push({ 
                text: "Health Connect (Samsung Galaxy Watch, Pixel Watch...)", 
                onPress: () => connectDevice("HEALTH_CONNECT") 
            })
        }

        // Every Device
        options.push({ 
            text: "Bluetooth", 
            onPress: () => connectDevice("BLE") 
        })

        options.push({ 
            text: t("Zrušiť"), 
            style: "cancel" 
        })

        Alert.alert(
            t("Pripojiť zariadenie"),
            t("Zvoľte možnosť pre meranie srdcového tepu."),
            options
        )
    }

    // Initializes The BPM Test
    useEffect(() => {
        connectDevice("TEST") // Connect The Device
    }, [])

    return (
        <View style={styles.heart_rate_container}>
            <View 
                style={{ 
                    flexDirection: "row", 
                    alignItems: "center",
                    gap: 10,
                }}
            >
                <Text style={styles.heart_rate_text}>{bpm && is_activity_started ? bpm : "--"}</Text>
                <AnimatedHeart bpm={is_activity_started ? bpm : 0} />
            </View>

            <View 
                style={{ 
                    marginTop: 20, 
                    gap: 10, 
                }}
            >
                <Pressable onPress={openConnectDeviceMenu} accessibilityLabel="Pripojiť zariadenie" />
                <Pressable onPress={disconnectDevice} accessibilityLabel="Odpojiť zariadenie" />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    heart_rate_container: {
        justifyContent: "center",
        alignItems: "center",
    },

    heart_rate_text: {
        fontSize: 20,
        fontWeight: "bold",
        color: SECONDARY_COLOR,
    },
})