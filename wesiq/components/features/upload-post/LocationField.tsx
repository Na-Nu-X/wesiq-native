// Location Search (OpenStreetMap Nominatim, Max. 1 Request Per Second By Their Usage Policy)

import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Icon, IconButton, Text, TextField } from "@/components/ui"
import { colors, layout, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { isArrayOf, isRecord } from "@/lib/api/guards"

export interface PostLocation {
    name:string,
    latitude:number|null, // Null For Free Text Locations
    longitude:number|null
}

interface NominatimPlace {
    display_name:string,
    lat:string,
    lon:string
}

const isNominatimPlace = (value:unknown):value is NominatimPlace => {
    return isRecord(value) && typeof value.display_name === "string" && typeof value.lat === "string" && typeof value.lon === "string"
}

const SEARCH_DELAY_MS:number = 1000 // Nominatim Allows 1 Request Per Second
const MIN_QUERY_LENGTH:number = 3

interface LocationFieldProps {
    value:PostLocation,
    onChange:(location:PostLocation) => void
}

export default function LocationField({ value, onChange }:LocationFieldProps) {
    const { t, i18n } = useTranslation() // Initializes The Translations
    const [results, setResults] = useState<NominatimPlace[]>([]) // Stores The Search Results
    const [is_searching, setIsSearching] = useState<boolean>(false) // Stores The Information If A Search Runs
    const [has_error, setHasError] = useState<boolean>(false) // Stores The Information If The Search Failed
    const debounce_timeout = useRef<ReturnType<typeof setTimeout>|null>(null) // Stores The Debounce Timeout
    const search_controller = useRef<AbortController|null>(null) // Cancels The Previous Search

    // Initializes The Cleanup On Unmount
    useEffect(() => {
        return () => {
            if(debounce_timeout.current) clearTimeout(debounce_timeout.current)
            search_controller.current?.abort()
        }
    }, [])

    // Function For Search Places
    const searchPlaces = async (query:string):Promise<void> => {
        search_controller.current?.abort()
        const controller:AbortController = new AbortController()
        search_controller.current = controller

        setIsSearching(true)
        setHasError(false)

        try {
            const url:string = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=0&limit=8&featuretype=settlement` // Gets The URL

            const response:Response = await fetch(url, {
                signal: controller.signal,

                headers: {
                    "Accept-Language": Platform.OS === "web" ? navigator.language : i18n.language,
                    "User-Agent": "Wesiq - Native App (behulpatrik@gmail.com)", // Required By The Nominatim Usage Policy (Ignored By Browsers)
                },
            })

            const data:unknown = await response.json() // Gets The Data
            if(controller.signal.aborted) return

            if(!response.ok || !isArrayOf(data, isNominatimPlace)) {
                setHasError(true)
                setResults([])
                return
            }

            // Removes Duplicate Names
            setResults(data.filter((place:NominatimPlace, index:number) => data.findIndex((other:NominatimPlace) => other.display_name === place.display_name) === index))
        }

        catch {
            if(!controller.signal.aborted) {
                setHasError(true)
                setResults([])
            }
        }

        finally {
            if(!controller.signal.aborted) setIsSearching(false)
        }
    }

    // Function For Handle Typing (A Typed Location Has No Coordinates Until A Result Is Picked)
    const handleChangeText = (text:string):void => {
        onChange({ name: text, latitude: null, longitude: null })

        if(debounce_timeout.current) clearTimeout(debounce_timeout.current)

        if(text.trim().length < MIN_QUERY_LENGTH) {
            search_controller.current?.abort()
            setResults([])
            setIsSearching(false)
            return
        }

        debounce_timeout.current = setTimeout(() => searchPlaces(text.trim()), SEARCH_DELAY_MS)
    }

    // Function For Select A Place
    const selectPlace = (place:NominatimPlace):void => {
        const latitude:number = Number(place.lat) // Gets The Latitude
        const longitude:number = Number(place.lon) // Gets The Longitude

        haptics.selection()
        onChange({ name: place.display_name, latitude: Number.isFinite(latitude) ? latitude : null, longitude: Number.isFinite(longitude) ? longitude : null })
        setResults([])
    }

    // Function For Clear The Location
    const clear = ():void => {
        if(debounce_timeout.current) clearTimeout(debounce_timeout.current)
        search_controller.current?.abort()
        setResults([])
        setIsSearching(false)
        onChange({ name: "", latitude: null, longitude: null })
    }

    const has_coordinates:boolean = value.latitude !== null && value.longitude !== null // Stores The Information If A Place Was Picked

    return (
        <View style={styles.container}>
            <View>
                <TextField
                    label={t("Miesto")}
                    icon="location-dot"
                    placeholder={t("Pridať miesto")}
                    value={value.name}
                    onChangeText={handleChangeText}
                    maxLength={255}
                    autoCorrect={false}
                    returnKeyType="search"
                    helper={has_coordinates ? t("Miesto je zobrazené na mape") : undefined}
                    error={has_error ? t("Pri načítaní polohy došlo k chybe.") : null}
                />

                <View style={styles.trailing} pointerEvents="box-none">
                    {is_searching && <ActivityIndicator size="small" color={colors.primary} />}
                    {!is_searching && value.name.length > 0 && <IconButton icon="xmark" accessibility_label={t("Odstrániť miesto")} onPress={clear} size={28} icon_color="text_muted" />}
                </View>
            </View>

            {results.length > 0 && (
                <View style={styles.results} accessibilityRole="list">
                    {results.map((place:NominatimPlace, index:number) => (
                        <Pressable
                            key={`${place.lat}_${place.lon}_${place.display_name}`}
                            onPress={() => selectPlace(place)}
                            accessibilityRole="button"
                            accessibilityLabel={place.display_name}
                            style={({ pressed }) => [styles.result, index > 0 ? styles.result_border : null, pressed ? styles.result_pressed : null]}
                        >
                            <Icon name="location-dot" size={13} color="text_muted" />
                            <Text variant="callout" numberOfLines={2} style={styles.result_text}>{place.display_name}</Text>
                        </Pressable>
                    ))}

                    <Text variant="caption" color="text_muted" style={styles.attribution}>© OpenStreetMap</Text>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.sm,
    },

    trailing: {
        position: "absolute",
        right: spacing.sm,
        top: 30,
        height: 50,
        justifyContent: "center",
    },

    results: {
        overflow: "hidden",
        backgroundColor: colors.surface_raised,
        borderWidth: layout.hairline,
        borderColor: colors.border,
        borderRadius: radii.md,
    },

    result: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },

    result_border: {
        borderTopWidth: layout.hairline,
        borderTopColor: colors.divider,
    },

    result_pressed: {
        backgroundColor: colors.surface_pressed,
    },

    result_text: {
        flex: 1,
    },

    attribution: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        textAlign: "right",
    },
})
