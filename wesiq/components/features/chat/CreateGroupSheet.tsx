// New Group Chat: Name The Group, Pick People, Then Open The New Chat

import { useState } from "react"
import { StyleSheet } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Button, Sheet, TextField } from "@/components/ui"
import { spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { showAlert } from "@/lib/alert"
import { createGroupChat } from "@/lib/api/endpoints/chat"
import UserPicker, { PickedUser } from "./UserPicker"

export const MAX_GROUP_NAME_LENGTH:number = 100 // Mirrors ChatRoom.name max_length

interface CreateGroupSheetProps {
    visible:boolean,
    onClose:() => void
}

export default function CreateGroupSheet({ visible, onClose }:CreateGroupSheetProps) {
    const { t } = useTranslation() // Initializes The Translations
    const [name, setName] = useState<string>("") // Stores The Group Name
    const [selected_users, setSelectedUsers] = useState<PickedUser[]>([]) // Stores The Picked People
    const [is_submitting, setIsSubmitting] = useState<boolean>(false)

    const trimmed_name:string = name.trim()
    const can_submit:boolean = trimmed_name.length > 0 && selected_users.length > 0

    // Function For Reset The Form
    const reset = ():void => {
        setName("")
        setSelectedUsers([])
    }

    // Function For Close The Sheet (Not While Creating)
    const close = ():void => {
        if(is_submitting) return
        onClose()
    }

    // Function For Create The Group And Open It
    const submit = async ():Promise<void> => {
        if(!can_submit || is_submitting) return

        setIsSubmitting(true)
        const response = await createGroupChat(trimmed_name, selected_users.map((user:PickedUser) => user.id)) // Sends The Request
        setIsSubmitting(false)

        if(!response.ok) {
            haptics.error()
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        reset()
        onClose()
        router.push({ pathname: "/chat/group/[room_id]", params: { room_id: String(response.data.room.id) } })
    }

    return (
        <Sheet
            visible={visible}
            onClose={close}
            title={t("Nová skupina")}
            size="large"
            is_scrollable={false}
            is_dismissable={!is_submitting}

            footer={
                <Button
                    label={selected_users.length > 0 ? t("Vytvoriť skupinu ({{count}})", { count: selected_users.length + 1 }) : t("Vytvoriť skupinu")}
                    onPress={submit}
                    icon="user-group"
                    is_loading={is_submitting}
                    is_disabled={!can_submit}
                    is_full_width
                />
            }
        >
            <UserPicker
                is_active={visible}
                selected_users={selected_users}
                onSelectedUsersChange={setSelectedUsers}

                header={
                    <TextField
                        label={t("Názov skupiny")}
                        placeholder={t("Napr. Ranné behanie")}
                        value={name}
                        onChangeText={setName}
                        maxLength={MAX_GROUP_NAME_LENGTH}
                        is_counter_visible
                        returnKeyType="done"
                        container_style={styles.name}
                    />
                }
            />
        </Sheet>
    )
}

const styles = StyleSheet.create({
    name: {
        marginTop: spacing.xs,
    },
})
