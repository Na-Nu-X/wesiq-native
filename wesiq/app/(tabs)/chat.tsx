import { View, Text } from "react-native"

export default function ChatScreen() {
    return (
        <View>
            <Text>TEST</Text>
        </View>
    )
}

{/* <dialog class="notifications_dialog">
    <div class="all_messages">
        <h2>{% translate "Správy" %}</h2>

        <a class="back" href="#" title="{% translate 'Zavrieť' %}" aria-label="{% translate 'Zavrieť' %}" target="_self"><i class="fa-solid fa-chevron-left"></i></a> <!-- https://fontawesome.com/icons/chevron-left -->

        <p 
            class="
                no_messages

                {% if logged_in_user.unread_messages_amount > 0 %}
                    hidden

                {% endif %}
            "
        >
            {% translate "Žiadne nové správy" %}
        </p>

        {% regroup logged_in_user.unread_chats by sender as all_senders %}

        {% for one_sender in all_senders %}
            {% with one_message=one_sender.list.0 %}
                <div class="one_message" data-id="{{ one_message.sender.id }}">
                    <a href="{% url 'profile_url' one_message.sender.username %}" title="{% translate 'Zobraziť užívateľa' %}" aria-label="{% translate 'Zobraziť užívateľa' %}">
                        <img 
                            class="profile_picture skeleton_loading" 
                            src="
                                {% if one_message.sender.profile_picture_name %}
                                    /../media/images/{{ one_message.sender.id }}/{{ one_message.sender.profile_picture_name }}

                                {% else %}
                                    {% static 'images/profile_picture.png' %} {% comment %} https://www.flaticon.com/free-icon/user_3177440 {% endcomment %}
                                
                                {% endif %}
                            "
                            alt=""
                        >
                    </a>

                    <p class="username">{{ one_message.sender.username }}</p>

                    <div class="message_container">
                        <p class="unread_messages">
                            {% if one_sender.list|length <= 9 %}
                                {{ one_sender.list|length|default:0 }}

                            {% else %}
                                9+
                            
                            {% endif %}
                        </p>

                        <a class="chat" href="{% url 'chat_url' one_message.sender.username %}" title="{% translate 'Zobraziť správy' %}" aria-label="{% translate 'Zobraziť správy' %}" target="_self">
                            <i class="fa-regular fa-comment-dots"></i> <!-- https://fontawesome.com/icons/comment-dots -->
                        </a>
                    </div>
                </div>
        
            {% endwith %}
        {% endfor %}
    </div>
</dialog> */}