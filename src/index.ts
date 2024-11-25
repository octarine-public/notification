import {
	DOTAGameMode,
	EventsSDK,
	GameRules,
	ImageData,
	NotificationsSDK
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "./menu"
import { GameNotification } from "./notification"

new (class CNotifications {
	private readonly menu = new MenuManager()
	private cooldowns: Record<"active" | "bounty" | "xp", number> = {
		active: 0,
		bounty: 0,
		xp: 0
	}

	private readonly spawnTimes: Record<"active" | "bounty" | "xp", number> = {
		active: 120,
		bounty: 180,
		xp: 420
	}

	constructor() {
		EventsSDK.on("PostDataUpdate", this.OnTick.bind(this))
	}

	protected OnTick(dt: number) {
		if (dt === 0 || !this.menu.runeRemindState.value || !GameRules) {
			return
		}

		const currentTime = GameRules.GameTime
		Object.keys(this.cooldowns).forEach(key => {
			const type = key as "active" | "bounty" | "xp"
			if (this.cooldowns[type] !== 0 && currentTime - this.cooldowns[type] > 2) {
				this.cooldowns[type] = 0
			}
		})

		const textureMap: Record<"active" | "bounty" | "xp", string> = {
			active: "regen",
			bounty: "bounty",
			xp: "xp"
		}

		for (const type of ["active", "bounty", "xp"] as const) {
			const remainingTime = this.getRemainingTime(this.getSpawnTime(type))
			const texture = textureMap[type]
			if (remainingTime > 0 && remainingTime < 0.1) {
				this.SendNotif(
					"soundboard.ay_ay_ay_cn",
					ImageData.GetRuneTexture(texture),
					"spawned",
					type
				)
			} else if (remainingTime > 20 && remainingTime < 20.1) {
				this.SendNotif(
					"soundboard.ay_ay_ay_cn",
					ImageData.GetRuneTexture(texture),
					"20 second!",
					type
				)
			}
		}
	}

	protected SendNotif(
		sound: string,
		image: string,
		text: string,
		type: "active" | "bounty" | "xp"
	) {
		if (this.cooldowns[type] !== 0) {
			return
		}
		NotificationsSDK.Push(new GameNotification(sound, image, text))
		this.cooldowns[type] = GameRules?.GameTime ?? 0
	}

	// TODO: disable in custom games & rework in other games modes (ex. solo mid 1 vs 1, etc.)
	private getSpawnTime(type: "active" | "bounty" | "xp"): number {
		const spawn = this.spawnTimes[type]
		return GameRules?.GameMode === DOTAGameMode.DOTA_GAMEMODE_TURBO
			? spawn / 2
			: spawn
	}

	private getModuleTime(spawnTime: number): number {
		return (GameRules?.GameTime ?? 0) % Math.floor(spawnTime)
	}

	private getRemainingTime(spawnTime: number): number {
		return Math.max(0, spawnTime - this.getModuleTime(spawnTime))
	}
})()
