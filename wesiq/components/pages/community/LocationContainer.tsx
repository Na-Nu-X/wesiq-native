import { useState } from "react"
import { View, StyleSheet, Text, TextInput, Pressable, Platform, Alert, ActivityIndicator, ScrollView } from "react-native"
import { SECONDARY_COLOR, BLUE_COLOR, transparentize, LIGHT_BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR } from "@/constants/colors"
import { MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import { useTranslation } from "react-i18next"

interface NominatimPlace {
    display_name:string,
    lat:string,
    lon:string,
    [key:string]:any
}

interface LocationContainerProps {
    onLocationUpdate:(location:string) => void,
    location:string,
    onLatitudeUpdate:(latitude:number|null) => void,
    onLongitudeUpdate:(longitude:number|null) => void
}

export const LocationContainer = ({ onLocationUpdate, location, onLatitudeUpdate, onLongitudeUpdate }:LocationContainerProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const [location_results, setLocationResults] = useState<NominatimPlace[]>([]) // Stores The Location Results
    const [is_location_valid, setIsLocationValid] = useState<boolean>(false) // Stores The Information If The Location Is Valid
    const [is_location_loading, setIsLocationLoading] = useState<boolean>(false) // Stores The Information If The Location Is Loading
    let debounce_timeout:number // Debounce Timeout Between API Requests
    
    // Function For Handle Search Location
    const handleSearchLocation = (searched_text:string):void => {
        clearTimeout(debounce_timeout) // Clears The Debounce Timeout

        onLocationUpdate(searched_text) // Sets The Location

        if(searched_text.length < 3) {
            if(location_results.length > 0) setLocationResults([]) // Sets The Location Results
            setIsLocationValid(false) // Sets The Information That The Location Isn't Valid
            return
        }

        // Gets Location After 1000 MS Delay (Because of The Nominatim Usage Policy - 1 Request per Second)
        debounce_timeout = window.setTimeout(function():void {
            getLocation(searched_text)
        }, 1000)
    }

    // Function For Get Locations By Searched Location
    const getLocation = async (searched_text:string):Promise<void> => {
        if(!searched_text.trim()) {
            setIsLocationValid(false) // Sets The Information That The Location Isn't Valid
            setLocationResults([]) // Sets The Location Results
            onLatitudeUpdate(null) // Sets The Latitude
            onLongitudeUpdate(null) // Sets The Longitude
            return
        }

        setIsLocationLoading(true) // Sets The Information That The Location Is Loading
    
        try {
            const url:string = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&addressdetails=1&limit=10&featuretype=settlement` // Nominatim API https://nominatim.org/

            // Sends The GET Request To The Server
            const location_response:Response = await fetch(`${url}`, {
                method: "GET",
        
                headers: {
                    "Accept-Language": Platform.OS === "web" ? navigator.language : "sk", // Gets Results In Users System Language
                    "User-Agent": "Wesiq - Native App (behulpatrik@gmail.com)" // Sends User Agent Informations
                }
            })

            if(!location_response.ok) {
                Alert.alert(t("Chyba"), t("Pri načítaní polohy došlo k chybe.")) // Shows The Alert
            }
    
            const data:NominatimPlace[] = await location_response.json() // Gets The Data
            const unique_data:NominatimPlace[] = getUniquePlaces(data) // Gets Only The Unique Data

            setLocationResults(unique_data) // Sets The Location Results
    
            // Stores The Coordinates
            if(storeCoordinates(unique_data, searched_text)) {
                setIsLocationValid(true) // Sets The Information That The Location Is Valid
            }

            else {
                setIsLocationValid(false) // Sets The Information That The Location Isn't Valid
            }
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri načítaní polohy došlo k chybe.")) // Shows The Alert
        } 
        
        finally {
            setIsLocationLoading(false) // Sets The Information That The Location Isn't Loading
        }
    }

    // Function For Get Unique Places From Fetched Data
    const getUniquePlaces = (data:NominatimPlace[]):NominatimPlace[] => {
        return data.filter(function(one_place:NominatimPlace, index:number, self:NominatimPlace[]) {
            return index === self.findIndex(function(p:NominatimPlace) {
                return p.display_name === one_place.display_name
            })
        })
    }

    // Function For Store Coordinates To The Hidden Inputs
    const storeCoordinates = (data:NominatimPlace[] = location_results, searched_text:string):boolean => {
        const matching_location:NominatimPlace|null = data.find((one_place:NominatimPlace) => one_place.display_name === searched_text) || null // Gets The Matching Location If There is Any

        if(matching_location) {
            onLatitudeUpdate(Number(matching_location.lat)) // Sets The Latitude
            onLongitudeUpdate(Number(matching_location.lon)) // Sets The Longitude
            
            return true // Returns True If The Coordinates Were Stored
        }

        else {
            onLatitudeUpdate(null) // Deletes The Latitude
            onLongitudeUpdate(null) // Deletes The Longitude

            return false // Returns False If The Coordinates Were Not Stored
        }
    }

    // Function For Add Location
    const addLocation = (clicked_location:string, latitude:number, longitude:number):void => {
        onLocationUpdate(clicked_location) // Sets The Location
        setIsLocationValid(true) // Sets The Information That The Location Is Valid
        setLocationResults([]) // Sets The Location Results
        onLatitudeUpdate(latitude) // Sets The Latitude
        onLongitudeUpdate(longitude) // Sets The Longitude
    }

    // // Location Focus Functionality
    // location_input.addEventListener("focus", function():void {
    //     if(location_results.querySelectorAll(".place").length > 0) location_results.classList.remove("hidden") // Shows The Location Results (If There Are Any)
    // })

    // // Location Blur Functionality
    // location_input.addEventListener("blur", function(event:FocusEvent):void {
    //     if(
    //         !(event.relatedTarget as HTMLDivElement).classList.contains("place") && 
    //         !(event.relatedTarget as HTMLDivElement).classList.contains("location_results") &&
    //         !location_results.classList.contains("hidden")
    //     ) {
    //         location_results.classList.add("hidden") // Hides The Location Results And Prevents Hiding The Places Before Selection (If The User Clicks On The Place In The Location Results In Order To Select)
    //     }
    // })

    return (
        <View className="location_container" style={styles.location_container}>
            <View className="location_input_container" style={styles.location_input_container}>
                <View className="location_icon" style={styles.location_icon}>
                    <Icon icon_name="location-arrow" />
                </View>

                <TextInput
                    className="location"
                    textAlignVertical="top" 
                    placeholder={t("Miesto")} 
                    placeholderTextColor={LIGHT_BLUE_COLOR}
                    accessibilityLabel={t("Miesto")} 
                    value={location}
                    onChangeText={(text) => handleSearchLocation(text)}
                    maxLength={255}

                    style={[
                        styles.location, 
                        is_location_valid ? { borderBottomColor: GREEN_COLOR } : { borderBottomColor: transparentize(BLUE_COLOR, 0.5) },
                        { outlineStyle: "none" } as any
                    ]}
                />
            </View>

            <ScrollView 
                className="location_results_container" 
                showsVerticalScrollIndicator={false}
                indicatorStyle="white"
                style={styles.location_results_container}
                contentContainerStyle={styles.location_results_container}
            >
                {is_location_loading && (
                    <ActivityIndicator className="loading" size="small" color={SECONDARY_COLOR} style={styles.loading} />
                )}

                <View className="location_results" style={styles.location_results}>
                    {location_results.map((one_place:NominatimPlace) => (
                        <Pressable 
                            className="place"
                            onPress={() => addLocation(one_place.display_name, Number(one_place.lat), Number(one_place.lon))}
                            style={styles.place}
                        >
                            <Text 
                                className="place_text"
                                numberOfLines={1} 
                                ellipsizeMode="tail"

                                style={{ 
                                    color: SECONDARY_COLOR,
                                    maxWidth: "100%",
                                }}
                            >
                                {one_place.display_name}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    location_container: {
        position: "relative",
        padding: 5,
    },

    location_input_container: {
        position: "relative",
    },

    location_icon: {
        position: "absolute",
        bottom: 0,
        left: -16,
        paddingTop: 19,
        paddingBottom: 16,
    },

    location: {
        position: "relative",
        height: 50,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border-color 0.2s ease;
        // border-color: $blue-color
    },

    location_results_container: {
        position: "relative",
        maxHeight: 50 * 2 + 20 + 20 + 5,
        padding: 10,

        // &:not(:has(.location_results.hidden)) {
        //     background-color: transparentize($blue-color, 0.9);
        //     border: 1px solid transparentize($blue-color, 0.5);
        //     border-radius: 0px 0px $small-border-radius $small-border-radius;
        // }
    },

    loading: {
        position: "absolute",
        top: "50%",
        left: "50%",

        transform: [
            { translateX: "-100%" },
            { translateY: "-50%" }
        ],
    },

    location_results: {
        // @include scrollbar;
        gap: 10,
        maxHeight: 50 * 2 + 20,
        marginBottom: 50,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderBottomRightRadius: SMALL_BORDER_RADIUS,
        borderBottomLeftRadius: SMALL_BORDER_RADIUS,
        opacity: 1,
        // transition: visibility 0.3s ease, opacity 0.3s ease, margin-bottom 0.3s ease;

        // &.hidden {
        //     visibility: hidden;
        //     opacity: 0;
        //     height: 50px;
        //     margin-bottom: 0px;

        //     .place {
        //         pointer-events: none;
        //     }
        // }
    },

    place: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
        height: 50,
        paddingHorizontal: 10,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease, background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        
        // &:hover {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        //     cursor: pointer;
        // }

        // &:focus-visible {
        //     background-color: transparentize($blue-color, 0.8);
        // }
    },
})