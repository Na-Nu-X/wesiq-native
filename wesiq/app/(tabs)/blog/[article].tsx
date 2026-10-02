import { View, Text, StyleSheet, ScrollView, Image, Alert, Pressable, Switch } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useMemo, useRef, useState } from "react"
import Banner from "@/components/Banner"
import Icon from "@/components/Icon"
import { useLocalSearchParams } from "expo-router"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import { API_URL, DOMAIN } from "@/constants/general"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, RED_COLOR, transparentize } from "@/constants/colors"
import { isValidPhoneNumber } from "libphonenumber-js"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { MAIN_WIDTH } from "@/constants/dimensions"
import * as ImagePicker from "expo-image-picker"
import { useTranslation } from "react-i18next"
import EditAccountForm from "@/components/pages/profile/EditAccountForm"
import ProfileSection from "@/components/pages/profile/ProfileSection"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"
import type { BasicResponse } from "@/components/Feed"
import Back from "@/components/Back"

interface ProfileResponse {
    success:boolean,
    is_found:boolean,
    user?:Profile,
    message:string
}

export interface Profile {
    id:number,
    first_name:string|null,
    last_name:string|null,
    username:string,
    email_address:string|null,
    phone_number:string|null,
    role:string,
    profile_picture_name:string,
    creation_time:string,
    friend_code:string,
    bio:string,
    bio_links:BioLink[],
    xp:number,
    activity_streak:number,
    max_activity_streak:number,
    has_already_increased_activity_streak:boolean,
    private_account:boolean,
    data_saving_mode:boolean|null,

    followers:{
        from_user:{
            id:number,
            first_name:string,
            last_name:string,
            username:string,
            profile_picture_name:string|null,
            private_account:boolean,

            subscription:{
                plan:string,
                is_active:boolean
            }|null
        },

        status:string,
        created_at:string
    }[],

    following:{
        to_user:{
            id:number,
            first_name:string,
            last_name:string,
            username:string,
            profile_picture_name:string|null,
            private_account:boolean,

            subscription:{
                plan:string,
                is_active:boolean
            }|null,

            has_follow:boolean,
            has_pending_follow_request:boolean,
        },

        status:string,
        created_at:string
    }[],

    has_follow:boolean,
    has_pending_follow_request:boolean,

    posts:{
        id:number,
        public_visibility:boolean,
        allow_comments:boolean,
        hide_likes:boolean,
        created_at:string,

        media:{
            id:number,
            file:string,
            thumbnail:string|null,
            is_video:boolean,
            is_muted:boolean
        }[]
    }[],

    saved_posts:{
        id:number,
        public_visibility:boolean,
        allow_comments:boolean,
        hide_likes:boolean,
        created_at:string,

        media:{
            id:number,
            file:string,
            thumbnail:string|null,
            is_video:boolean,
            is_muted:boolean
        }[]
    }[]|null,

    unread_messages_amount:number|null,

    subscription:{
        plan:string,
        is_active:boolean
    }|null,

    total_transactions_amount:number,
    level:number,
    years_since_registration:number,
    total_activities:number,
    total_received_likes:number,
    post_comments:[],
    badges:{ title:string, data:string }[],
}

export interface BioLink {
    id:number,
    url:string
}

export default function ProfileScreen() {
    const { t } = useTranslation() // Initializes The Translations
    
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)
    
    // Function For Get The Logged In User
    const getLoggedInUser = async () => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
            const logged_in_user_response:Response = await fetch(`${API_URL}/get-logged-in-user/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })
    
            const logged_in_user_data:LoggedInUserResponse = await logged_in_user_response.json() // Gets The Logged In User Data

            if(logged_in_user_response.status === 401) {
                await AsyncStorage.removeItem("user_token") // Removes The User Token
                setLoggedInUser(null) // Removes The Logged In User
                return null
            }
    
            if(logged_in_user_data.success) {
                setLoggedInUser(logged_in_user_data.logged_in_user || null) // Sets The Logged In User
                return logged_in_user_data.logged_in_user || null
            } 
            
            else return null
        } 
        
        catch {
            return null
        }
    }

    // Initializes The Get Logged In User
    useEffect(() => {
        getLoggedInUser() // Gets The Logged In User
    }, [])

    return (
        <BackgroundContainer>
            <SafeAreaView style={[styles.safe_area, { flex: 1 }]}>
                <Banner 
                    logged_in_user={logged_in_user} 
                    setActiveForm={setActiveForm} 
                />

                <ScrollView 
                    className="content" 
                    style={styles.content} 
                    contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled" 
                    keyboardDismissMode="on-drag"
                >
                    <View className="article_banner">
                        
                    </View>

                    {/* <div class="article_banner">
                        <div class="banner_image">
                            <img src="{% static './images/articles' %}/{{ article.image_name }}" alt="">
                        </div>
                        
                        <div class="banner_info">
                            <div class="article_opening">
                                <h2>{{ article.title }}</h2>
                                <p>{{ article.description }}</p>
                            </div>

                            <div class="article_info">
                                <div 
                                    class="rating" 
                                    title="
                                        {% if article.average_rating|default:0|floatformat:0|add:0 == 0 %}
                                            {% translate 'Zatiaľ žiadne hodnotenia' %}
                                        
                                        {% else %}
                                            {% translate 'Priemerné hodnotenie' %} {{ article.average_rating|default:0 }}

                                        {% endif %}
                                    "
                                >
                                    {% for _ in "12345" %}
                                        {% if forloop.counter <= article.average_rating|default:0|floatformat:0|add:0 %}
                                            <i class="full fa-solid fa-star"></i> <!-- https://fontawesome.com/icons/star -->

                                        {% else %}
                                            <i class="empty fa-solid fa-star"></i> <!-- https://fontawesome.com/icons/star -->

                                        {% endif %}
                                    {% endfor %}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="exercise_statistics">
                        <div 
                            class="bar difficulty" 
                            data-label="
                                {% translate 'obtiažnosť: ' %}

                                {% if article.difficulty <= 10 %}
                                    {% translate 'jednoduchá' %}

                                {% elif article.difficulty <= 30 %}
                                    {% translate 'stredná' %}

                                {% elif article.difficulty <= 60 %}
                                    {% translate 'náročná' %}

                                {% elif article.difficulty <= 90 %}
                                    {% translate 'veľmi náročná' %}

                                {% else %}
                                    {% translate 'elitná' %}

                                {% endif %}
                            " 
                            data-percentage="{{ article.difficulty }}">
                        </div>

                        <div class="bar time_to_learn" 
                            data-label="
                                {% translate 'doba učenia: ' %}

                                {% if article.time_to_learn_text == "2 - 6 months" %}
                                    {% translate '2 - 6 mesiacov' %}
                                
                                {% endif %}
                            " 
                            data-percentage="{{ article.time_to_learn }}">
                        </div>

                        <div 
                            class="bar rarity" 
                            data-label="
                                {% translate 'vzácnosť: ' %}

                                {% if article.ratity <= 10 %}
                                    {% translate 'bežné' %}

                                {% elif article.rarity <= 30 %}
                                    {% translate 'nevídané' %}

                                {% elif article.rarity <= 60 %}
                                    {% translate 'vzácne' %}

                                {% elif article.rarity <= 90 %}
                                    {% translate 'epické' %}

                                {% else %}
                                    {% translate 'legendárne' %}

                                {% endif %}
                            " 
                            data-percentage="{{ article.rarity }}">
                        </div>

                        <div class="bar strength" data-label="{% translate 'sila' %}" data-percentage="{{ article.strength }}"></div>
                        <div class="bar technique" data-label="{% translate 'technika' %}" data-percentage="{{ article.technique }}"></div>
                    </div>

                    <div class="article_content" data-article_id="{{ article.id }}">
                        {% if article.html_filename %}
                            {% include "partials/articles/"|add:article.html_filename %}
                        
                        {% else %}
                            <h2>{% translate "Tento článok nie je ešte dokončený." %}</h2>
                        
                        {% endif %}
                    </div>

                    {% if request.session.logged_in_user_id %}
                        <script src="{% static 'app/ts/dist/pages/articles/components/rating.js' %}" type="module"></script>

                        <div class="rating">
                            <a href="{% url 'profile_url' logged_in_user.username %}" title="{% translate 'Zobraziť užívateľa' %}" aria-label="{% translate 'Zobraziť užívateľa' %}">
                                <img 
                                    class="profile_picture skeleton_loading" 
                                    src="
                                        {% if logged_in_user.profile_picture_name %}
                                            /../media/images/{{ logged_in_user.id }}/{{ logged_in_user.profile_picture_name }}

                                        {% else %}
                                            {% static 'images/profile_picture.png' %} {% comment %} https://www.flaticon.com/free-icon/user_3177440 {% endcomment %}
                                        
                                        {% endif %}
                                    "
                                    alt=""
                                >
                            </a>

                            {% for _ in "12345" %}
                                {% if forloop.counter <= article.given_rating %}
                                    <button type="button">
                                        <i class="full fa-solid fa-star"></i> <!-- https://fontawesome.com/icons/star -->
                                    </button>

                                {% else %}
                                    <button type="button">
                                        <i class="empty fa-solid fa-star"></i> <!-- https://fontawesome.com/icons/star -->
                                    </button>
                                
                                {% endif %}
                            {% endfor %}

                            <input type="number" name="rating" value="{{ article.given_rating }}" min="0" max="5">
                        </div>
                    
                    {% endif %}

                    <div class="comment_forum" data-logged_in_user_role="{{ logged_in_user.role|default:'unauthorized' }}">
                        <template class="one_comment_template">
                            <div class="one_comment">
                                <div class="comment_container">
                                    <div class="user">
                                        <a href="#" title="{% translate 'Zobraziť užívateľa' %}" aria-label="{% translate 'Zobraziť užívateľa' %}">
                                            <img class="profile_picture" src="{% static 'images/profile_picture.png' %}" alt=""> <!-- https://www.flaticon.com/free-icon/user_3177440 -->
                                        </a>
                                        
                                        <p class="username"></p>
                
                                        <button 
                                            class="show_comment_properties_button" 
                                            popovertarget=""
                                            style=""
                                            title="{% translate 'Viac...' %}"
                                            aria-label="{% translate 'Viac...' %}"
                                        >
                                            <i class="fa-solid fa-ellipsis-vertical"></i> <!-- https://fontawesome.com/icons/ellipsis-vertical -->
                                        </button>

                                        <div 
                                            class="comment_properties" 
                                            id=""
                                            popover
                                            style=""
                                        >
                                            <button 
                                                class="hide_comment_properties_button" 
                                                popovertarget=""
                                                popovertargetaction="hide"
                                            >
                                                <i class="fa-solid fa-xmark"></i> <!-- https://fontawesome.com/icons/xmark -->
                                                <span>{% translate "Zavrieť" %}</span>
                                            </button>
                                        </div>
                                    </div>
                
                                    <div class="right">
                                        <p class="comment"></p>
                    
                                        <button class="likes" title="{% translate 'Páči sa mi...' %}" aria-label="{% translate 'Páči sa mi...' %}">
                                            <i class="fa-heart"></i> <!-- https://fontawesome.com/icons/heart -->
                                            <p class="likes_counter">{{ one_comment.likes }}</p>
                                        </button>
                                    </div>
                                </div>
                
                                <div class="interactions">
                                    <div class="date" title="{% translate 'Dátum zverejnenia' %}" aria-label="{% translate 'Dátum zverejnenia' %}">
                                        <p></p>
                                    </div>
                                </div>
                
                                <div class="reply_container hidden"></div>
                            </div>
                        </template>

                        <template class="report_template">
                            <div 
                                class="report" 
                                id=""
                                popover
                                style=""
                            >
                                <button data-reason="spam"><span>{% translate "Spam" %}</span></button>
                                <button data-reason="harassment"><span>{% translate "Obťažovanie" %}</span></button>
                                <button data-reason="hate_speech"><span>{% translate "Nenávistné prejavy" %}</span></button>
                                <button data-reason="misinformation"><span>{% translate "Dezinformácie" %}</span></button>
                                <button data-reason="explicit_content"><span>{% translate "Explicitný obsah" %}</span></button>
                                <button data-reason="other"><span>{% translate "Iné" %}</span></button>
                
                                <button 
                                    class="back_report_button"
                                    popovertarget="" 
                                    popovertargetaction="hide"
                                >
                                    <i class="fa-solid fa-xmark"></i> <!-- https://fontawesome.com/icons/xmark -->
                                    <span>{% translate "Späť" %}</span>
                                </button>
                            </div>
                        </template>

                        {% comment %} <div class="heading">
                            <div class="comments_counter">
                                <i class="fa-regular fa-comment"></i> <!-- https://fontawesome.com/icons/comment -->
                                <p>{{ article.visible_comments|length }}</p>
                            </div>

                            <h3>{% translate "Komentáre" %}</h3>
                        </div> {% endcomment %}

                        <div class="all_comments">
                            {% for one_comment in article.root_comments %}
                                {% include "partials/comment.html" with one_comment=one_comment level=1 all_nested_comments=article.nested_comments role=logged_in_user.role %}

                            {% endfor %}
                        </div>

                        <div class="write_comment_form">
                            {{ write_comment_form.comment }}

                            <img 
                                class="profile_picture" 
                                src="
                                    {% if logged_in_user.profile_picture_name %}
                                        /../media/images/{{ request.session.logged_in_user_id }}/{{ logged_in_user.profile_picture_name }}

                                    {% else %}
                                        {% static 'images/profile_picture.png' %} {% comment %} https://www.flaticon.com/free-icon/user_3177440 {% endcomment %}
                                    
                                    {% endif %}
                                "
                                alt=""
                            >

                            <button class="add_emoji" title="{% translate 'Pridať emoji' %}" aria-label="{% translate 'Pridať emoji' %}">
                                <i class="fa-regular fa-face-surprise"></i> <!-- https://fontawesome.com/icons/face-surprise -->
                            </button>

                            <div class="emoji_picker_container hidden">
                                <emoji-picker></emoji-picker>
                            </div>
                            
                            <button class="send" title="{% translate 'Odoslať komentár' %}" aria-label="{% translate 'Odoslať komentár' %}">
                                <!-- https://heroicons.com/ -->
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                </svg>
                            </button>
                        </div>
                    </div> */}
                </ScrollView>
            </SafeAreaView>
        </BackgroundContainer>
    )
}

const styles = StyleSheet.create({
    safe_area: {
        flex: 1,
    },
  
    content: {
        flex: 1,
    },
})