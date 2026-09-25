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

interface FollowingDialogProps {
    visible:boolean,
    onClose:() => void
}

export const FollowingDialog = ({ 
    visible, 
    onClose
}:FollowingDialogProps) => {
    const { t } = useTranslation() // Initializes The Translations

    return (
        <Modal
            className="following_dialog"
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

                    </KeyboardAvoidingView>
                </Pressable>
            </Pressable>
        </Modal>

        // {/* {% if request.session.logged_in_user_id and logged_in_user and user and logged_in_user.id == user.id %}
        //     <dialog class="following_dialog">
        //         <div class="all_followings">
        //             <h2>{% translate "Sleduješ" %} (<span class="followings_amount">{{ following.count|default:0 }}</span>)</h2>

        //             <a class="back" href="#" title="{% translate 'Zavrieť' %}" aria-label="{% translate 'Zavrieť' %}" target="_self"><i class="fa-solid fa-chevron-left"></i></a> <!-- https://fontawesome.com/icons/chevron-left -->

        //             <p 
        //                 class="
        //                     no_followings

        //                     {% if following.count > 0 %}
        //                         hidden

        //                     {% endif %}
        //                 "
        //             >
        //                 {% translate "Nikoho nesleduješ." %}
        //             </p>

        //             {% for one_following in following %}
        //                 <div class="one_following" data-id="{{ one_following.id }}">
        //                     <a href="{% url 'profile_url' one_following.to_user.username %}" title="{% translate 'Zobraziť užívateľa' %}" aria-label="{% translate 'Zobraziť užívateľa' %}">
        //                         <img 
        //                             class="profile_picture skeleton_loading" 
        //                             src="
        //                                 {% if one_following.to_user.profile_picture_name %}
        //                                     /../media/images/{{ one_following.to_user.id }}/{{ one_following.to_user.profile_picture_name }}

        //                                 {% else %}
        //                                     {% static 'images/profile_picture.png' %} {% comment %} https://www.flaticon.com/free-icon/user_3177440 {% endcomment %}
                                        
        //                                 {% endif %}
        //                             "
        //                             alt=""
        //                         >
        //                     </a>

        //                     <p class="username">{{ one_following.to_user.username }}</p>

        //                     <button 
        //                         class="follow_button"
        //                         data-id="{{ one_following.to_user.id }}"
        //                         data-action="unfollow"
        //                     >
        //                         {% translate "Prestať sledovať" %}
        //                     </button>
        //                 </div>
                    
        //             {% endfor %}
        //         </div>
        //     </dialog>
        
        // {% endif %} */}
    )
}

const styles = StyleSheet.create({
    
})