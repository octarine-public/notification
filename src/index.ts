import {
	DOTAGameMode,
	DOTAScriptInventorySlot,
	EventsSDK,
	GameRules,
	Hero,
	ImageData,
	Item,
	item_smoke_of_deceit,
	NotificationsSDK,
	Unit
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "./menu"
import { GameNotification } from "./notification"

interface IHeroesItems {
	unit: Unit
	items: Item[]
}

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

	private readonly heroesData: IHeroesItems[] = []

	constructor() {
		EventsSDK.on("PostDataUpdate", this.OnTick.bind(this))
		EventsSDK.on("UnitItemsChanged", this.UnitItemsChanged.bind(this))
	}

	protected UnitItemsChanged(unit: Unit) {
		if (!(unit instanceof Hero) || !unit.IsEnemy() || unit.IsIllusion) {
			return
		}

		const items = this.getItems(unit)
		const heroItems: IHeroesItems = {
			unit,
			items
		}

		const unitInArray = this.heroesData.some(heroData => heroData.unit === unit)

		if (!unitInArray) {
			this.heroesData.push(heroItems)
		} else {
			let hasSmoke = false
			for (let i = 0; i < this.heroesData.length; i++) {
				if (this.heroesData[i].unit === unit) {
					hasSmoke = this.heroesData[i].items.some(
						item => item instanceof item_smoke_of_deceit
					)

					this.heroesData[i].items = items
				}
			}

			const smokeBought = items.some(item => item instanceof item_smoke_of_deceit)

			if (smokeBought && !hasSmoke) {
				this.SendNotif(
					"soundboard.ay_ay_ay_cn",
					ImageData.GetItemTexture("item_smoke_of_deceit"),
					"bought",
					"buy",
					false
				)
			}
		}

		console.log(this.heroesData)
	}

	protected OnTick(dt: number) {
		if (
			dt === 0 ||
			!this.menu.runeState.value ||
			!this.menu.State.value ||
			!GameRules
		) {
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
					type,
					true
				)
			} else if (
				remainingTime > 20 &&
				remainingTime < 20.1 &&
				this.menu.runeRemindState.value
			) {
				this.SendNotif(
					"soundboard.ay_ay_ay_cn",
					ImageData.GetRuneTexture(texture),
					"20 second!",
					type,
					true
				)
			}
		}
	}

	protected SendNotif(
		sound: string,
		image: string,
		text: string,
		type: "active" | "bounty" | "xp" | "buy",
		checkCooldown: boolean
	) {
		if (checkCooldown && type !== "buy" && this.cooldowns[type] !== 0) {
			return
		}
		NotificationsSDK.Push(new GameNotification(sound, image, text))
		if (type !== "buy") {
			this.cooldowns[type as "active" | "bounty" | "xp"] = GameRules?.GameTime ?? 0
		}
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

	private getItems(unit: Nullable<Unit>): Item[] {
		if (unit === undefined) {
			return []
		}
		const inventory = unit.Inventory
		return inventory
			.GetItems(
				DOTAScriptInventorySlot.DOTA_ITEM_SLOT_1,
				DOTAScriptInventorySlot.DOTA_ITEM_SLOT_9
			)
			.concat(
				inventory.GetItems(
					DOTAScriptInventorySlot.DOTA_ITEM_TP_SCROLL,
					DOTAScriptInventorySlot.DOTA_ITEM_NEUTRAL_SLOT
				)
			)
	}
})()
