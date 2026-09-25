import { useState } from "react"
import { Pressable, Alert, StyleSheet, Image, View, Text, Keyboard, Platform } from "react-native"
import * as ImagePicker from "expo-image-picker"
import {BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, RED_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import { API_URL, DOMAIN } from "@/constants/general"
import { useTranslation } from "react-i18next"
import SelectProfilePicture from "./SelectProfilePicture"
import Icon from "@/components/Icon"
import { TextInput } from "react-native"
import EmojiPicker from "rn-emoji-keyboard"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import AsyncStorage from "@react-native-async-storage/async-storage"
import Animated, { SlideInRight, SlideOutLeft, SlideInLeft, SlideOutRight } from "react-native-reanimated"
import { AsYouType, isValidPhoneNumber } from "libphonenumber-js"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import type { Profile } from "@/app/(tabs)/profile/[username]"
import type { BasicResponse } from "@/components/Feed"
import type { BioLink } from "@/app/(tabs)/profile/[username]"

type EditAccountFormProps = {
    logged_in_user:LoggedInUser,
    profile:Profile,
    active_section_direction:"forward"|"back",
    onBioUpdate:(bio:string) => void,
    bio:string,
    onBioLinksUpdate:(bio_links:BioLink[]) => void,
    bio_links:BioLink[],
    onSelectedProfilePictureUpdate:(selected_profile_picture:ImagePicker.ImagePickerAsset|null) => void,
    selected_profile_picture:ImagePicker.ImagePickerAsset|null,
    onFirstNameUpdate:(first_name:string) => void,
    first_name:string,
    onLastNameUpdate:(last_name:string) => void,
    last_name:string,
    onEmailAddressUpdate:(email_address:string) => void,
    email_address:string,
    onPhoneNumberUpdate:(phone_number:string) => void,
    phone_number:string,
    onSetIsPhoneNumberValid:(is_phone_number_valid:boolean) => void,
    is_phone_number_valid:boolean,
    data_saving_mode:boolean,
    private_account:boolean,
    delete_profile_picture:boolean,
    delete_account:boolean,
    onShowAccountProperties:() => void
}

export default function EditAccountForm({ 
    logged_in_user, 
    profile,
    active_section_direction,
    onBioUpdate,
    bio,
    onBioLinksUpdate,
    bio_links,
    onSelectedProfilePictureUpdate,
    selected_profile_picture,
    onFirstNameUpdate,
    first_name,
    onLastNameUpdate,
    last_name,
    onEmailAddressUpdate,
    email_address,
    onPhoneNumberUpdate,
    phone_number,
    onSetIsPhoneNumberValid,
    is_phone_number_valid,
    data_saving_mode,
    private_account,
    delete_profile_picture,
    delete_account,
    onShowAccountProperties
}:EditAccountFormProps) {
    const { t } = useTranslation() // Initializes The Translations

    const [is_emoji_picker_open, setIsEmojiPickerOpen] = useState(false) // Stores The Information If The Emoji Picker Is Open

    const [flag, setFlag] = useState<string|null>(null) // Stores The Country Flag For The Entered Phone Number

    const [form_report, setFormReport] = useState<string>("") // Stores The Form Report
    const [form_report_appearance, setFormReportAppearance] = useState<"success"|"error">("success") // Stores The Form Report Appearance
    const [is_loading, setIsLoading] = useState<boolean>(false) // Stores The Information If The Loading Is Active

    // Function For Handle The Edit Account
    const handleEditAccount = async ():Promise<void> => {
        Keyboard.dismiss() // Hides The Keyboard

        if(!logged_in_user) {
            Alert.alert(t("Chyba"), t("Zmeny nie je možné uložiť bez prihlásenia.")) // Shows The Alert
            return
        }
    
        if(!email_address.trim() || !is_phone_number_valid) {
            Alert.alert(t("Chyba"), t("Vyplnte všetky potrebné údaje pre vykonanie zmien.")) // Shows The Alert
            return
        }
    
        try {
            const form_data:FormData = new FormData() // Creates The Form Data
    
            form_data.append("delete_account", delete_account ? "True" : "False") // Appends The Information If The Delete Account Option Is Enabled To The Form Data
            form_data.append("delete_profile_picture", delete_profile_picture ? "True" : "False") // Appends The Information If The Delete Profile Picture Option Is Enabled To The Form Data
            form_data.append("data_saving_mode", data_saving_mode ? "True" : "False") // Appends The Information If The Data Saving Mode Option Is Enabled To The Form Data
            form_data.append("private_account", private_account ? "True" : "False") // Appends The Information If The Private Account Option Is Enabled To The Form Data
            form_data.append("bio", bio || "") // Appends The Bio To The Form Data
            form_data.append("bio_links", JSON.stringify(bio_links || [])) // Appends The Bio Links To The Form Data
            form_data.append("first_name", first_name || "") // Appends The First Name To The Form Data
            form_data.append("last_name", last_name || "") // Appends The Last Name To The Form Data
            form_data.append("email_address", email_address || "") // Appends The E-mail Address To The Form Data
            form_data.append("phone_number", phone_number || "") // Appends The Phone Number To The Form Data

            if(selected_profile_picture && selected_profile_picture.uri) {
                const file_uri:string = selected_profile_picture.uri // Gets The File URI
                const file_extension:string|null = selected_profile_picture.mimeType?.split("/")[1] || "jpeg" // Gets The File Extension

                // Web
                if(Platform.OS === "web" || file_uri.startsWith("blob:")) {
                    const file_response:Response = await fetch(file_uri)
                    const blob:Blob = await file_response.blob()

                    form_data.append("selected_profile_picture", blob, `file_${Date.now()}.${file_extension}`) // Appends The Selected Profile Picture To The Form Data
                } 
                
                // iOS And Android
                else {
                    form_data.append("selected_profile_picture", {
                        uri: file_uri,
                        name: selected_profile_picture.fileName || `file_${Date.now()}.${file_extension}`,
                        type: selected_profile_picture.mimeType || `image/${file_extension}`
                    } as any)
                }
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
            
            // Sends The POST Request To The Server
            const edit_account_response:Response = await fetch(`${API_URL}/edit-account/`, {
                method: "POST",

                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: form_data
            })

            // If The Response Isn't Success
            if(!edit_account_response.ok) {
                Alert.alert(t("Chyba"), t("Pri vykonávaní zmien v účte došlo k chybe.")) // Shows The Alert
                return
            }

            const edit_account_data:BasicResponse = await edit_account_response.json() // Gets The Edit Account Data

            // If The Response Isn't Success
            if(!edit_account_data.success) {
                Alert.alert(t("Chyba"), edit_account_data.message) // Shows The Alert
                return
            }
            
            console.log(edit_account_data)
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri vykonávaní zmien v účte došlo k chybe.")) // Shows The Alert
        }
    }

    // Function For Get The Profile Picture Path
    const getProfilePicturePath = (user_id:number, profile_picture_name:string|null):string|null => {
        if(selected_profile_picture) return selected_profile_picture.uri // Gets The Selected Profile Picture
        if(profile_picture_name) return `${DOMAIN}/media/images/${user_id}/${profile_picture_name}` // Gets The Current Profile Picture
        return null
    }

    // Function For Handle The Profile Picture Selection
    const handleProfilePictureSelection = (new_selected_profile_picture:ImagePicker.ImagePickerAsset):void => {
        onSelectedProfilePictureUpdate(new_selected_profile_picture) // Sets The Selected Profile Picture
    }

    // Function For Handle The Emoji Select
    const handleEmojiSelect = (emoji:{ emoji:string }) => {
        if(bio.length >= 100) return
        onBioUpdate(bio + emoji.emoji) // Sets The Bio
    }

    // Function For Get The Domain
    const getDomain = (url:string):string => {
        try {
            const valid_url:string = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}` // Gets The Valid URL
            const hostname:string = new URL(valid_url).hostname // Gets The Hostname
            return hostname.replace(/^www\./, "") // Returns The Domain
        } 
        
        catch {
            return url
        }
    }

    // Function For Handle The Phone Number Change
    const handlePhoneNumberChange = (text:string):void => {
        const phone_number_formatter:AsYouType = new AsYouType()
        const formatted_phone_number:string = phone_number_formatter.input(text)
        
        onPhoneNumberUpdate(formatted_phone_number) // Sets The Phone Number
        onSetIsPhoneNumberValid(isValidPhoneNumber(formatted_phone_number)) // Sets The Information That The Phone Number Is Valid

        // Language Flag

        if(formatted_phone_number.startsWith("+421")) setFlag(`${DOMAIN}/static/images/sk.png`) // Sets The Flag (Slovak)
        else if(formatted_phone_number.startsWith("+420")) setFlag(`${DOMAIN}/static/images/cs.png`) // Sets The Flag (Czech)
        else if(formatted_phone_number.startsWith("+44") || formatted_phone_number.startsWith("+1")) setFlag(`${DOMAIN}/static/images/en.png`) // Sets The Flag (English (England & USA))
        else if(formatted_phone_number.startsWith("+34")) setFlag(`${DOMAIN}/static/images/es.png`) // Sets The Flag (Spanish)
        else if(formatted_phone_number.startsWith("+33")) setFlag(`${DOMAIN}/static/images/fr.png`) // Sets The Flag (French)
        else if(formatted_phone_number.startsWith("+380")) setFlag(`${DOMAIN}/static/images/uk.png`) // Sets The Flag (Ukrainian)
        else if(formatted_phone_number.startsWith("+7")) setFlag(`${DOMAIN}/static/images/ru.png`) // Sets The Flag (Russian)
        else if(formatted_phone_number.startsWith("+55")) setFlag(`${DOMAIN}/static/images/pt-br.png`) // Sets The Flag (Portuguese (Brazil))
        else if(formatted_phone_number.startsWith("+86")) setFlag(`${DOMAIN}/static/images/zh-hans.png`) // Sets The Flag (Simplified Chinese)
        else setFlag(null) // Sets The Flag
    }

    return (
        <Animated.View 
            className="edit_account_form hidden" 
            entering={active_section_direction === "forward" ? SlideInRight.duration(300) : SlideInLeft.duration(300)} 
            exiting={active_section_direction === "forward" ? SlideOutLeft.duration(300) : SlideOutRight.duration(300)}
            style={styles.edit_account_form}
        >
            <View className="header" style={styles.header}>
                <View className="info" style={styles.info}>
                    <SelectProfilePicture 
                        onProfilePictureSelection={handleProfilePictureSelection} 
                        previous_profile_picture={getProfilePicturePath(profile.id, profile.profile_picture_name)} 
                        is_subscriber={profile.subscription && profile.subscription.is_active || false}
                    />

                    <Text className="username" style={styles.username}>{logged_in_user.username}</Text>
                </View>

                <View className="show_account_properties_button" accessibilityLabel={t("Viac...")}>
                    <Icon
                        icon_name="ellipsis-vertical"
                        onPress={onShowAccountProperties}
                    />
                </View>
            </View>

            <Text className="friend_code" style={styles.friend_code}>{t("Friend Code")} - <Text style={styles.friend_code_text}>{logged_in_user.friend_code}</Text></Text>

            <View className="bio_container" style={styles.bio_container}>
                <TextInput
                    className="bio"
                    multiline={true} 
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textAlignVertical="top" 
                    placeholder={t("Niečo o Vás")} 
                    placeholderTextColor={LIGHT_BLUE_COLOR}
                    accessibilityLabel={t("Niečo o Vás")} 
                    value={bio}
                    onChangeText={onBioUpdate}
                    maxLength={100}

                    style={[
                        styles.bio, 
                        { outlineStyle: "none" } as any
                    ]}
                />

                <View className="icons" style={styles.icons}>
                    {/* <button 
                        class="show_add_link_form_button" 
                        type="button"
                        popovertarget="add_link_form"
                        style="anchor-name: --show_add_link_form_button;"
                        title="{% translate 'Pridať odkaz' %}"
                        aria-label="{% translate 'Pridať odkaz' %}"
                    >
                        <i class="fa-solid fa-link"></i> <!-- https://fontawesome.com/icons/link -->
                    </button>

                    <div 
                        class="add_link_form" 
                        id="add_link_form"
                        popover
                        style="position-anchor: --show_add_link_form_button;"
                    >
                        <div class="form">
                            <input class="url" type="text" placeholder="https://example.com">
                            <button class="add_link" type="button"><i class="fa-solid fa-plus"></i></button> <!-- https://fontawesome.com/icons/plus -->
                        </div>

                        <button 
                            class="hide_add_link_form_button" 
                            type="button"
                            popovertarget="add_link_form"
                            popovertargetaction="hide"
                        >
                            <i class="fa-solid fa-xmark"></i> <!-- https://fontawesome.com/icons/xmark -->
                            <span>{% translate "Zavrieť" %}</span>
                        </button>
                    </div> */}

                    <View 
                        className="add_emoji"
                        accessibilityLabel={t("Pridať emoji")}
                    >
                        <Icon 
                            icon_name="face-surprise"
                            onPress={() => setIsEmojiPickerOpen(true)}
                            is_regular={true}
                        />
                    </View>

                    <EmojiPicker
                        onEmojiSelected={handleEmojiSelect}
                        open={is_emoji_picker_open}
                        onClose={() => setIsEmojiPickerOpen(false)}

                        translation={{
                            smileys_emotion: t("Smajlíky"),
                            people_body: t("Ľudia"), 
                            recently_used: t("Naposledy použité"),
                            animals_nature: t("Zvieratá"),
                            food_drink: t("Jedlo a nápoje"),
                            activities: t("Aktivity"),
                            travel_places: t("Cestovanie"),
                            objects: t("Predmety"),
                            symbols: t("Symboly"),
                            flags: t("Vlajky"),
                            search: t("Hľadať..."),
                        }}
                    />
                </View>
            </View>

            {/*
                            {{ one_bio_link.domain }}
                        </a>

                        <button class="remove_link" type="button" title="{% translate 'Odstrániť odkaz' %}"><i class="fa-solid fa-xmark"></i></button> <!-- https://fontawesome.com/icons/xmark -->
                    </div>
                
                {% endfor %}
            </div> */}

            <View className="added_links_container" style={styles.added_links_container}>
                {profile.bio_links.map((one_bio_link:BioLink, index:number) => (
                    <View key={one_bio_link.id || index} className="link" style={styles.link}>
                        <Pressable 
                            // onPress={}
                            accessibilityLabel={t("Otvoriť odkaz")}

                            style={[
                                styles.link_anchor, 
                                { outlineStyle: "none" } as any
                            ]}
                        >
                            {one_bio_link.url.includes("instagram.com") && (
                                <Icon
                                    icon_name="instagram"
                                    // onPress={}
                                />
                            )}

                            {one_bio_link.url.includes("facebook.com") && (
                                <Icon
                                    icon_name="facebook"
                                    // onPress={}
                                />
                            )}

                            {one_bio_link.url.includes("youtube.com") && (
                                <Icon
                                    icon_name="youtube"
                                    // onPress={}
                                />
                            )}

                            {!one_bio_link.url.includes("instagram.com") && !one_bio_link.url.includes("facebook.com") && !one_bio_link.url.includes("youtube.com") && (
                                <Icon
                                    icon_name="link"
                                    // onPress={}
                                />
                            )}

                            <Text style={{ color: SECONDARY_COLOR }}>{getDomain(one_bio_link.url)}</Text>
                        </Pressable>

                        <View className="remove_link" accessibilityLabel={t("Odstrániť odkaz")}>
                            <Icon
                                icon_name="xmark"
                                // onPress={}
                            />
                        </View>
                    </View>
                ))}
            </View>

            <View className="inputs">
                <View className="name_container" style={styles.name_container}>
                    <View className="first_name_container" style={styles.first_name_container}>
                        <View className="first_name_icon" style={styles.first_name_icon}>
                            <Icon icon_name="user" />
                        </View>

                        <TextInput
                            className="first_name"
                            keyboardType="default"
                            autoCapitalize="words"
                            textAlignVertical="top" 
                            placeholder={t("Zmeniť meno")} 
                            placeholderTextColor={LIGHT_BLUE_COLOR}
                            accessibilityLabel={t("Zmeniť meno")} 
                            value={first_name}
                            onChangeText={onFirstNameUpdate}
                            maxLength={20}

                            style={[
                                styles.first_name, 
                                { outlineStyle: "none" } as any
                            ]}
                        />
                    </View>

                    <View className="last_name_container" style={styles.last_name_container}>
                        <View className="last_name_icon" style={styles.last_name_icon}>
                            <Icon icon_name="user" />
                        </View>

                        <TextInput
                            className="last_name"
                            keyboardType="default"
                            autoCapitalize="words"
                            textAlignVertical="top" 
                            placeholder={t("Zmeniť priezvisko")} 
                            placeholderTextColor={LIGHT_BLUE_COLOR}
                            accessibilityLabel={t("Zmeniť priezvisko")} 
                            value={last_name}
                            onChangeText={onLastNameUpdate}
                            maxLength={50}

                            style={[
                                styles.last_name, 
                                { outlineStyle: "none" } as any
                            ]}
                        />
                    </View>
                </View>

                <View className="contact_container" style={styles.contact_container}>
                    <View className="email_address_container" style={styles.email_address_container}>
                        <View className="email_address_icon" style={styles.email_address_icon}>
                            <Icon icon_name="envelope" />
                        </View>

                        <TextInput
                            className="email_address"
                            keyboardType="default"
                            textAlignVertical="top" 
                            placeholder={t("Zmeniť e-mail")} 
                            placeholderTextColor={LIGHT_BLUE_COLOR}
                            accessibilityLabel={t("Zmeniť e-mail")} 
                            value={email_address}
                            onChangeText={onEmailAddressUpdate}
                            maxLength={50}

                            style={[
                                styles.email_address, 
                                { outlineStyle: "none" } as any
                            ]}
                        />
                    </View>

                    <View className="phone_number_container" style={styles.phone_number_container}>
                        <View className="phone_number_icon" style={styles.phone_number_icon}>
                            <Icon icon_name="phone" />
                        </View>

                        <TextInput
                            className="phone_number"
                            keyboardType="phone-pad"
                            textAlignVertical="top" 
                            placeholder={t("Zmeniť telefónne číslo")} 
                            placeholderTextColor={LIGHT_BLUE_COLOR}
                            accessibilityLabel={t("Zmeniť telefónne číslo")}
                            value={phone_number}
                            onChangeText={handlePhoneNumberChange}
                            maxLength={25}

                            style={[
                                styles.phone_number, 
                                phone_number.trim().length > 0 ? { borderBottomColor: is_phone_number_valid ? "#52cf20" : "#df3535" } : {},
                                { outlineStyle: "none" } as any
                            ]}
                        />

                        {flag && (
                            <Image
                                source={{ uri:flag }}
                                style={styles.flag}
                            />
                        )}
                    </View>
                </View>
            </View>

            <Text 
                className="form_report" 

                style={[
                    styles.form_report, 
                    form_report_appearance === "success" ? { color: GREEN_COLOR } : { color: RED_COLOR }
                ]}
            >
                {form_report}
            </Text>

            <Pressable 
                className="edit_account_form_submit"
                onPress={handleEditAccount}
                disabled={is_loading}
                accessibilityLabel={t("Uložiť zmeny")}

                style={[
                    styles.edit_account_form_submit, 
                    { outlineStyle: "none" } as any
                ]}
            >
                <Text className="text-white font-bold text-base" style={{ color: SECONDARY_COLOR }}>{t("Uložiť zmeny")}</Text>
            </Pressable>

            <View className="form_questions" style={styles.form_questions}>
                <View 
                    style={{ 
                        flexDirection: "row",
                        justifyContent: "center",
                    }}
                >
                    <Text style={{ color: SECONDARY_COLOR }}>{t("Zabudli ste heslo?")} </Text>
                    <Pressable
                        // onPress={handleGoToPasswordReset}
                        accessibilityRole="button"
                        accessibilityLabel={t("Zmeniť heslo")} 
                    >
                        {({ pressed }) => (
                            <Text 
                                style={[
                                    { color: SECONDARY_COLOR, fontStyle: "italic" },
                                    pressed && { textDecorationLine: "underline" } 
                                ]}
                            >
                                {t("Zmeniť heslo")}
                            </Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    edit_account_form: {
        position: "relative",
        width: "100%",
        textAlign: "center",
        // transition: transform 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;

        // &.hidden {
        //     position: absolute;
        //     top: 0px;
        //     left: 0px;
        //     width: 100%;
        //     transform: translateX(100%);
        //     opacity: 0;
        //     visibility: hidden;
        //     pointer-events: none;
        // }
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 20,
        padding: 20,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // backdrop-filter: blur(5px);
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover,
        // &:focus-visible {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        // }
    },

    info: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
        minWidth: 0,
    },

    username: {
        // @include crop_text;
        flex: 1,
        minWidth: 0,
        fontSize: 22,
        color: SECONDARY_COLOR,
        textAlign: "left",
    },

    friend_code: {
        textAlign: "left",
        marginBottom: 20,
        padding: 20,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // backdrop-filter: blur(5px);
        // font-size: 0.9em;
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover,
        // &:focus-visible {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        // }
    },

    friend_code_text: {
        fontWeight: "bold",
        color: BLUE_COLOR,
        letterSpacing: 1,
    },

    bio_container: {
        position: "relative",
        width: "100%",
        marginTop: 10,
        marginHorizontal: "auto",
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: SMALL_BORDER_RADIUS,
        // transition: border-color 0.3s ease;

        // &:has(.bio:focus) {
        //     border-color: $blue-color;
        // }

        // &:hover {
        //     border-color: $blue-color;
        // }
    },

    bio: {
        width: "100%",
        minHeight: 100,
        // field-sizing: content;
        paddingVertical: 5,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
    },

    icons: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 25,
        paddingHorizontal: 10,
        backgroundColor: transparentize(BLUE_COLOR, 0.9),
        borderBottomRightRadius: SMALL_BORDER_RADIUS,
        borderBottomLeftRadius: SMALL_BORDER_RADIUS,
    },

    added_links_container: {
        // @include scrollbar($direction: "horizontal");
        flexDirection: "row",
        gap: 10,
        marginBottom: 20,
    },

    link: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 25,
        marginTop: 5,
        marginBottom: 5,
        paddingHorizontal: 5,
        backgroundColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: SMALL_BORDER_RADIUS,
        // transition: border-color 0.3s ease;
        // animation: fadeInScale 0.3s ease-in forwards;

        // &.hidden {
        //     display: none;
        // }
    },

    link_anchor: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        fontSize: 15,
        color: BLUE_COLOR,
    },

    name_container: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 30,
        width: "90%",
        marginHorizontal: "auto",
    },

    first_name_container: {
        position: "relative",
        flex: 1,
    },

    first_name_icon: {
        position: "absolute",
        bottom: 10,
        left: -24,
        paddingTop: 19,
        paddingBottom: 16,
    },

    first_name: {
        position: "relative",
        width: "100%",
        height: 50,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border-color 0.2s ease;
    
        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },

    last_name_container: {
        position: "relative",
        flex: 1,
    },

    last_name_icon: {
        position: "absolute",
        bottom: 10,
        left: -24,
        paddingTop: 19,
        paddingBottom: 16,
    },

    last_name: {
        position: "relative",
        width: "100%",
        height: 50,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border-color 0.2s ease;
    
        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },

    contact_container: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 30,
        width: "90%",
        marginHorizontal: "auto",
    },

    email_address_container: {
        position: "relative",
        flex: 1,
    },

    email_address_icon: {
        position: "absolute",
        bottom: 10,
        left: -24,
        paddingTop: 19,
        paddingBottom: 16,
    },

    email_address: {
        position: "relative",
        width: "100%",
        height: 50,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border-color 0.2s ease;
    
        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },

    phone_number_container: {
        position: "relative",
        flex: 1,
    },

    phone_number_icon: {
        position: "absolute",
        bottom: 10,
        left: -24,
        paddingTop: 19,
        paddingBottom: 16,
    },

    phone_number: {
        position: "relative",
        width: "100%",
        height: 50,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border-color 0.2s ease;
    
        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },

    flag: {
        position: "absolute",
        bottom: 21,
        right: -30,
        width: 24,
        opacity: 0.8,
        aspectRatio: 1 / 1,
        resizeMode: "cover",
        // transition: right 0.3s ease;
    },

    form_report: {
        position: "absolute",
        bottom: 123,
        alignSelf: "center",
    },

    edit_account_form_submit: {
        alignItems: "center",
        justifyContent: "center",
        width: "90%",
        height: 50,
        marginTop: 40,
        marginBottom: 10,
        marginHorizontal: "auto",
        paddingHorizontal: 10,
        textAlign: "center",
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: border-color 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    
        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color;
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     transform: scale(1.05);
        //     letter-spacing: 0.5px;
        //     cursor: pointer;
        // }
    },

    form_questions: {
        marginTop: 10,
        color: SECONDARY_COLOR,
    },

    delete_account: {
        marginTop: 10,
        opacity: 0.6,
        // transition: transform 0.3s ease, opacity 0.3s ease;

        // &:hover {
        //     transform: scale(1.1);
        //     opacity: 1;
        //     cursor: pointer;
        // }
    },
})