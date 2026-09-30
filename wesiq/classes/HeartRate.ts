import { BleError, BleManager, Characteristic, Device } from "react-native-ble-plx"
import { Buffer } from "buffer"
import { NativeAppEventEmitter, EmitterSubscription, PermissionsAndroid, Platform } from "react-native"
import AppleHealthKit, { HealthKitPermissions, HealthObserver } from "react-native-health"
import { initialize, requestPermission, readRecords, ReadRecordsResult, RecordResult } from "react-native-health-connect"
import { HeartRateSample } from "react-native-health-connect/lib/typescript/types/base.types"
import { useTranslation } from "react-i18next"

const { t } = useTranslation() // Initializes The Translations

export type HeartRateSourceType = "TEST"|"BLE"|"APPLE_HEALTH"|"HEALTH_CONNECT"

export interface HeartRateProvider {
    connect(device_id?:string):Promise<boolean>,
    disconnect():void,
    onHeartRateUpdate(callback:(bpm:number) => void):void
}

export class HeartRateManager {
    private active_provider:HeartRateProvider|null = null // Stores The Active Provider

    // Function For Start Monitoring
    async startMonitoring(
        source_type:HeartRateSourceType,
        onBpmChange:(bpm: number) => void,
        ble_device_id?:string
    ) {
        if(this.active_provider) this.active_provider.disconnect() // Disconnects The Active Provider

        if(source_type === "TEST") this.active_provider = new TestHeartRateProvider() // Sets "Test" As An Active Provider
        else if(source_type === "BLE") this.active_provider = new BleHeartRateProvider() // Sets "BLE" As An Active Provider
        else if(source_type === "APPLE_HEALTH") this.active_provider = new HealthKitHeartRateProvider() // Sets "Apple Health" As An Active Provider
        else if(source_type === "HEALTH_CONNECT") this.active_provider = new HealthConnectHeartRateProvider() // Sets "Android Health" As An Active Provider

        const is_connected:boolean = (await this.active_provider?.connect(ble_device_id)) || false // Gets The Information If The Device Is Connected

        if(is_connected) this.active_provider?.onHeartRateUpdate(onBpmChange) // Updates The Heart Rate
    }

    // Function For Stop Monitoring
    stopMonitoring() {
        if(this.active_provider) {
            this.active_provider.disconnect() // Disconnects The Active Provider
            this.active_provider = null // Removes The Active Provider
        }
    }
}

// Test Purposes
export class TestHeartRateProvider implements HeartRateProvider {
    private timer_id:ReturnType<typeof setInterval>|null = null // Stores The Timer ID

    // Function For Connect
    async connect():Promise<boolean> {
        return true
    }

    // Function For Disconnect
    disconnect():void {
        if(this.timer_id) clearInterval(this.timer_id) // Clears The Interval
    }

    // Function For Update The Heart Rate
    onHeartRateUpdate(callback:(bpm:number) => void):void {
        // Updates The Heart Rate Every 3 Seconds
        this.timer_id = setInterval(() => {
            const random_bpm:number = Math.floor(Math.random() * (145 - 120 + 1)) + 120 // Generates A Random BPM Between 120 And 145
            callback(random_bpm)
        }, 3000)
    }
}

// BLE Devices
const HEART_RATE_SERVICE_UUID:string = "180D" // Defines The Heart Rate Service UUID
const HEART_RATE_CHARACTERISTIC_UUID:string = "2A37" // Defines The Heart Rate Characteristic UUID

export class BleHeartRateProvider implements HeartRateProvider {
    private manager:BleManager = new BleManager() // Creates The BLE Manager
    private active_device:Device|null = null // Stores The Active Device

    // Function For Request Permissions On Android
    private async requestAndroidPermissions():Promise<boolean> {
        if(Platform.OS === "android") {
            if(Platform.Version >= 31) {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
                ])

                return (
                    granted["android.permission.BLUETOOTH_SCAN"] === PermissionsAndroid.RESULTS.GRANTED &&
                    granted["android.permission.BLUETOOTH_CONNECT"] === PermissionsAndroid.RESULTS.GRANTED
                )
            } 
            
            else {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)

                return granted === PermissionsAndroid.RESULTS.GRANTED
            }
        }

        return true
    }

    // Function For Connect To The Device
    async connect(device_id?:string):Promise<boolean> {
        const has_permissions:boolean = await this.requestAndroidPermissions() // Stores The Information If The Permissions For Connection Are Allowed

        if(!has_permissions) {
            console.error(t("Nedostatočné Bluetooth oprávnenia."))
            return false
        }

        return new Promise((resolve) => {
            // Connects To The Active Device
            if(device_id) {
                this.manager.connectToDevice(device_id)
                    .then((device:Device) => device.discoverAllServicesAndCharacteristics())
                    .then((device:Device) => {
                        this.active_device = device // Sets The Active Device
                        resolve(true)
                    })
                    .catch(() => {
                        console.error(t("Pri pripojovaní k BLE zariadeniu došlo k chybe."))
                        resolve(false)
                    })

                return
            }

            // Scans For The New Devices
            this.manager.startDeviceScan([HEART_RATE_SERVICE_UUID], null, async (error:BleError|null, device:Device|null) => {
                if(error) {
                    console.error(t("Pri skenovaní BLE zariadení došlo k chybe."))
                    this.manager.stopDeviceScan() // Stops The Scan
                    resolve(false)
                    return
                }

                if(device) {
                    this.manager.stopDeviceScan() // Stops The Scan

                    try {
                        const connected_device:Device = await device.connect() // Gets The Connected Device
                        this.active_device = await connected_device.discoverAllServicesAndCharacteristics() // Sets The Active Device
                        resolve(true)
                    } 
                    
                    catch {
                        console.error(t("Pri pripojovaní k BLE zariadeniu došlo k chybe."))
                        resolve(false)
                    }
                }
            })
        })
    }

    // Function For Disconnect From The Device
    disconnect():void {
        if(this.active_device) {
            this.manager.cancelDeviceConnection(this.active_device.id) // Disconnects From The Active Device
            this.active_device = null // Removes The Active Device
        }
    }

    // Function For Update The Heart Rate
    onHeartRateUpdate(callback:(bpm:number) => void):void {
        if(!this.active_device) return

        // Adds The Heart Rate BPM Listener (From BLE 180D - 2A37)
        this.manager.monitorCharacteristicForDevice(
            this.active_device.id,
            HEART_RATE_SERVICE_UUID,
            HEART_RATE_CHARACTERISTIC_UUID,

            (error:BleError|null, characteristic:Characteristic|null) => {
                if(error || !characteristic?.value) return

                const bpm:number = this.decodeHeartRateBase64(characteristic.value) // Decodes The Heart Rate From The Base64 Format
                if(bpm > 0) callback(bpm)
            }
        )
    }

    // Function For Decode The Heart Rate From The Base64 Format
    private decodeHeartRateBase64(base64Value: string): number {
        const buffer:Buffer = Buffer.from(base64Value, "base64")
        if(buffer.length === 0) return 0

        const flags:number = buffer[0]
        const is16_bit:boolean = (flags & 0x01) !== 0 // Checks If The Data Are In The 8-bit Or 16-bit Formmat

        if(is16_bit) return buffer.readUInt16LE(1)
        else return buffer.readUInt8(1)
    }
}

// Apple Devices
export class HealthKitHeartRateProvider implements HeartRateProvider {
    private heart_rate_subscription:EmitterSubscription|null = null

    // Function For Connect To The Device
    async connect():Promise<boolean> {
        const permissions:HealthKitPermissions = {
            permissions: {
                read: [AppleHealthKit.Constants.Permissions.HeartRate],
                write: []
            }
        }

        return new Promise((resolve) => {
            AppleHealthKit.initHealthKit(permissions, (error: string) => {
                if(error) {
                    console.error(t("Pri pripojovaní k Apple Health došlo k chybe."))
                    resolve(false)
                    return
                }

                resolve(true)
            })
        })
    }

    // Function For Disconnect From The Device
    disconnect():void {
        // Removes The Heart Rate Subscription
        if(this.heart_rate_subscription) {
            this.heart_rate_subscription.remove()
            this.heart_rate_subscription = null
        }
    }

    // Function For Update The Heart Rate
    onHeartRateUpdate(callback:(bpm:number) => void):void {
        AppleHealthKit.setObserver({
            type: HealthObserver.HeartRate
        })

        if(this.heart_rate_subscription) this.heart_rate_subscription.remove() // Removes The Heart Rate Subscription

        // Adds The Heart Rate BPM Listener
        this.heart_rate_subscription = NativeAppEventEmitter.addListener(
            "healthKit:HeartRate:new",

            (event:{ value?:number }) => {
                if(event && typeof event.value === "number") callback(event.value)
            }
        )
    }
}

// Android Devices (Samsung Galaxy Watch, Pixel Watch...)
export class HealthConnectHeartRateProvider implements HeartRateProvider {
    private timer_id:ReturnType<typeof setInterval>|null = null // Stores The Timer ID

    // Function For Connect To The Device
    async connect():Promise<boolean> {
        try {
            const is_initialized:boolean = await initialize() // Stores The Information If The Device Is Initialized
            if(!is_initialized) return false

            // Requests The Permissions
            const permissions = await requestPermission([
                { accessType: "read", recordType: "HeartRate" }
            ])

            return permissions.some(one_permission => one_permission.recordType === "HeartRate")
        } 
        
        catch {
            console.error(t("Pri pripojovaní k Health Connect došlo k chybe."))
            return false
        }
    }

    // Function For Disconnect From The Device
    disconnect():void {
        if(this.timer_id) {
            clearInterval(this.timer_id) // Clears The Interval
            this.timer_id = null // Removes The Timer ID
        }
    }

    // Function For Update The Heart Rate
    onHeartRateUpdate(callback:(bpm:number) => void):void {
        this.disconnect()

        // Updates The Heart Rate Every 3 Seconds
        this.timer_id = setInterval(async () => {
            try {
                const now:Date = new Date() // Gets The Current Time
                const start_time:Date = new Date(now.getTime() - 10000) // Gets The Start Time

                const result:ReadRecordsResult<"HeartRate"> = await readRecords("HeartRate", {
                    timeRangeFilter: {
                        operator: "between",
                        startTime: start_time.toISOString(),
                        endTime: now.toISOString()
                    }
                })

                if(result.records.length > 0) {
                    const latest_record:RecordResult<"HeartRate"> = result.records[result.records.length - 1] // Gets The Latest Record
                    const samples:HeartRateSample[] = latest_record.samples // Gets The Samples

                    if(samples && samples.length > 0) {
                        const latest_sample:HeartRateSample = samples[samples.length - 1] // Gets The Latest Sample
                        callback(latest_sample.beatsPerMinute)
                    }
                }
            } 
            
            catch {
                console.error(t("Pri čítaní tepu z Health Connect došlo k chybe."))
            }
        }, 3000)
    }
}
