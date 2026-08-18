import React, { useState } from "react"
import { View, StyleSheet, Modal, Text, KeyboardAvoidingView, TextInput, Pressable, Image, Platform, TouchableWithoutFeedback, Keyboard } from "react-native"
import { MAIN_COLOR, SECONDARY_COLOR, BLUE_COLOR, transparentize, LIGHT_BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, RED_COLOR } from "@/constants/colors"
import { BlurView } from "expo-blur"
import SelectPosts from "@/components/SelectPosts"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import Icon from "./Icon"
import EmojiPicker from "rn-emoji-keyboard"
import * as ImagePicker from "expo-image-picker"
import { MAIN_WIDTH } from "@/constants/dimensions"

type UploadPostFormDialogProps = {
    visible:boolean
    onClose:() => void
}

export default function UploadPostFormDialog({ visible, onClose }:UploadPostFormDialogProps) {
    const [posts_preview, setPostsPreview] = useState<ImagePicker.ImagePickerAsset[]>([]) // Stores The Posts Preview Media
    const [description, setDescription] = useState<string>("") // Stores The Description Value
    const [public_visibility, setPublicVisibility] = useState<boolean>(true) // Stores The Information If The Public Visibility Is Enabled
    const [allow_comments, setAllowComments] = useState<boolean>(true) // Stores The Information If The Comments Are Allowed
    const [hide_likes, setHideLikes] = useState<boolean>(false) // Stores The Information If Likes Are Hidden
    const [is_emoji_picker_open, setIsEmojiPickerOpen] = useState(false) // Stores The Information If The Emoji Picker Is Open

    const MAX_DESCRIPTION_LENGTH:number = 500 // Defines The Maximum Description Length

    // Function For Handle The Media Selection
    const handleMediaSelection = (new_media:ImagePicker.ImagePickerAsset[]) => {
        setPostsPreview((previous_media) => [...previous_media, ...new_media]) // Sets The Posts Preview
    }

    // Function For Render Post Preview
    const renderPostPreview = () => {
        return posts_preview.map((one_media:ImagePicker.ImagePickerAsset, index:number) => (
            <View key={one_media.assetId || index} style={styles.post}>
                <Image 
                    source={{ uri: one_media.uri }} 
                    style={{ width: "100%", height: "100%" }}
                />
            </View>
        ))
    }

    // Function For Handle The Emoji Select
    const handleEmojiSelect = (emoji:{ emoji:string }) => {
        if(description.length >= MAX_DESCRIPTION_LENGTH) return
        setDescription((previous_description) => previous_description + emoji.emoji) // Sets The Description
    }

    // Function For Add The Hashtag
    const addHashtag = () => {
        // Checks For The Maximum Input Length
        if(description.length < MAX_DESCRIPTION_LENGTH - 1) {
            const previous_character:string|null = description[description.length - 1] || null // Gets The Last Entered Character (Null If There Hasn't Been Any Yet)
    
            previous_character?.charCodeAt(0) === 160 || previous_character === " " || previous_character === null ? setDescription((previous_description) => previous_description + "#") : setDescription((previous_description) => previous_description + " #") // Adds Hashtag Sign At The End With Additional Spacing (If There Isn't Already)

            // hideUsersForTag(users_for_tag_container) // Hides Users For Tag Container
            // focusAtEnd(description) // Adds Focus To The Description
        }
    }
  
    return (
        <Modal
            className="upload_post_form_dialog"
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.backdrop}>
                    <BlurView intensity={25} style={StyleSheet.absoluteFill} />

                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            { backgroundColor: transparentize(MAIN_COLOR, 0.5) },
                        ]}
                    />

                    <KeyboardAvoidingView 
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ width: "100%", alignItems: "center" }}
                    >
                        <View className="upload_post_form" style={styles.upload_post_form}>
                            <View style={styles.circle_decoration_before} />
                            <View style={styles.circle_decoration_after} />

                            <View style={styles.top}>
                                <View className="back" accessibilityLabel="Zavrieť">
                                    <Icon
                                        icon_name="chevron-left"
                                        onPress={onClose}
                                        size={30}
                                        pressed_style={{ transform: [{ scale: 1.1 }] }}
                                    />
                                </View>

                                <Text className="heading" style={styles.heading}>Zdieľať príspevok</Text>
                            </View>

                            <View className="posts_preview" style={styles.posts_preview}>
                                <SelectPosts onMediaSelection={handleMediaSelection} />

                                {posts_preview.length > 0 && (
                                    renderPostPreview()
                                )}
                            </View>

                            <View className="post_info_container" style={styles.post_info_container}>
                                <TextInput
                                    className="description"
                                    multiline={true} 
                                    textAlignVertical="top" 
                                    placeholder="Popis príspevku" 
                                    placeholderTextColor={LIGHT_BLUE_COLOR}
                                    accessibilityLabel="Popis príspevku" 
                                    value={description}
                                    onChangeText={setDescription}
                                    maxLength={MAX_DESCRIPTION_LENGTH}

                                    style={[
                                        styles.description, 
                                        { outlineStyle: "none" } as any
                                    ]}
                                />

                                <View className="icons" style={styles.icons}>
                                    <View className="settings" style={styles.settings}>
                                        <View className="public_visibility" style={styles.icon}>
                                            <Icon
                                                icon_name={public_visibility ? "eye" : "eye-low-vision"}
                                                onPress={() => setPublicVisibility(previous => !previous)} // Toggles The Value
                                            />
                                        </View>

                                        <View className="allow_comments" style={styles.icon}>
                                            <Icon
                                                icon_name={allow_comments ? "comment" : "comment-slash"}
                                                onPress={() => setAllowComments(previous => !previous)} // Toggles The Value
                                            />
                                        </View>

                                        <View className="hide_likes" style={styles.icon}>
                                            <Icon
                                                icon_name="heart"
                                                onPress={() => setHideLikes(previous => !previous)} // Toggles The Value
                                                is_regular={hide_likes ? true : false}
                                            />
                                        </View>
                                    </View>

                                    <View className="tags" style={styles.tags}>
                                        <View className="add_emoji" style={styles.icon}>
                                            <Icon 
                                                icon_name="face-surprise"
                                                is_regular={true}
                                                onPress={() => setIsEmojiPickerOpen(true)}
                                            />
                                        </View>

                                        <View className="tag_user" style={styles.icon}>
                                            <Icon 
                                                icon_name="at"
                                            />
                                        </View>

                                        <View className="add_hashtag" style={styles.icon}>
                                            <Icon 
                                                icon_name="hashtag"
                                                onPress={addHashtag}
                                            />
                                        </View>
                                    </View>
                                </View>

                                <EmojiPicker
                                    onEmojiSelected={handleEmojiSelect}
                                    open={is_emoji_picker_open}
                                    onClose={() => setIsEmojiPickerOpen(false)}

                                    translation={{
                                        smileys_emotion: "Smajlíky",
                                        people_body: "Ľudia", 
                                        recently_used: "Naposledy použité",
                                        animals_nature: "Zvieratá",
                                        food_drink: "Jedlo a nápoje",
                                        activities: "Aktivity",
                                        travel_places: "Cestovanie",
                                        objects: "Predmety",
                                        symbols: "Symboly",
                                        flags: "Vlajky",
                                        search: "Hľadať...",
                                    }}
                                />

                                <View className="users_for_tag_container_wrapper" style={styles.users_for_tag_container_wrapper}>
                                    <View className="users_for_tag_container" style={styles.users_for_tag_container}></View>
                                </View>
                            </View>

                            <View className="tagged_users_container" style={styles.tagged_users_container}></View>

                            <View className="location_container" style={styles.location_container}>
                                <View className="location_input_container" style={styles.location_input_container}>
                                    <View className="location_icon" style={styles.location_icon}>
                                        <Icon icon_name="location-arrow" />
                                    </View>

                                    <TextInput
                                        className="location"
                                        textAlignVertical="top" 
                                        placeholder="Miesto" 
                                        placeholderTextColor={LIGHT_BLUE_COLOR}
                                        accessibilityLabel="Miesto" 
                                        maxLength={255}

                                        style={[
                                            styles.location, 
                                            { outlineStyle: "none" } as any
                                        ]}
                                    />
                                </View>

                                <View className="location_results_container">
                                    <View className="loading hidden"></View>
                                    <View className="location_results hidden"></View>
                                </View>
                            </View>

                            <Text className="form_report error" style={styles.form_report}></Text>

                            <Pressable 
                                className="upload_post_form_submit"
                                onPress={() => console.log("TEST")}
                                accessibilityLabel="Uverejniť príspevok"

                                style={[
                                    styles.upload_post_form_submit, 
                                    { outlineStyle: "none" } as any
                                ]}
                            >
                                <Text className="text-white font-bold text-base" style={{ color: SECONDARY_COLOR }}>Uverejniť príspevok</Text>
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    
    upload_post_form: {
        position: "relative",
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

    posts_preview: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        width: "100%",
        marginBottom: 20,
    },

    post: {
        position: "relative",
        width: 100,
        height: 100,
        borderRadius: SMALL_BORDER_RADIUS,
        overflow: "hidden",
    },

    drag_active: {
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: transparentize(BLUE_COLOR, 0.5),
    },

    post_info_container: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: SMALL_BORDER_RADIUS,
        // transition: border-color 0.3s ease, box-shadow 0.3s ease;

        // &:hover,
        // &:has(.description:focus) {
        //     border-color: $blue-color;

        //     .users_for_tag_container_wrapper {
        //         border-color: $blue-color;
        //     }
        // }

        // &:not(:has(.users_for_tag_container.active)) {
        //         &:hover,
        //         &:has(.description:focus) {
        //             box-shadow: 0 5px 20px transparentize($blue-color, 0.85);
        //         }
        //     }
    },

    description: {
        minHeight: 100,
        paddingVertical: 5,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
    },

    icons: {
        flexDirection: "row",
        justifyContent: "space-between",
        height: 25,
        paddingHorizontal: 10,
        backgroundColor: transparentize(BLUE_COLOR, 0.9),
        // backdrop-filter: blur(5px);
        borderBottomRightRadius: SMALL_BORDER_RADIUS,
        borderBottomLeftRadius: SMALL_BORDER_RADIUS,
    },

    icon: {
        flexDirection: "row",
        justifyContent: "center",
        width: 25,
    },

    disabled_public_visibility: {
        color: transparentize(BLUE_COLOR, 0.5),
    },

    settings: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    tags: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    users_for_tag_container_wrapper: {
        position: "absolute",
        top: 0,
        transform: [{ translateX: -1 }],
        display: "none",
        opacity: 0,
        maxWidth: "100%",
        width: "100%",
        marginHorizontal: -1,
        padding: 5,
        backgroundColor: transparentize(BLUE_COLOR, 0.9),
        // backdrop-filter: blur(5px);
        borderRightWidth: 1,
        borderRightColor: transparentize(BLUE_COLOR, 0.5),
        borderLeftWidth: 1,
        borderLeftColor: transparentize(BLUE_COLOR, 0.5),
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        borderBottomRightRadius: SMALL_BORDER_RADIUS,
        borderBottomLeftRadius: SMALL_BORDER_RADIUS,
        zIndex: 50,

        // transition: border-color 0.3s ease, display 0.5s ease allow-discrete, top 0.3s ease, opacity 0.5s ease;

        // &:has(.users_for_tag_container.active) {
        //     top: calc(100% - 1px);
        //     display: block;
        //     opacity: 1;

        //     @starting-style {
        //         top: 0%;
        //         opacity: 0;
        //     }
        // }
    },

    users_for_tag_container: {
        // @include scrollbar;
        gap: 10,
        width: "100%",
        maxHeight: 3 * 48 + 30 + 5,
        padding: 5,
    },

    one_user: {
        position: "relative",
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
        
        // &.hidden {
        //     transform: translateY(calc(300% + 20px));
        //     display: none;
        // }

        // &:focus-visible {
        //     background-color: transparentize($blue-color, 0.8);
        // }
    },

    profile_picture: {
        // @include profile_picture;
        pointerEvents: "none",
    },

    username: {
        pointerEvents: "none",
        color: SECONDARY_COLOR,
    },

    delete_from_history: {
        position: "absolute",
        top: "50%",
        right: 0,
        transform: [{ translateY: "-50%" }],
        width: 15 + 10,
        height: "100%",
        lineHeight: 48,
        paddingRight: 10,
        pointerEvents: "auto",

        // transition: display 0.15s ease allow-discrete, opacity 0.15s ease;

        // &.hidden {
        //     display: none;
        //     opacity: 0;
        // }

        // &.fa-xmark {
        //     font-size: 20px;
        // }
    },

    tagged_users_container: {
        flexDirection: "row",
        gap: 10,
    },

    tag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 25,
        marginVertical: 5,
        paddingHorizontal: 5,
        backgroundColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: SMALL_BORDER_RADIUS,

        // transition: border-color 0.3s ease;
        // animation: fadeInScale 0.3s ease-in forwards;

        // &.hidden {
        //     display: none;
        // }

        // p {
        //     font-size: 0.8em;
        //     color: $blue-color;
        // }

        // .fa-xmark {
        //     @include icon;
        // }
    },

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

    form_report: {
        alignSelf: "center",
        // font-size: 0.9em;
    },

    success: {
        color: GREEN_COLOR,
    },

    error: {
        color: RED_COLOR,
    },

    upload_post_form_submit: {
        alignItems: "center",
        justifyContent: "center",
        width: "90%",
        height: 50,
        marginTop: 40,
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
})