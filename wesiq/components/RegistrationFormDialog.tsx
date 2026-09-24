import { useState } from "react"
import { View, StyleSheet, Modal, Text, KeyboardAvoidingView, TextInput, Pressable, Platform, Keyboard, Alert, Image } from "react-native"
import { MAIN_COLOR, SECONDARY_COLOR, BLUE_COLOR, transparentize, LIGHT_BLUE_COLOR, GREEN_COLOR, RED_COLOR } from "@/constants/colors"
import { BlurView } from "expo-blur"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import Icon from "./Icon"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { API_URL, DOMAIN } from "@/constants/general"
import * as Clipboard from "expo-clipboard"
import { AsYouType, isValidPhoneNumber } from "libphonenumber-js"
import { useTranslation } from "react-i18next"

import type { LoggedInUser } from "./LoginFormDialog"
import type { BasicResponse } from "./Feed"

type RegistrationFormDialogProps = {
    visible:boolean,
    onChangeActiveForm:() => void,
    onClose:() => void,
    onUserLogin?:(user:LoggedInUser) => void
}

export default function RegistrationFormDialog({ visible, onChangeActiveForm, onClose, onUserLogin }:RegistrationFormDialogProps) {
    const { t } = useTranslation() // Initializes The Translations

    const [first_name, setFirstName] = useState<string>("") // Stores The First Name
    const [last_name, setLastName] = useState<string>("") // Stores The Last Name
    const [email_address, setEmailAddress] = useState<string>("") // Stores The Email Address
    const [phone_number, setPhoneNumber] = useState<string>("") // Stores The Phone Number
    const [is_phone_number_valid, setIsPhoneNumberValid] = useState<boolean>(false) // Stores The Information If The Phone Number Is Valid
    const [language, setLanguage] = useState<string>("en") // Stores The Language
    const [flag, setFlag] = useState<string|null>(null) // Stores The Country Flag For The Entered Phone Number
    const [username, setUsername] = useState<string>("") // Stores The Username
    const [password, setPassword] = useState<string>("") // Stores The Password
    const [is_password_hidden, setIsPasswordHidden] = useState<boolean>(true) // Stores The Information If The Password Is Hidden
    const [password_check, setPasswordCheck] = useState<string>("") // Stores The Password Check
    const [form_report, setFormReport] = useState<string>("") // Stores The Form Report
    const [form_report_appearance, setFormReportAppearance] = useState<"success"|"error">("success") // Stores The Form Report Appearance
    const [is_loading, setIsLoading] = useState<boolean>(false) // Stores The Information If The Loading Is Active
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User

    // Function For Handle The Phone Number Change
    const handlePhoneNumberChange = (text:string):void => {
        const phone_number_formatter:AsYouType = new AsYouType()
        const formatted_phone_number:string = phone_number_formatter.input(text)
        
        setPhoneNumber(formatted_phone_number) // Sets The Phone Number
        setIsPhoneNumberValid(isValidPhoneNumber(formatted_phone_number)) // Sets The Information That The Phone Number Is Valid

        // Language Flag

        // Slovak
        if(formatted_phone_number.startsWith("+421")) {
            setFlag(`${DOMAIN}/static/images/sk.png`) // Sets The Flag
            setLanguage("sk") // Sets The Language
        }

        // Czech
        else if(formatted_phone_number.startsWith("+420")) {
            setFlag(`${DOMAIN}/static/images/cs.png`) // Sets The Flag
            setLanguage("cs") // Sets The Language
        }

        // English (England & USA)
        else if(formatted_phone_number.startsWith("+44") || formatted_phone_number.startsWith("+1")) {
            setFlag(`${DOMAIN}/static/images/en.png`) // Sets The Flag
            setLanguage("en") // Sets The Language
        }

        // Spanish
        else if(formatted_phone_number.startsWith("+34")) {
            setFlag(`${DOMAIN}/static/images/es.png`) // Sets The Flag
            setLanguage("es") // Sets The Language
        }

        // French
        else if(formatted_phone_number.startsWith("+33")) {
            setFlag(`${DOMAIN}/static/images/fr.png`) // Sets The Flag
            setLanguage("fr") // Sets The Language
        }

        // Ukrainian
        else if(formatted_phone_number.startsWith("+380")) {
            setFlag(`${DOMAIN}/static/images/uk.png`) // Sets The Flag
            setLanguage("uk") // Sets The Language
        }

        // Russian
        else if(formatted_phone_number.startsWith("+7")) {
            setFlag(`${DOMAIN}/static/images/ru.png`) // Sets The Flag
            setLanguage("ru") // Sets The Language
        }

        // Portuguese (Brazil)
        else if(formatted_phone_number.startsWith("+55")) {
            setFlag(`${DOMAIN}/static/images/pt-br.png`) // Sets The Flag
            setLanguage("pt-br") // Sets The Language
        }

        // Simplified Chinese
        else if(formatted_phone_number.startsWith("+86")) {
            setFlag(`${DOMAIN}/static/images/zh-hans.png`) // Sets The Flag
            setLanguage("zh-hans") // Sets The Language
        }

        else {
            setFlag(null) // Sets The Flag
            setLanguage("en") // Sets The Language
        }
    }

    // Function For Verifying Password Inputs Validity
    const passwordVerification = (password_1:string, password_2:string):void => {
        if(!password_1 && !password_2) {
            setFormReport("") // Deletes The Form Report
            return
        }

        if(password_1 === password_2 && password_1 !== "") {
            setFormReport(t("Heslá sa zhodujú")) // Sets The Form Report
            setFormReportAppearance("success") // Sets The Form Report Appearance
        } 
        
        else {
            setFormReport(t("Heslá sa nezhodujú")) // Sets The Form Report
            setFormReportAppearance("error") // Sets The Form Report Appearance
        }
    }

    // Function For Handle The Password Change
    const handlePasswordChange = (text:string):void => {
        setPassword(text) // Sets The Password
        passwordVerification(text, password_check) // Verifies The Password
    }

    // Function For Handle The Password Check Change
    const handlePasswordCheckChange = (text:string):void => {
        setPasswordCheck(text) // Sets The Password Check
        passwordVerification(password, text) // Verifies The Password
    }

    // Function For Create An Array From The Selected Range
    const fromToNumbers = (from:number, to:number):number[] => {
        const all_numbers:number[] = [] // Stores All Numbers

        for(let i:number = from; i <= to; i++) {
            all_numbers.push(i) // Pushes A Number To All Numbers
        }

        return all_numbers // Returns An Array Of All Numbers
    }

    const NUMBERS_CHAR_CODES:number[] = fromToNumbers(48, 57) // 0 - 9
    const CAPITAL_LETTERS_CHAR_CODES:number[] = fromToNumbers(65, 90) // A - Z
    const SMALL_LETTERS_CHAR_CODES:number[] = fromToNumbers(97, 122) // a - z
    const CHARACTERS_CHAR_CODES:number[] = fromToNumbers(33, 47).concat(fromToNumbers(58, 64)).concat(fromToNumbers(91, 96)).concat(fromToNumbers(123, 126)) // Characters Char Codes

    // Function For Generate Random Key
    const generateKey = (length:number, numbers:boolean = true, capital_letters:boolean = true, small_letters:boolean = true, characters:boolean = true):string => {
        const all_characters:string[] = [] // Stores All Characters

        // Selects Characters
        if(numbers) {
            NUMBERS_CHAR_CODES.forEach(function(one_code:number) {
                all_characters.push(String.fromCharCode(one_code))
            })
        }

        if(capital_letters) {
            CAPITAL_LETTERS_CHAR_CODES.forEach(function(one_code:number) {
                all_characters.push(String.fromCharCode(one_code))
            })
        }

        if(small_letters) {
            SMALL_LETTERS_CHAR_CODES.forEach(function(one_code:number) {
                all_characters.push(String.fromCharCode(one_code))
            })
        }

        if(characters) {
            CHARACTERS_CHAR_CODES.forEach(function(one_code:number) {
                all_characters.push(String.fromCharCode(one_code))
            })
        }

        const generated_key:string[] = [] // Stores Generated Key

        for(let i:number = 0; i < length; i++) {
            const all_characters_index:number = Math.floor(Math.random() * all_characters.length - 1) + 1 // Generates Random Index From Array Of All Characters

            if(all_characters[all_characters_index]) generated_key.push(all_characters[all_characters_index]) // Pushes A Character To The Generated Key
        }

        return generated_key.join("") // Returns Generated Key
    }

    // Function For Generate The Password
    const generatePassword = ():void => {
        setPassword(generateKey(15)) // Sets Generated Password To The Password Input
        // passwordVerification(password_input, password_check_input, form_report) // Verifies The Password
    }

    // Function For Copy The Password
    const copyPassword = async ():Promise<void> => {
        await Clipboard.setStringAsync(password) // Copies The Password
        Alert.alert(t("Úspech"), t("Heslo bolo skopírované.")) // Shows The Alert
    }

    // Function For Paste The Password
    const pastePassword = async ():Promise<void> => {
        const copied_text:string = await Clipboard.getStringAsync() // Gets The Copied Text From Clipboard
        setPasswordCheck(copied_text) // Sets The Password Check
        handlePasswordCheckChange(copied_text) // Handles The Password Check Change
    }

    // Function For Handle The Registration
    const handleRegistration = async ():Promise<void> => {
        Keyboard.dismiss() // Hides The Keyboard
    
        if(!email_address.trim() || !is_phone_number_valid || !username.trim() || !password.trim() || !password_check.trim()) {
            Alert.alert(t("Chyba"), t("Vyplnte všetky potrebné údaje pre registráciu.")) // Shows The Alert
            return
        }
    
        setIsLoading(true) // Activates The Loading
    
        try {
            // Sends The POST Request To The Server
            const register_response:Response = await fetch(`${API_URL}/register/`, {
                method: "POST",
        
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },

                body: JSON.stringify({
                    first_name: first_name,
                    last_name: last_name,
                    username: username,
                    email_address: email_address,
                    phone_number: phone_number,
                    password: password,
                    password_check: password_check,
                    language: language
                })
            })
    
            const register_data:BasicResponse = await register_response.json() // Gets The Register Data
    
            if(register_data.success) {
                Alert.alert(t("Úspech"), register_data.message) // Shows The Alert
            } 
            
            else {
                Alert.alert(t("Chyba"), register_data.message) // Shows The Alert
            }
    
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri registrácii došlo k chybe.")) // Shows The Alert
        } 
        
        finally {
            setIsLoading(false) // Deactivates The Loading
            onChangeActiveForm() // Changes The Active Form (Shows The Login Form)
        }
    }

    return (
        <Modal
            className="registration_form_dialog"
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable 
                onPress={onClose}

                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }} 
            >
                <BlurView intensity={25} style={StyleSheet.absoluteFill} />

                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: transparentize(MAIN_COLOR, 0.5) },
                    ]}
                />

                <Pressable 
                    onPress={(event) => event.stopPropagation()}

                    style={{
                        maxWidth: MAIN_WIDTH,
                        width: "100%",
                    }}
                >
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ width: "100%", alignItems: "center" }}
                    >
                        <View className="registration_form" style={styles.registration_form}>
                            <View style={styles.circle_decoration_before} />
                            <View style={styles.circle_decoration_after} />

                            <View style={styles.top}>
                                <View className="back" accessibilityLabel={t("Zavrieť")}>
                                    <Icon
                                        icon_name="chevron-left"
                                        onPress={onClose}
                                        size={30}
                                        pressed_style={{ transform: [{ scale: 1.1 }] }}
                                    />
                                </View>

                                <Text className="heading" style={styles.heading}>Registrácia</Text>
                            </View>

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
                                        placeholder={t("Meno")} 
                                        placeholderTextColor={LIGHT_BLUE_COLOR}
                                        accessibilityLabel={t("Meno")} 
                                        value={first_name}
                                        onChangeText={setFirstName}
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
                                        placeholder={t("Priezvisko")} 
                                        placeholderTextColor={LIGHT_BLUE_COLOR}
                                        accessibilityLabel={t("Priezvisko")} 
                                        value={last_name}
                                        onChangeText={setLastName}
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
                                        placeholder={t("E-mail")} 
                                        placeholderTextColor={LIGHT_BLUE_COLOR}
                                        accessibilityLabel={t("E-mail")} 
                                        value={email_address}
                                        onChangeText={setEmailAddress}
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
                                        placeholder={t("Telefónne číslo")} 
                                        placeholderTextColor={LIGHT_BLUE_COLOR}
                                        accessibilityLabel={t("Telefónne číslo")} 
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

                            <View className="username_container" style={styles.username_container}>
                                <View className="username_icon" style={styles.username_icon}>
                                    <Icon icon_name="at" />
                                </View>

                                <TextInput
                                    className="username"
                                    keyboardType="default"
                                    textAlignVertical="top" 
                                    placeholder={t("Používateľské meno")} 
                                    placeholderTextColor={LIGHT_BLUE_COLOR}
                                    accessibilityLabel={t("Používateľské meno")} 
                                    value={username}
                                    onChangeText={setUsername}
                                    maxLength={20}

                                    style={[
                                        styles.username, 
                                        { outlineStyle: "none" } as any
                                    ]}
                                />
                            </View>

                            <View className="password_container" style={styles.password_container}>
                                <View 
                                    className="generate_password" 
                                    accessibilityLabel={t("Navrhnúť heslo")}
                                    style={styles.generate_password}
                                >
                                    <Icon
                                        icon_name="key"
                                        onPress={generatePassword}
                                    />
                                </View>

                                <TextInput
                                    className="password"
                                    autoCapitalize="none"
                                    secureTextEntry={is_password_hidden ? true : false}
                                    textAlignVertical="top" 
                                    placeholder={t("Vytvorte heslo")} 
                                    placeholderTextColor={LIGHT_BLUE_COLOR}
                                    accessibilityLabel={t("Vytvorte heslo")}  
                                    value={password}
                                    onChangeText={handlePasswordChange}
                                    maxLength={50}

                                    style={[
                                        styles.password, 
                                        { outlineStyle: "none" } as any
                                    ]}
                                />

                                <View 
                                    className="show_hide_password" 
                                    accessibilityLabel={is_password_hidden ? t("Zobraziť heslo") : t("Skryť heslo")}
                                    style={styles.show_hide_password}
                                >
                                    <Icon
                                        icon_name={is_password_hidden ? "eye-slash" : "eye"}
                                        onPress={() => setIsPasswordHidden(previous => !previous)} // Toggles The Value
                                    />
                                </View>

                                <View 
                                    className="copy_password" 
                                    accessibilityLabel={t("Skopírovať")}
                                    style={styles.copy_password}
                                >
                                    <Icon
                                        icon_name="copy"
                                        onPress={copyPassword}
                                    />
                                </View>
                            </View>

                            <View className="password_check_container" style={styles.password_container}>
                                <View className="password_check_icon" style={styles.password_check_icon}>
                                    <Icon icon_name="lock" />
                                </View>

                                <TextInput
                                    className="password_check"
                                    autoCapitalize="none"
                                    secureTextEntry={true}
                                    textAlignVertical="top" 
                                    placeholder={t("Overte heslo")} 
                                    placeholderTextColor={LIGHT_BLUE_COLOR}
                                    accessibilityLabel={t("Overte heslo")} 
                                    value={password_check}
                                    onChangeText={handlePasswordCheckChange}
                                    maxLength={50}

                                    style={[
                                        styles.password, 
                                        { outlineStyle: "none" } as any
                                    ]}
                                />

                                <View 
                                    className="paste_password" 
                                    accessibilityLabel={t("Prilepiť")}
                                    style={styles.paste_password}
                                >
                                    <Icon
                                        icon_name="copy"
                                        onPress={pastePassword}
                                        is_regular={true}
                                    />
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
                                className="registration_form_submit"
                                onPress={handleRegistration}
                                disabled={is_loading}
                                accessibilityLabel={t("Vytvoriť účet")}

                                style={[
                                    styles.registration_form_submit, 
                                    { outlineStyle: "none" } as any
                                ]}
                            >
                                <Text className="text-white font-bold text-base" style={{ color: SECONDARY_COLOR }}>{t("Vytvoriť účet")}</Text>
                            </Pressable>

                            <View className="form_questions" style={styles.form_questions}>
                                <View 
                                    style={{ 
                                        flexDirection: "row",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Už máte účet?")} </Text>
                                    <Pressable
                                        onPress={onChangeActiveForm}
                                        accessibilityRole="button"
                                        accessibilityLabel={t("Prihlásiť sa")}
                                    >
                                        {({ pressed }) => (
                                            <Text 
                                                style={[
                                                    { color: SECONDARY_COLOR, fontStyle: "italic" },
                                                    pressed && { textDecorationLine: "underline" } 
                                                ]}
                                            >
                                                {t("Prihlásiť sa")}
                                            </Text>
                                        )}
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
    },
    
    registration_form: {
        position: "fixed",
        top: "50%",
        left: "50%",

        transform: [
            { translateX: "-50%" }, 
            { translateY: "-50%" }
        ],

        maxWidth: MAIN_WIDTH,
        width: "100%",
        padding: 20,
        textAlign: "center",
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
        overflow: "hidden",
    },

    circle_decoration_before: {
        position: "absolute",
        top: -250,
        left: -50,
        width: 400,
        height: 400,
        borderRadius: 400 / 2,
        backgroundColor: transparentize(BLUE_COLOR, 0.95),
        zIndex: -1,
    },
    
    circle_decoration_after: {
        position: "absolute",
        bottom: -200,
        right: -50,
        width: 400,
        height: 400,
        borderRadius: 400 / 2,
        backgroundColor: transparentize(BLUE_COLOR, 0.95),
        zIndex: -1,
    },

    top: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
        marginBottom: 30,
    },

    heading: {
        flex: 1,
        marginRight: 18.75 + 20,
        textAlign: "center",
        color: SECONDARY_COLOR,
        fontSize: 30,
        // animation: fadeInScale 0.3s ease-out;
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

    username_container: {
        position: "relative",
    },

    username_icon: {
        position: "absolute",
        bottom: 10,
        left: 3,
        paddingTop: 19,
        paddingBottom: 15,
    },

    username: {
        position: "relative",
        width: "90%",
        height: 50,
        marginBottom: 10,
        marginHorizontal: "auto",
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
    
    password_container: {
        position: "relative",
    },

    generate_password: {
        position: "absolute",
        bottom: 10,
        left: 3,
        paddingTop: 19,
        paddingBottom: 15,
    },

    password: {
        position: "relative",
        width: "90%",
        height: 50,
        marginBottom: 10,
        marginHorizontal: "auto",
        paddingLeft: 10,
        paddingRight: 28,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // -webkit-text-security: disc;
        // transition: border-color 0.2s ease;
    
        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },

    show_hide_password: {
        position: "absolute",
        bottom: 10,
        right: 20,
        paddingTop: 19,
        paddingBottom: 15,
    },

    copy_password: {
        position: "absolute",
        bottom: 10,
        right: -7,
        paddingTop: 19,
        paddingBottom: 15,
    },

    password_check_container: {
        position: "relative",
    },

    password_check_icon: {
        position: "absolute",
        bottom: 10,
        left: 3,
        paddingTop: 19,
        paddingBottom: 15,
    },

    password_check: {
        position: "relative",
        width: "90%",
        height: 50,
        marginBottom: 10,
        paddingLeft: 10,
        paddingRight: 28,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // -webkit-text-security: disc;
        // transition: border-color 0.2s ease;
    
        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },

    paste_password: {
        position: "absolute",
        bottom: 10,
        right: -7,
        paddingTop: 19,
        paddingBottom: 15,
    },

    form_report: {
        position: "absolute",
        bottom: 123,
        alignSelf: "center",
    },

    registration_form_submit: {
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
})