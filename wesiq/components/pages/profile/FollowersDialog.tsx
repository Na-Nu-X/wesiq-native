import { useState, useEffect, useRef, RefObject, useMemo } from "react"
import { View, Image, StyleSheet, Text, Pressable, Modal, TouchableOpacity, LayoutChangeEvent, GestureResponderEvent, PanResponder, AppState, AppStateStatus, Alert, NativeEventSubscription, KeyboardAvoidingView, Platform } from "react-native"
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av"
import { API_URL, DOMAIN } from "@/constants/general"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { FontAwesome6 } from "@expo/vector-icons"
import { BIG_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet"
import * as ScreenOrientation from "expo-screen-orientation"
import { CustomVideoControls } from "../activity/CustomVideoControls"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTranslation } from "react-i18next"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import type { BasicResponse } from "@/components/Feed"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BlurView } from "expo-blur"

interface FollowersDialogProps {
    visible:boolean,
    onClose:() => void
}

export const FollowersDialog = ({ 
    visible, 
    onClose
}:FollowersDialogProps) => {
    const { t } = useTranslation() // Initializes The Translations

    return (
        <Modal
            className="followers_dialog"
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
                        <View className="all_followers">
                            
                        </View>

                        {/* // {% if request.session.logged_in_user_id and logged_in_user and user and logged_in_user.id == user.id %}
                        //     <dialog class="followers_dialog">
                        //         <div class="all_followers">
                        //             <h2>{% translate "Sledovatelia" %} (<span class="followers_amount">{{ followers.count|default:0 }}</span>)</h2>

                        //             <a class="back" href="#" title="{% translate 'Zavrieť' %}" aria-label="{% translate 'Zavrieť' %}" target="_self"><i class="fa-solid fa-chevron-left"></i></a> <!-- https://fontawesome.com/icons/chevron-left -->
                                    
                        //             <p 
                        //                 class="
                        //                     no_followers

                        //                     {% if followers.count > 0 %}
                        //                         hidden

                        //                     {% endif %}
                        //                 "
                        //             >
                        //                 {% translate "Žiadny sledovatelia." %}
                        //             </p>

                        //             {% for one_follower in followers %}
                        //                 <div class="one_follower" data-id="{{ one_follower.id }}">
                        //                     <a href="{% url 'profile_url' one_follower.from_user.username %}" title="{% translate 'Zobraziť užívateľa' %}" aria-label="{% translate 'Zobraziť užívateľa' %}">
                        //                         <img 
                        //                             class="profile_picture skeleton_loading" 
                        //                             src="
                        //                                 {% if one_follower.from_user.profile_picture_name %}
                        //                                     /../media/images/{{ one_follower.from_user.id }}/{{ one_follower.from_user.profile_picture_name }}

                        //                                 {% else %}
                        //                                     {% static 'images/profile_picture.png' %} {% comment %} https://www.flaticon.com/free-icon/user_3177440 {% endcomment %}
                                                        
                        //                                 {% endif %}
                        //                             "
                        //                             alt=""
                        //                         >
                        //                     </a>

                        //                     <p class="username">{{ one_follower.from_user.username }}</p>

                        //                     <button 
                        //                         class="remove_follower"
                        //                         data-id="{{ one_follower.from_user.id }}"
                        //                     >
                        //                         {% translate "Odstrániť" %}
                        //                     </button>
                        //                 </div>
                                    
                        //             {% endfor %}
                        //         </div>
                        //     </dialog>

                        // {% endif %} */}
                    </KeyboardAvoidingView>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    
})