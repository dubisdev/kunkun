import {
	restartServer,
	setDevExtensionFolder as setDevExtensionFolderForServer
} from "@kksh/api/commands"
import { LightMode } from "@kksh/api/models"
import { unregister } from "@tauri-apps/plugin-global-shortcut"
import { debug, info, warn } from "@tauri-apps/plugin-log"
import { Store } from "@tauri-apps/plugin-store"
import { useColorMode } from "@vueuse/core"
import { allColors } from "~/lib/themes/themes"
import { registerAppHotkey } from "~/lib/utils/hotkey"
import { mapKeyToTauriKey } from "~/lib/utils/js"
import { emitRefreshConfig } from "~/lib/utils/tauri-events"
import { isEqual } from "lodash"
import { defineStore } from "pinia"
import {
	array,
	boolean,
	flatten,
	literal,
	nullable,
	number,
	object,
	optional,
	safeParse,
	string,
	union,
	type InferOutput
} from "valibot"

const persistAppConfig = new Store("appConfig.bin")

export const appConfigSchema = object({
	isInitialized: boolean(),
	theme: string(),
	radius: number(),
	triggerHotkey: nullable(array(string())),
	lightMode: LightMode,
	launchAtLogin: boolean(),
	showInTray: boolean(),
	devExtensionPath: optional(string()),
	devExtLoadUrl: optional(boolean(), false) // load extension page from dev server
})
type State = InferOutput<typeof appConfigSchema>

export const useAppConfigStore = defineStore("appConfig", {
	state: (): State => ({
		isInitialized: false,
		theme: "zinc",
		radius: 0.5,
		triggerHotkey: null,
		lightMode: "auto",
		launchAtLogin: true,
		showInTray: true,
		devExtensionPath: undefined,
		devExtLoadUrl: false
	}),
	getters: {
		themeClass(state) {
			return `theme-${state.theme}`
		}
	},
	actions: {
		/**
		 * Initialize the app config store, no other things done
		 * use refreshWindowStyles after init to to set styles
		 */
		async init() {
			this.isInitialized = true
			const loadedConfig = await persistAppConfig.get("config")
			const parseRes = safeParse(appConfigSchema, loadedConfig)
			if (parseRes.success) {
				if (!isEqual(parseRes.output, this.$state)) {
					// !very important: only update store if loaded config is different from default, otherwise this will trigger infinite recursion
					this.$state = { ...this.$state, ...parseRes.output }
				}
			} else {
				console.error(
					"Failed to parse app config",
					flatten<typeof appConfigSchema>(parseRes.issues)
				)
			}
		},
		/**
		 * Refresh styles (border radius, theme, color mode) for current window
		 */
		refreshWindowStyles() {
			document.documentElement.style.setProperty("--radius", `${this.radius}rem`)
			document.documentElement.classList.remove(...allColors.map((color) => `theme-${color}`))
			document.documentElement.classList.add(`theme-${this.theme}`)
			const colorMode = useColorMode()
			colorMode.value = this.lightMode ?? "system"
		},
		setTheme(theme: string) {
			this.theme = theme
			document.documentElement.classList.remove(...allColors.map((color) => `theme-${color}`))
			document.documentElement.classList.add(`theme-${theme}`)
		},
		setRadius(radius: number) {
			this.radius = radius
			document.documentElement.style.setProperty("--radius", `${radius}rem`)
		},
		async setTriggerHotkey(keys: string[] | null) {
			const originalHotkey = this.triggerHotkey
			if (originalHotkey === keys) {
				return warn("Trigger hotkey is the same as the original one")
			}
			if (originalHotkey) {
				const unregisterHotkey = originalHotkey.map(mapKeyToTauriKey).join("+")
				info(`Unregistering hotkey: ${unregisterHotkey}`)
				await unregister(unregisterHotkey)
			}
			this.triggerHotkey = keys
			if (!keys) {
				return
			}
			const hotkeyStr = keys.map(mapKeyToTauriKey).join("+")
			return registerAppHotkey(hotkeyStr)
		},
		setLightMode(mode: LightMode) {
			const colorMode = useColorMode()
			this.lightMode = mode
			colorMode.value = mode
		},
		setLaunchAtLogin(launchAtLogin: boolean) {
			this.launchAtLogin = launchAtLogin
		},
		setShowInTray(showInTray: boolean) {
			this.showInTray = showInTray
		},
		setDevExtensionPath(devExtensionPath: string | undefined) {
			this.devExtensionPath = devExtensionPath
			emitRefreshConfig()
			return setDevExtensionFolderForServer(devExtensionPath).then(() => {
				return restartServer()
			})
		},
		setDevExtLoadUrl(devExtLoadUrl: boolean) {
			this.devExtLoadUrl = devExtLoadUrl
		},
		watch() {
			this.$subscribe(async (mutation, state) => {
				// console.log("mutation", mutation)
				info("appConfig changed, saved to disk")
				await persistAppConfig.set("config", state)
				await persistAppConfig.save()
				emitRefreshConfig()
			})
		}
	}
})