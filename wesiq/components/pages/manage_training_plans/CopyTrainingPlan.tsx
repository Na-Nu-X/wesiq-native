import { MAIN_WIDTH } from "@/constants/dimensions"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Alert, StyleSheet, Text, View } from "react-native"
import { API_URL } from "@/constants/general"
import { OfficialTrainingPlanItem } from "./OfficialTrainingPlanItem"
import { SECONDARY_COLOR } from "@/constants/colors"

interface LoadedOfficialTrainingPlansResponse {
    success:boolean,
    official_training_plans:OfficialTrainingPlanExercise[],
    message:string
}

export interface OfficialTrainingPlanExercise {
    id:number,
    training_plan_key:string,
    type:string,
    exercise:string,
    periods:number[],
    unit:"reps"|"seconds"|"steps",
    order:number,
    is_warm_up:boolean
}

export default function CopyTrainingPlan () {
    const { t } = useTranslation() // Initializes The Translations

    const [training_plans_exercises, setTrainingPlansExercises] = useState<OfficialTrainingPlanExercise[]>([]) // Stores The Training Plans Exercises
    const [are_training_plans_loading, setAreTrainingPlansLoading] = useState<boolean>(false) // Stores The Information If Training Plans Are Loading

    // Gets The Grouped Training Plans Exercises
    const grouped_training_plans_exercises:(string)[] = [...new Set(
        training_plans_exercises.map((one_exercise:OfficialTrainingPlanExercise) => 
            one_exercise.training_plan_key
        )
    )]

    // Orders Exercises From All Training Plans By Their Order Value
    const ordered_exercises:OfficialTrainingPlanExercise[] = useMemo(() => {
        return [...training_plans_exercises].sort(
            (a:OfficialTrainingPlanExercise, b:OfficialTrainingPlanExercise) => Number(a.order) - Number(b.order)
        )
    }, [training_plans_exercises])

    // Function For Get The All Exercises From All Training Plans
    const getTrainingPlansExercises = async ():Promise<void> => {
        setAreTrainingPlansLoading(true) // Stores The Information That Training Plans Are Loading

        try {
            // Sends The GET Request To The Server
            const loaded_official_training_plans_response:Response = await fetch(`${API_URL}/get-official-training-plans/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            })

            // If The Response Isn't Success
            if(!loaded_official_training_plans_response.ok) {
                Alert.alert(t("Chyba"), t("Pri získavaní oficiálnych tréningových plánov došlo k chybe.")) // Shows The Alert
                return
            }

            const loaded_official_training_plans_data:LoadedOfficialTrainingPlansResponse = await loaded_official_training_plans_response.json() // Gets The Loaded Training Plans Data

            // If The Response Isn't Success
            if(!loaded_official_training_plans_data.success) {
                Alert.alert(t("Chyba"), loaded_official_training_plans_data.message) // Shows The Alert
                return
            }
            
            setTrainingPlansExercises(loaded_official_training_plans_data.official_training_plans) // Sets The Training Plans Exercises
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri získavaní oficiálnych tréningových plánov došlo k chybe.")) // Shows The Alert
        } 
        
        finally {
            setAreTrainingPlansLoading(false) // Stores The Information That Training Plans Aren't Loading
        }
    }

    // Initializes The Load Of The Training Plans
    useEffect(() => {
        getTrainingPlansExercises() // Gets The Training Plans Exercises
    }, [])

    return (
        <View className="copy_training_plan hidden" style={styles.copy_training_plan}>
            {ordered_exercises && ordered_exercises.length > 0 && (
                grouped_training_plans_exercises.map((one_training_plan_key:string) => (
                    <View>
                        <Text 
                            style={{ 
                                fontSize: 40,
                                color: SECONDARY_COLOR,
                                textAlign: "center",
                            }}
                        >
                            {training_plans_exercises.find((one_training_plan_exercise:OfficialTrainingPlanExercise) => one_training_plan_exercise.training_plan_key === one_training_plan_key)?.type || t("Tréningový plán")}
                        </Text>

                        <OfficialTrainingPlanItem 
                            key={one_training_plan_key}
                            onTrainingPlansExercisesUpdate={(training_plans_exercises:OfficialTrainingPlanExercise[]) => setTrainingPlansExercises(training_plans_exercises)}
                            ordered_exercises={ordered_exercises} 
                            training_plan_key={one_training_plan_key}
                        />
                    </View>
                ))
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    copy_training_plan: {
        alignItems: "center",
        justifyContent: "center",
        gap: 50,
        maxWidth: MAIN_WIDTH,
        width: "100%",
        marginHorizontal: "auto",
        // marginBottom: 50,

        // &.hidden {
        //     display: none;
        // }
    },
})