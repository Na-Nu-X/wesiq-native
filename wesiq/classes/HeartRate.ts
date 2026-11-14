// Heart Rate Sources: A Bluetooth Strap (Live), Apple Health / Health Connect (Delayed: Watches Sync Their Samples In Batches) And Test Data

import { BleManager, Characteristic, Device, State, Subscription } from "react-native-ble-plx"
import { Buffer } from "buffer"
import { PermissionsAndroid, Platform } from "react-native"
import AppleHealthKit, { HealthKitPermissions, HealthValue } from "react-native-health"
import { getSdkStatus, initialize, readRecords, requestPermission, SdkAvailabilityStatus } from "react-native-health-connect"
import i18n from "@/lib/i18n"

export type HeartRateSourceType = "TEST"|"BLE"|"APPLE_HEALTH"|"HEALTH_CONNECT"

// Reasons Why A Source Couldn't Connect ("cancelled" = Another Source Was Picked Or The Connection Was Stopped Meanwhile)
export type HeartRateConnectError = "permission"|"bluetooth_off"|"not_found"|"unavailable"|"failed"|"cancelled"
export type HeartRateConnectResult = { ok:true } | { ok:false, error:HeartRateConnectError }

export interface HeartRateProvider {
    connect(device_id?:string):Promise<HeartRateConnectResult>,
    disconnect():void,
    onHeartRateUpdate(callback:(bpm:number|null) => void):void, // Null = No Recent Value
    onConnectionLost?(callback:() => void):void
}

const CONNECTED:HeartRateConnectResult = { ok: true }
const fail = (error:HeartRateConnectError):HeartRateConnectResult => ({ ok: false, error })

const HEALTH_POLL_MS:number = 5000 // How Often Apple Health / Health Connect Are Read
const MAX_SAMPLE_AGE_MS:number = 5 * 60 * 1000 // Older Health Samples Aren't Shown (Watches Sync Every Few Minutes)

export class HeartRateManager {
    private active_provider:HeartRateProvider|null = null // Stores The Active Provider

    // Function For Start Monitoring
    async startMonitoring(
        source_type:HeartRateSourceType,
        onBpmChange:(bpm:number|null) => void,
        onConnectionLost?:() => void,
        ble_device_id?:string
    ):Promise<HeartRateConnectResult> {
        this.stopMonitoring() // Disconnects (And Cancels) The Previous Provider

        let provider:HeartRateProvider

        if(source_type === "TEST") provider = new TestHeartRateProvider()
        else if(source_type === "BLE") provider = new BleHeartRateProvider()
        else if(source_type === "APPLE_HEALTH") provider = new HealthKitHeartRateProvider()
        else provider = new HealthConnectHeartRateProvider()

        this.active_provider = provider

        const result:HeartRateConnectResult = await provider.connect(ble_device_id).catch(() => fail("failed")) // Connects

        if(this.active_provider !== provider) {
            provider.disconnect()
            return fail("cancelled") // Another Source Was Picked While Connecting
        }

        if(!result.ok) {
            this.active_provider = null
            return result
        }

        provider.onHeartRateUpdate(onBpmChange)
        if(onConnectionLost) provider.onConnectionLost?.(onConnectionLost)

        return result
    }

    // Function For Stop Monitoring
    stopMonitoring():void {
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
    async connect():Promise<HeartRateConnectResult> {
        return CONNECTED
    }

    // Function For Disconnect
    disconnect():void {
        if(this.timer_id) clearInterval(this.timer_id) // Clears The Interval
        this.timer_id = null
    }

    // Function For Update The Heart Rate
    onHeartRateUpdate(callback:(bpm:number|null) => void):void {
        // Updates The Heart Rate Every 3 Seconds
        this.timer_id = setInterval(() => {
            const random_bpm:number = Math.floor(Math.random() * (145 - 120 + 1)) + 120 // Generates A Random BPM Between 120 And 145
            callback(random_bpm)
        }, 3000)
    }
}

// BLE Devices (Chest Straps And Armbands With The Standard Heart Rate Service)
const HEART_RATE_SERVICE_UUID:string = "180D" // Defines The Heart Rate Service UUID
const HEART_RATE_CHARACTERISTIC_UUID:string = "2A37" // Defines The Heart Rate Characteristic UUID
const BLUETOOTH_STATE_TIMEOUT_MS:number = 30000 // Waits For Bluetooth To Be Ready (Includes The First iOS Permission Prompt)
const SCAN_TIMEOUT_MS:number = 15000 // Gives Up When No Sensor Is Found
const SCAN_SETTLE_MS:number = 1500 // After The First Sensor, Keeps Scanning Briefly To Pick The Closest One

let ble_manager:BleManager|null = null // One Shared Manager (The Library Is A Singleton), Created On First Use

// Function For Get The Shared BLE Manager
const getBleManager = ():BleManager => {
    if(!ble_manager) ble_manager = new BleManager()
    return ble_manager
}

// Function For Wait Until Bluetooth Reports A Settled State (Unknown / Resetting Right After Start)
const waitForBluetoothState = (manager:BleManager):Promise<State> => {
    return new Promise((resolve) => {
        let is_done:boolean = false
        let subscription:Subscription|null = null

        const finish = (state:State):void => {
            if(is_done) return
            is_done = true
            clearTimeout(timer)
            subscription?.remove()
            resolve(state)
        }

        const timer:ReturnType<typeof setTimeout> = setTimeout(() => finish(State.Unknown), BLUETOOTH_STATE_TIMEOUT_MS)

        subscription = manager.onStateChange((state:State) => {
            if(state !== State.Unknown && state !== State.Resetting) finish(state)
        }, true)

        if(is_done) subscription.remove() // The State Was Already Known
    })
}

export class BleHeartRateProvider implements HeartRateProvider {
    private active_device:Device|null = null // Stores The Active Device
    private is_cancelled:boolean = false // Stores The Information If The Connection Was Stopped
    private stop_scan:(() => void)|null = null // Stops A Running Scan
    private monitor_subscription:Subscription|null = null
    private disconnect_subscription:Subscription|null = null
    private on_connection_lost:(() => void)|null = null

    // Function For Request Permissions On Android
    private async requestAndroidPermissions():Promise<boolean> {
        if(Platform.OS !== "android") return true

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

        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) // Android 11 And Older Need Location For Scanning
        return granted === PermissionsAndroid.RESULTS.GRANTED
    }

    // Function For Scan For The Closest Heart Rate Sensor (Null = None Found Or Cancelled)
    private scan(manager:BleManager):Promise<Device|null> {
        return new Promise((resolve) => {
            let best_device:Device|null = null
            let settle_timer:ReturnType<typeof setTimeout>|null = null
            let is_done:boolean = false

            const finish = (device:Device|null):void => {
                if(is_done) return
                is_done = true
                clearTimeout(timeout_timer)
                if(settle_timer) clearTimeout(settle_timer)
                manager.stopDeviceScan()
                this.stop_scan = null
                resolve(device)
            }

            const timeout_timer:ReturnType<typeof setTimeout> = setTimeout(() => finish(best_device), SCAN_TIMEOUT_MS)
            this.stop_scan = () => finish(null)

            manager.startDeviceScan([HEART_RATE_SERVICE_UUID], null, (error, device) => {
                if(error) {
                    console.error(i18n.t("Pri skenovaní BLE zariadení došlo k chybe."))
                    finish(null)
                    return
                }

                if(!device) return

                if(!best_device || (device.rssi ?? -999) > (best_device.rssi ?? -999)) best_device = device // Keeps The Strongest Signal
                if(!settle_timer) settle_timer = setTimeout(() => finish(best_device), SCAN_SETTLE_MS)
            })
        })
    }

    // Function For Connect To The Device
    async connect(device_id?:string):Promise<HeartRateConnectResult> {
        const has_permissions:boolean = await this.requestAndroidPermissions() // Stores The Information If The Permissions For Connection Are Allowed
        if(!has_permissions) return fail("permission")

        const manager:BleManager = getBleManager()
        const state:State = await waitForBluetoothState(manager) // Scanning Before Bluetooth Is Ready Fails

        if(this.is_cancelled) return fail("cancelled")
        if(state === State.PoweredOff) return fail("bluetooth_off")
        if(state === State.Unauthorized) return fail("permission")
        if(state !== State.PoweredOn) return fail("unavailable")

        try {
            const device:Device|null = device_id ? await manager.connectToDevice(device_id) : await this.scan(manager) // Uses The Known Device Or Finds One
            if(this.is_cancelled) return fail("cancelled")
            if(!device) return fail("not_found")

            const connected_device:Device = device_id ? device : await device.connect()
            this.active_device = await connected_device.discoverAllServicesAndCharacteristics()

            if(this.is_cancelled) {
                this.disconnect()
                return fail("cancelled")
            }

            // Reports A Lost Connection (Out Of Range, Strap Taken Off, Battery)
            this.disconnect_subscription = manager.onDeviceDisconnected(this.active_device.id, () => {
                if(this.is_cancelled) return
                this.cleanUp()
                this.on_connection_lost?.()
            })

            return CONNECTED
        }

        catch {
            console.error(i18n.t("Pri pripojovaní k BLE zariadeniu došlo k chybe."))
            return fail("failed")
        }
    }

    // Function For Remove Subscriptions And Forget The Device
    private cleanUp():void {
        this.stop_scan?.()
        this.monitor_subscription?.remove()
        this.disconnect_subscription?.remove()
        this.monitor_subscription = null
        this.disconnect_subscription = null
        this.active_device = null
    }

    // Function For Disconnect From The Device
    disconnect():void {
        this.is_cancelled = true
        const device_id:string|undefined = this.active_device?.id
        this.cleanUp()

        if(device_id) getBleManager().cancelDeviceConnection(device_id).catch(() => {}) // Already Disconnected
    }

    // Function For Report A Lost Connection
    onConnectionLost(callback:() => void):void {
        this.on_connection_lost = callback
    }

    // Function For Update The Heart Rate
    onHeartRateUpdate(callback:(bpm:number|null) => void):void {
        if(!this.active_device) return

        // Adds The Heart Rate BPM Listener (From BLE 180D - 2A37)
        this.monitor_subscription = getBleManager().monitorCharacteristicForDevice(
            this.active_device.id,
            HEART_RATE_SERVICE_UUID,
            HEART_RATE_CHARACTERISTIC_UUID,

            (error, characteristic:Characteristic|null) => {
                if(error || !characteristic?.value) return

                const bpm:number = this.decodeHeartRateBase64(characteristic.value) // Decodes The Heart Rate From The Base64 Format
                if(bpm > 0) callback(bpm)
            }
        )
    }

    // Function For Decode The Heart Rate From The Base64 Format
    private decodeHeartRateBase64(base64_value:string):number {
        const buffer:Buffer = Buffer.from(base64_value, "base64")
        if(buffer.length < 2) return 0

        const is_16_bit:boolean = (buffer[0] & 0x01) !== 0 // Checks If The Data Are In The 8-bit Or 16-bit Format

        if(is_16_bit) return buffer.length >= 3 ? buffer.readUInt16LE(1) : 0
        else return buffer.readUInt8(1)
    }
}

// Apple Devices (Reads The Latest Sample Apple Health Has; An Apple Watch Syncs Them With A Delay)
export class HealthKitHeartRateProvider implements HeartRateProvider {
    private timer_id:ReturnType<typeof setInterval>|null = null // Stores The Timer ID

    // Function For Connect To Apple Health
    async connect():Promise<HeartRateConnectResult> {
        if(Platform.OS !== "ios") return fail("unavailable")

        const is_available:boolean = await new Promise((resolve) => AppleHealthKit.isAvailable((error, available:boolean) => resolve(!error && available)))
        if(!is_available) return fail("unavailable")

        const permissions:HealthKitPermissions = {
            permissions: {
                read: [AppleHealthKit.Constants.Permissions.HeartRate],
                write: []
            }
        }

        // Apple Doesn't Tell Apps Whether Reading Was Denied, So A Denied Permission Shows Up As No Data
        return new Promise((resolve) => {
            AppleHealthKit.initHealthKit(permissions, (error:string) => {
                if(error) {
                    console.error(i18n.t("Pri pripojovaní k Apple Health došlo k chybe."))
                    resolve(fail("failed"))
                    return
                }

                resolve(CONNECTED)
            })
        })
    }

    // Function For Disconnect From Apple Health
    disconnect():void {
        if(this.timer_id) clearInterval(this.timer_id) // Clears The Interval
        this.timer_id = null
    }

    // Function For Read The Latest Heart Rate Sample
    private readLatest(callback:(bpm:number|null) => void):void {
        const now:Date = new Date()

        AppleHealthKit.getHeartRateSamples({
            startDate: new Date(now.getTime() - MAX_SAMPLE_AGE_MS).toISOString(),
            endDate: now.toISOString(),
            ascending: false,
            limit: 1,
        }, (error:string, results:HealthValue[]) => {
            if(!this.timer_id) return // Disconnected Meanwhile
            if(error) return

            const bpm:number|undefined = results[0]?.value
            callback(bpm ? Math.round(bpm) : null)
        })
    }

    // Function For Update The Heart Rate
    onHeartRateUpdate(callback:(bpm:number|null) => void):void {
        this.disconnect()
        this.timer_id = setInterval(() => this.readLatest(callback), HEALTH_POLL_MS)
        this.readLatest(callback)
    }
}

// Android Devices (Samsung Galaxy Watch, Pixel Watch...; Their Apps Sync To Health Connect Every Few Minutes)
export class HealthConnectHeartRateProvider implements HeartRateProvider {
    private timer_id:ReturnType<typeof setInterval>|null = null // Stores The Timer ID

    // Function For Connect To Health Connect
    async connect():Promise<HeartRateConnectResult> {
        try {
            const sdk_status:number = await getSdkStatus() // Health Connect Is A Separate App On Android 13 And Older
            if(sdk_status !== SdkAvailabilityStatus.SDK_AVAILABLE) return fail("unavailable")

            const is_initialized:boolean = await initialize() // Stores The Information If The Device Is Initialized
            if(!is_initialized) return fail("unavailable")

            // Requests The Permissions
            const permissions = await requestPermission([
                { accessType: "read", recordType: "HeartRate" }
            ])

            return permissions.some((one_permission) => one_permission.recordType === "HeartRate") ? CONNECTED : fail("permission")
        }

        catch {
            console.error(i18n.t("Pri pripojovaní k Health Connect došlo k chybe."))
            return fail("failed")
        }
    }

    // Function For Disconnect From Health Connect
    disconnect():void {
        if(this.timer_id) clearInterval(this.timer_id) // Clears The Interval
        this.timer_id = null
    }

    // Function For Read The Latest Heart Rate Sample
    private async readLatest(callback:(bpm:number|null) => void):Promise<void> {
        try {
            const now:Date = new Date()

            const result = await readRecords("HeartRate", {
                timeRangeFilter: {
                    operator: "between",
                    startTime: new Date(now.getTime() - MAX_SAMPLE_AGE_MS).toISOString(),
                    endTime: now.toISOString()
                }
            })

            if(!this.timer_id) return // Disconnected Meanwhile

            // Each Record Holds Several Samples, So The Newest One Is Searched Across All Of Them
            const samples:{ time:string, beatsPerMinute:number }[] = result.records.flatMap((record) => record.samples)
            const latest_sample = samples.reduce<{ time:string, beatsPerMinute:number }|null>((latest, sample) => !latest || Date.parse(sample.time) > Date.parse(latest.time) ? sample : latest, null)

            callback(latest_sample ? Math.round(latest_sample.beatsPerMinute) : null)
        }

        catch {
            console.error(i18n.t("Pri čítaní tepu z Health Connect došlo k chybe."))
        }
    }

    // Function For Update The Heart Rate
    onHeartRateUpdate(callback:(bpm:number|null) => void):void {
        this.disconnect()
        this.timer_id = setInterval(() => this.readLatest(callback), HEALTH_POLL_MS)
        this.readLatest(callback)
    }
}
